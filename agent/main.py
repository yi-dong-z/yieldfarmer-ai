"""
YieldFarmer AI — FastAPI Server

REST API for the AI-powered DeFi automation agent.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from agent.agent import get_agent, STRATEGIES
from agent.keeperhub_client import get_keeperhub

app = FastAPI(
    title="YieldFarmer AI",
    description="AI Agent for Automated DeFi Yield on KeeperHub",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "YieldFarmer AI"}


@app.post("/api/command")
async def execute_command(body: dict):
    """Execute a natural language DeFi command.
    Body: {"message": "Deposit 0.01 ETH into Aave on Sepolia"}
    """
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    agent = get_agent()
    result = await agent.execute(message)
    return result


@app.get("/api/workflows")
async def list_workflows():
    agent = get_agent()
    workflows = await agent.list_all()
    return {"workflows": workflows}


@app.get("/api/workflows/{workflow_id}/status")
async def workflow_status(workflow_id: str):
    agent = get_agent()
    try:
        status = await agent.get_status(workflow_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/workflows/{workflow_id}/trigger")
async def trigger_workflow(workflow_id: str):
    keeperhub = get_keeperhub()
    try:
        result = await keeperhub.trigger_workflow(workflow_id)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategies")
async def list_strategies():
    """Return available strategy templates."""
    return {"strategies": [{"key": k, **v} for k, v in STRATEGIES.items()]}


# ── Yield comparison ──────────────────────────────────────────────

FALLBACK_YIELDS = {
    "protocols": [
        {"name": "Aave", "apy": 3.2, "asset": "USDC"},
        {"name": "Compound", "apy": 2.8, "asset": "USDC"},
        {"name": "Morpho", "apy": 4.1, "asset": "USDC"},
        {"name": "Spark", "apy": 3.5, "asset": "USDC"},
        {"name": "Aave", "apy": 1.5, "asset": "ETH"},
        {"name": "Compound", "apy": 0.9, "asset": "ETH"},
    ]
}


@app.get("/api/yields")
async def get_yields():
    """Fetch real-time yields from KeeperHub marketplace yield workflows.

    Falls back to static sample data if marketplace calls fail.
    """
    kh = get_keeperhub()
    protocols = []

    try:
        workflows = await kh.list_marketplace()
        yield_wfs = [
            w for w in workflows
            if "yield" in (w.get("listedSlug") or "").lower()
            or "yield" in (w.get("name") or "").lower()
        ]

        import asyncio

        async def call_one(wf):
            slug = wf.get("listedSlug")
            try:
                result = await kh.call_workflow(slug, {})
                output = result.get("output", {})
                # Try to extract protocol-level yield data from output
                if isinstance(output, dict):
                    for proto_name, data in output.items():
                        if isinstance(data, dict):
                            protocols.append({
                                "name": proto_name,
                                "apy": float(data.get("apy", data.get("rate", 0))),
                                "asset": data.get("asset", "unknown"),
                            })
                        elif isinstance(data, (int, float)):
                            # Simple {protocol: rate} format
                            protocols.append({
                                "name": proto_name,
                                "apy": float(data),
                                "asset": "unknown",
                            })
            except Exception:
                pass

        if yield_wfs:
            await asyncio.gather(*[call_one(wf) for wf in yield_wfs])
    except Exception:
        pass

    if not protocols:
        return FALLBACK_YIELDS

    return {"protocols": protocols}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
