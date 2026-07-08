"""
KeeperHub API Client — verified against real API (2026-07-08)

Auth: x-api-key header
Base:  https://app.keeperhub.com
"""

import httpx
from typing import Any
from agent.config import get_settings

settings = get_settings()


class KeeperHubClient:
    """Verified KeeperHub API client."""

    def __init__(self):
        self.base = "https://app.keeperhub.com"
        self.headers = {
            "x-api-key": settings.keeperhub_api_key,
            "Content-Type": "application/json",
        }

    async def _req(self, method: str, path: str, json_data: dict | None = None) -> Any:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.request(method, f"{self.base}{path}", headers=self.headers, json=json_data)
            if r.status_code == 401:
                raise PermissionError("API key lacks write access. Use marketplace workflows instead.")
            r.raise_for_status()
            return r.json() if r.text else {}

    # ── Workflow listing (read-only, works with any key) ─────────

    async def list_workflows(self) -> list[dict]:
        """GET /api/workflows — list user's workflows."""
        return await self._req("GET", "/api/workflows")

    async def list_marketplace(self) -> list[dict]:
        """GET /api/mcp/workflows — list callable marketplace workflows."""
        data = await self._req("GET", "/api/mcp/workflows")
        return data.get("items", [])

    # ── Marketplace workflow execution (verified working!) ───────

    async def call_workflow(self, slug: str, params: dict | None = None) -> dict:
        """POST /api/mcp/workflows/{slug}/call — execute a marketplace workflow.

        Returns: {executionId, status, output, ...}
        """
        return await self._req("POST", f"/api/mcp/workflows/{slug}/call", json_data=params or {})

    async def get_execution(self, execution_id: str) -> dict:
        """GET /api/workflows/executions/{id} — get execution status."""
        return await self._req("GET", f"/api/workflows/executions/{execution_id}")

    async def get_executions(self, workflow_id: str) -> list[dict]:
        """GET /api/workflows/{id}/executions — list executions for a workflow."""
        return await self._req("GET", f"/api/workflows/{workflow_id}/executions")

    # ── Health ───────────────────────────────────────────────────

    async def health(self) -> bool:
        try:
            await self._req("GET", "/api/health")
            return True
        except Exception:
            return False


_kh: KeeperHubClient | None = None


def get_keeperhub() -> KeeperHubClient:
    global _kh
    if _kh is None:
        _kh = KeeperHubClient()
    return _kh
