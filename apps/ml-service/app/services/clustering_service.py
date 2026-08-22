"""Fast/slow/dead stock classification from velocity + recency features.

Hybrid approach: hard rules catch the unambiguous cases (dead = no recent
sales), then KMeans separates fast from slow among the active SKUs. Guardrails
fall back to quantile thresholds when the catalog is too small to cluster.
"""
import numpy as np


def classify_skus(skus: list[dict]) -> list[dict]:
    """skus: [{skuId, soldLast30, soldPrev30, daysSinceLastSale, currentStock}]"""
    results = []
    active_indices = []

    for i, sku in enumerate(skus):
        velocity = sku["soldLast30"] / 30.0
        days_since = sku.get("daysSinceLastSale")
        # Dead: effectively no movement in the last month
        if days_since is None or days_since > 30 or (velocity < 0.05 and days_since > 14):
            results.append(_result(sku, "dead", velocity, "no sales in the last 30 days"))
        else:
            results.append(None)
            active_indices.append(i)

    if active_indices:
        velocities = np.array(
            [skus[i]["soldLast30"] / 30.0 for i in active_indices], dtype=float
        )
        labels = _split_fast_slow(velocities)
        for pos, i in enumerate(active_indices):
            sku = skus[i]
            velocity = float(velocities[pos])
            if labels[pos] == "fast":
                reason = "top-tier daily sales velocity"
            else:
                reason = "below-median sales velocity"
            results[i] = _result(sku, labels[pos], velocity, reason)

    return results


def _split_fast_slow(velocities: np.ndarray) -> list[str]:
    if len(velocities) < 4 or np.allclose(velocities, velocities[0]):
        # Too few points to cluster meaningfully — quantile rule
        threshold = max(float(np.median(velocities)), 0.5)
        return ["fast" if v >= threshold else "slow" for v in velocities]

    from sklearn.cluster import KMeans

    features = np.log1p(velocities).reshape(-1, 1)
    km = KMeans(n_clusters=2, n_init=10, random_state=42).fit(features)
    fast_cluster = int(np.argmax(km.cluster_centers_.ravel()))
    return ["fast" if label == fast_cluster else "slow" for label in km.labels_]


def _result(sku: dict, classification: str, velocity: float, reason: str) -> dict:
    trend = None
    if sku.get("soldPrev30", 0) > 0:
        trend = round((sku["soldLast30"] - sku["soldPrev30"]) / sku["soldPrev30"] * 100, 1)
    return {
        "skuId": sku["skuId"],
        "classification": classification,
        "velocityPerDay": round(velocity, 3),
        "trendPct": trend,
        "reason": reason,
    }
