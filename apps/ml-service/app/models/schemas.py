"""Shared pydantic request/response schemas."""
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class DailyPoint(BaseModel):
    date: str = Field(description="YYYY-MM-DD")
    net: int = Field(description="Net cash flow for the day in integer paise")


class ForecastRequest(BaseModel):
    history: list[DailyPoint] = Field(min_length=14, description="Daily net cash flow history")
    horizon_days: int = Field(default=30, ge=7, le=60, alias="horizonDays")

    class Config:
        populate_by_name = True


class ForecastPoint(BaseModel):
    date: str
    yhat: int = Field(description="Point forecast, paise")
    yhat_lower: int = Field(alias="yhatLower")
    yhat_upper: int = Field(alias="yhatUpper")
    festival: str | None = None

    class Config:
        populate_by_name = True


class ForecastResponse(BaseModel):
    model: str
    points: list[ForecastPoint]
