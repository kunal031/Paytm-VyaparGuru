from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    server_internal_url: str = "http://localhost:5000"
    log_level: str = "info"

    class Config:
        env_file = ".env"


settings = Settings()

FESTIVAL_CALENDAR_PATH = Path(__file__).parent / "festival_calendar.json"
