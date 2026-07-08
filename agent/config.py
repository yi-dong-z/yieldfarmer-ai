"""
YieldFarmer AI Configuration

Uses environment variables with .env file support.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        # KeeperHub
        self.keeperhub_api_key: str = os.getenv("KEEPERHUB_API_KEY", "")
        self.keeperhub_api_url: str = os.getenv(
            "KEEPERHUB_API_URL", "https://app.keeperhub.com/api"
        )

        # LLM
        self.openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
        self.deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
        self.deepseek_base_url: str = os.getenv(
            "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
        )
        self.llm_model: str = os.getenv("LLM_MODEL", "deepseek-chat")

        # Chain
        self.chain_id: int = int(os.getenv("CHAIN_ID", "11155111"))
        self.rpc_url: str = os.getenv("RPC_URL", "")

        # Telegram
        self.telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
