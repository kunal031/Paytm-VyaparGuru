"""Cash flow forecasting endpoints."""
from fastapi import APIRouter, HTTPException

from app.models.schemas import ForecastRequest, ForecastResponse
from app.services.forecasting_service import forecast_cashflow

router = APIRouter()


@router.post("/cashflow", response_model=ForecastResponse, response_model_by_alias=True)
def cashflow_forecast(request: ForecastRequest) -> dict:
    try:
        return forecast_cashflow(
            [p.model_dump() for p in request.history], request.horizon_days
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Forecast failed: {exc}") from exc


@router.get("/status")
def status() -> dict:
    return {"ready": True, "endpoints": ["POST /forecast/cashflow"]}
