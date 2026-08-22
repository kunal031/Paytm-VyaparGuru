"""Predictive stockout (days-until-stockout with festival demand multiplier)
and reorder quantity suggestions."""
import json
import math
from datetime import date, timedelta

from app.core.config import FESTIVAL_CALENDAR_PATH

DEFAULT_LEAD_TIME_DAYS = 3
DEFAULT_COVER_DAYS = 14


def _festival_multipliers(days_ahead: int) -> list[tuple[str, float, str | None]]:
    """Per-day (date, multiplier, festival name) for the next `days_ahead` days."""
    raw = json.loads(FESTIVAL_CALENDAR_PATH.read_text(encoding="utf-8"))
    by_day: dict[str, tuple[float, str]] = {}
    for fest in raw["festivals"]:
        base = date.fromisoformat(fest["date"])
        for offset in range(-fest["spanDaysBefore"], fest["spanDaysAfter"] + 1):
            day = (base + timedelta(days=offset)).isoformat()
            ramp = (
                1 + (fest["multiplier"] - 1) * (1 + offset / (fest["spanDaysBefore"] + 1))
                if offset < 0
                else fest["multiplier"]
            )
            if ramp > by_day.get(day, (0, ""))[0]:
                by_day[day] = (ramp, fest["name"])

    today = date.today()
    out = []
    for i in range(1, days_ahead + 1):
        key = (today + timedelta(days=i)).isoformat()
        mult, name = by_day.get(key, (1.0, None))
        out.append((key, mult, name))
    return out


def predict_stockouts(skus: list[dict], horizon_days: int = 30) -> list[dict]:
    """skus: [{skuId, currentStock, velocityPerDay}] → days-until-stockout,
    walking day-by-day so festival spikes pull the date closer."""
    calendar = _festival_multipliers(horizon_days)
    results = []
    for sku in skus:
        velocity = max(0.0, float(sku["velocityPerDay"]))
        stock = float(sku["currentStock"])
        if velocity <= 0:
            results.append(
                {"skuId": sku["skuId"], "daysUntilStockout": None, "stockoutDate": None,
                 "festivalAhead": None}
            )
            continue

        remaining = stock
        days = None
        stockout_date = None
        festival_ahead = None
        for i, (day, mult, name) in enumerate(calendar):
            remaining -= velocity * mult
            if name and festival_ahead is None:
                festival_ahead = name
            if remaining <= 0:
                days = i + 1
                stockout_date = day
                break

        results.append(
            {
                "skuId": sku["skuId"],
                "daysUntilStockout": days,  # None = beyond horizon
                "stockoutDate": stockout_date,
                "festivalAhead": festival_ahead,
            }
        )
    return results


def suggest_reorders(
    skus: list[dict],
    lead_time_days: int = DEFAULT_LEAD_TIME_DAYS,
    cover_days: int = DEFAULT_COVER_DAYS,
) -> list[dict]:
    """Reorder quantity = demand over (lead time + cover window), festival-adjusted,
    minus what's already on the shelf."""
    window = lead_time_days + cover_days
    calendar = _festival_multipliers(window)
    avg_mult = sum(m for _, m, _ in calendar) / len(calendar)

    results = []
    for sku in skus:
        velocity = max(0.0, float(sku["velocityPerDay"]))
        demand = velocity * window * avg_mult
        qty = max(0, math.ceil(demand - float(sku["currentStock"])))
        results.append(
            {
                "skuId": sku["skuId"],
                "suggestedQuantity": qty,
                "coverDays": window,
                "festivalMultiplier": round(avg_mult, 2),
            }
        )
    return results
