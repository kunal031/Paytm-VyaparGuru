"""Inventory intelligence endpoints: classification, stockout prediction,
reorder suggestions, and amount-to-SKU attribution."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.attribution_service import attribute_transactions
from app.services.clustering_service import classify_skus
from app.services.reorder_service import predict_stockouts, suggest_reorders

router = APIRouter()


class SkuFeatures(BaseModel):
    skuId: str
    soldLast30: float = Field(ge=0)
    soldPrev30: float = Field(default=0, ge=0)
    daysSinceLastSale: int | None = None
    currentStock: float = Field(default=0, ge=0)


class ClassifyRequest(BaseModel):
    skus: list[SkuFeatures]


class StockLevel(BaseModel):
    skuId: str
    currentStock: float = Field(ge=0)
    velocityPerDay: float = Field(ge=0)


class StockoutRequest(BaseModel):
    skus: list[StockLevel]
    horizonDays: int = Field(default=30, ge=7, le=90)


class ReorderRequest(BaseModel):
    skus: list[StockLevel]
    leadTimeDays: int = Field(default=3, ge=0, le=30)
    coverDays: int = Field(default=14, ge=1, le=60)


class TxnAmount(BaseModel):
    txnId: str
    amount: int = Field(ge=0)


class SkuPrice(BaseModel):
    skuId: str
    price: int = Field(ge=0)


class AttributeRequest(BaseModel):
    transactions: list[TxnAmount]
    skus: list[SkuPrice]


@router.post("/classify")
def classify(request: ClassifyRequest) -> dict:
    try:
        return {"results": classify_skus([s.model_dump() for s in request.skus])}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Classification failed: {exc}") from exc


@router.post("/stockout")
def stockout(request: StockoutRequest) -> dict:
    try:
        return {
            "results": predict_stockouts(
                [s.model_dump() for s in request.skus], request.horizonDays
            )
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Stockout prediction failed: {exc}") from exc


@router.post("/reorder")
def reorder(request: ReorderRequest) -> dict:
    try:
        return {
            "results": suggest_reorders(
                [s.model_dump() for s in request.skus],
                request.leadTimeDays,
                request.coverDays,
            )
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Reorder suggestion failed: {exc}") from exc


@router.post("/attribute")
def attribute(request: AttributeRequest) -> dict:
    try:
        return {
            "results": attribute_transactions(
                [t.model_dump() for t in request.transactions],
                [s.model_dump() for s in request.skus],
            )
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Attribution failed: {exc}") from exc


@router.get("/status")
def status() -> dict:
    return {
        "ready": True,
        "endpoints": [
            "POST /inventory/classify",
            "POST /inventory/stockout",
            "POST /inventory/reorder",
            "POST /inventory/attribute",
        ],
    }
