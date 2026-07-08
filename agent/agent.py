"""
YieldFarmer AI Agent — verified against real KeeperHub API.

Pattern: NL command → LLM intent parsing → Marketplace workflow call → Result
"""

import json, httpx
from agent.config import get_settings
from agent.keeperhub_client import get_keeperhub

settings = get_settings()

# ── Strategy Templates ────────────────────────────────────────────

STRATEGIES = {
    "dca": {
        "name": "定投策略",
        "description": "定时买入指定资产",
        "params": ["asset", "amount", "interval"],
    },
    "auto_compound": {
        "name": "自动复投",
        "description": "领取收益 → 换成底层资产 → 重新存入",
        "params": ["protocol"],
    },
    "stop_loss": {
        "name": "止损策略",
        "description": "价格跌破阈值自动卖出",
        "params": ["asset", "threshold"],
    },
    "yield_max": {
        "name": "收益最大化",
        "description": "自动切换到最高收益池",
        "params": ["asset"],
    },
}

STRATEGY_KEYWORDS = {
    "dca": ["定投", "dca", "定期买入", "分批买入", "平均成本"],
    "auto_compound": ["复投", "复利", "compound", "自动复投", "再投资", "收益再投资"],
    "stop_loss": ["止损", "stop loss", "止损单", "止损卖出", "跌破"],
    "yield_max": ["收益最大", "最高收益", "yield max", "最佳收益", "收益优化", "切换收益"],
}


def match_strategy(user_message: str) -> dict | None:
    """Match user message to a strategy template via keyword matching.

    Returns the matched strategy dict (with key added), or None.
    """
    msg_lower = user_message.lower()
    for key, keywords in STRATEGY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in msg_lower:
                template = dict(STRATEGIES[key])
                template["key"] = key
                return template
    return None

SYSTEM_PROMPT = """You are YieldFarmer AI, an onchain DeFi agent powered by KeeperHub.

You have access to KeeperHub marketplace workflows. Available workflows:
{workflows}

When the user gives a command, respond with a JSON object:

{{
  "intent": "brief description",
  "workflow_slug": "the-slug-to-call",
  "params": {{"param_name": "value"}},
  "explanation": "what will happen"
}}

Rules:
- Match the user's intent to the best available workflow slug
- Use empty params {{}} if the workflow takes no parameters
- If no workflow matches, set workflow_slug to null and explain why
- Respond ONLY with the JSON object, no other text."""


async def parse_intent(user_message: str, workflows: list[dict]) -> dict:
    """Parse NL intent → workflow selection using LLM."""
    wf_desc = json.dumps([
        {"slug": w.get("listedSlug", ""), "name": w.get("name", ""), "description": w.get("description", ""), "type": w.get("workflowType", ""), "inputSchema": w.get("inputSchema", {})}
        for w in workflows
    ], indent=2, ensure_ascii=False)

    prompt = SYSTEM_PROMPT.format(workflows=wf_desc)

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{settings.deepseek_base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.deepseek_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.1,
                "max_tokens": 800,
            },
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```json")[-1].split("```")[0].strip()
        return json.loads(content)


async def simulate_intent(user_message: str, workflows: list[dict]) -> dict:
    """Fallback: keyword matching when LLM unavailable."""
    msg_lower = user_message.lower()
    best_score, best_wf = 0, None

    for wf in workflows:
        slug = (wf.get("listedSlug") or "").lower()
        name = (wf.get("name") or "").lower()
        desc = (wf.get("description") or "").lower()
        # Split slug into tokens for fuzzy matching
        slug_parts = set(slug.replace("-", " ").replace("_", " ").split())
        name_parts = set(name.replace("-", " ").replace("_", " ").split())
        all_text = f"{slug} {name} {desc}"
        all_parts = slug_parts | name_parts

        # Score: count how many slug/name tokens appear in the message
        score = sum(1 for p in all_parts if p in msg_lower and len(p) > 2)
        if score > best_score:
            best_score, best_wf = score, wf

    if best_wf and best_score > 0:
        slug = best_wf.get("listedSlug", "")
        return {
            "intent": f"Call {slug}",
            "workflow_slug": slug,
            "params": {},
            "explanation": f"Matched: {best_wf.get('name', slug)} (score={best_score})",
        }
    return {"intent": "unknown", "workflow_slug": None, "params": {}, "explanation": "No matching workflow found."}


class YieldFarmerAgent:

    def __init__(self):
        self.kh = get_keeperhub()

    async def execute(self, user_message: str) -> dict:
        # Step 0: Check if user message matches a strategy template
        matched = match_strategy(user_message)
        if matched:
            return {
                "success": True,
                "matched_strategy": True,
                "strategy": matched,
                "explanation": f"匹配到策略模板: {matched['name']}",
            }

        # Step 1: Get available marketplace workflows
        workflows = await self.kh.list_marketplace()

        # Step 2: Parse intent (LLM if key available, else keyword match)
        try:
            if settings.deepseek_api_key:
                parsed = await parse_intent(user_message, workflows)
            else:
                parsed = await simulate_intent(user_message, workflows)
        except Exception:
            parsed = await simulate_intent(user_message, workflows)

        slug = parsed.get("workflow_slug")
        if not slug:
            return {"success": False, "error": "No matching workflow", "available_workflows": [w.get("listedSlug") for w in workflows[:5]], "explanation": parsed.get("explanation", "")}

        # Step 3: Execute
        try:
            result = await self.kh.call_workflow(slug, parsed.get("params", {}))
            return {
                "success": True,
                "intent": parsed.get("intent", ""),
                "explanation": parsed.get("explanation", ""),
                "workflow_slug": slug,
                "execution_id": result.get("executionId"),
                "status": result.get("status"),
                "output": result.get("output"),
            }
        except Exception as e:
            return {"success": False, "error": str(e), "workflow_slug": slug}

    async def list_all(self) -> list[dict]:
        return await self.kh.list_marketplace()

    async def get_status(self, execution_id: str) -> dict:
        return await self.kh.get_execution(execution_id)


_agent: YieldFarmerAgent | None = None


def get_agent() -> YieldFarmerAgent:
    global _agent
    if _agent is None:
        _agent = YieldFarmerAgent()
    return _agent
