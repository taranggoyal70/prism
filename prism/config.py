from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    greptile_api_key: str | None = None
    openai_api_key: str | None = None
    github_token: str | None = None
    greptile_mcp_url: str = "https://api.greptile.com/mcp"
    openai_model: str = "gpt-5-mini"
    claude_mem_enabled: bool = True
    claude_mem_base_url: str = "http://127.0.0.1:37777"
    prism_cache_dir: Path = Path(".cache/prism")
    prism_offline_demo: bool = False
    request_timeout_seconds: float = 90


def get_settings() -> Settings:
    return Settings()
