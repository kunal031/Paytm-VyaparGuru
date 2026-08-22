"""VyaparGuru ML microservice — forecasting, stock classification, attribution."""
from fastapi import FastAPI

from app.api import forecast, health, inventory
from app.core.config import settings

app = FastAPI(
    title="VyaparGuru ML Service",
    description="Cash flow forecasting, stock velocity classification, and amount-to-SKU attribution.",
    version="0.1.0",
)

app.include_router(health.router, tags=["health"])
app.include_router(forecast.router, prefix="/forecast", tags=["forecast"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])


@app.get("/")
def root() -> dict:
    return {"service": "vyaparguru-ml", "docs": "/docs", "env": settings.log_level}
