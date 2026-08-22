"""Cash flow forecasting: SARIMAX with weekly seasonality and the Indian
festival calendar as an exogenous regressor.

SARIMAX over Prophet here: same exogenous-regressor capability without
Prophet's heavy cmdstan build, which keeps the Docker image lean.
"""
import json
from datetime import date, timedelta

import numpy as np
import pandas as pd

from app.core.config import FESTIVAL_CALENDAR_PATH


def _load_festival_frame() -> tuple[pd.Series, dict[str, str]]:
    """Returns (date -> multiplier series, date -> festival name map)."""
    raw = json.loads(FESTIVAL_CALENDAR_PATH.read_text(encoding="utf-8"))
    multipliers: dict[date, float] = {}
    names: dict[str, str] = {}
    for fest in raw["festivals"]:
        base = date.fromisoformat(fest["date"])
        for offset in range(-fest["spanDaysBefore"], fest["spanDaysAfter"] + 1):
            day = base + timedelta(days=offset)
            if offset < 0:
                ramp = 1 + (fest["multiplier"] - 1) * (1 + offset / (fest["spanDaysBefore"] + 1))
            else:
                ramp = fest["multiplier"]
            if ramp > multipliers.get(day, 0):
                multipliers[day] = ramp
                names[day.isoformat()] = fest["name"]
    series = pd.Series(multipliers)
    series.index = pd.to_datetime(series.index)
    return series, names


def forecast_cashflow(history: list[dict], horizon_days: int) -> dict:
    """history: [{date, net(paise)}] daily. Returns forecast with 80% bands."""
    df = pd.DataFrame(history)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    # Fill calendar gaps with 0 (closed days still count as zero cash flow)
    df = df.asfreq("D", fill_value=0)
    y = df["net"].astype(float) / 100.0  # model in rupees for numerical stability

    festival_series, festival_names = _load_festival_frame()

    def exog_for(index: pd.DatetimeIndex) -> pd.DataFrame:
        mult = festival_series.reindex(index).fillna(1.0)
        return pd.DataFrame({"festival": mult - 1.0}, index=index)

    future_index = pd.date_range(y.index[-1] + timedelta(days=1), periods=horizon_days, freq="D")

    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        model = SARIMAX(
            y,
            exog=exog_for(y.index),
            order=(1, 0, 1),
            seasonal_order=(1, 1, 1, 7),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fitted = model.fit(disp=False, maxiter=200)
        pred = fitted.get_forecast(steps=horizon_days, exog=exog_for(future_index))
        mean = pred.predicted_mean
        conf = pred.conf_int(alpha=0.2)  # 80% band
        lower, upper = conf.iloc[:, 0], conf.iloc[:, 1]
        model_name = "sarimax(1,0,1)(1,1,1,7)+festival"
    except Exception:  # noqa: BLE001 — degrade to seasonal naive rather than fail
        mean, lower, upper = _seasonal_naive(y, future_index, exog_for)
        model_name = "seasonal-naive-fallback"

    points = []
    for ts in future_index:
        key = ts.date().isoformat()
        points.append(
            {
                "date": key,
                "yhat": int(round(float(mean[ts]) * 100)),
                "yhatLower": int(round(float(lower[ts]) * 100)),
                "yhatUpper": int(round(float(upper[ts]) * 100)),
                "festival": festival_names.get(key),
            }
        )
    return {"model": model_name, "points": points}


def _seasonal_naive(y: pd.Series, future_index: pd.DatetimeIndex, exog_for) -> tuple:
    """Weekday-mean forecast scaled by festival multiplier, ±1.28σ band."""
    weekday_means = y.groupby(y.index.dayofweek).mean()
    resid_std = float((y - y.index.dayofweek.map(weekday_means)).std())
    mult = exog_for(future_index)["festival"] + 1.0
    mean = pd.Series(
        [weekday_means[ts.dayofweek] for ts in future_index], index=future_index
    ) * mult
    band = 1.28 * resid_std
    return mean, mean - band, mean + band
