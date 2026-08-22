"""Amount-to-SKU attribution: raw Paytm transactions only carry amount +
timestamp, so we probabilistically match amounts to known SKU prices —
single items (qty 1-3) or common two-SKU combos. Confidence reflects how
many candidate explanations exist for the amount.
"""
import logging
from itertools import combinations_with_replacement

logger = logging.getLogger("attribution")

MAX_QTY = 3


def attribute_transactions(transactions: list[dict], skus: list[dict]) -> list[dict]:
    """transactions: [{txnId, amount}], skus: [{skuId, price, popularity?}] (paise).
    Returns [{txnId, matches: [{skuId, quantity}], confidence, candidates}]."""
    # Pre-compute candidate amounts: single SKU at qty 1..3, and SKU pairs (qty 1 each)
    singles: dict[int, list[tuple]] = {}
    for sku in skus:
        for qty in range(1, MAX_QTY + 1):
            singles.setdefault(sku["price"] * qty, []).append(
                ((sku["skuId"], qty),)
            )

    pairs: dict[int, list[tuple]] = {}
    for a, b in combinations_with_replacement(skus, 2):
        if a["skuId"] == b["skuId"]:
            continue  # same-SKU multiples already covered by singles
        amount = a["price"] + b["price"]
        pairs.setdefault(amount, []).append(((a["skuId"], 1), (b["skuId"], 1)))

    results = []
    for txn in transactions:
        amount = txn["amount"]
        candidates = list(singles.get(amount, []))
        pair_candidates = pairs.get(amount, [])

        if candidates:
            # Single-SKU explanations outrank combos; fewer candidates = higher confidence
            pool = candidates
            base_conf = 0.9
        elif pair_candidates:
            pool = pair_candidates
            base_conf = 0.6
        else:
            results.append(
                {"txnId": txn["txnId"], "matches": [], "confidence": 0.0,
                 "candidates": 0}
            )
            continue

        total_candidates = len(candidates) + len(pair_candidates)
        confidence = round(base_conf / max(1, len(pool)), 2)
        best = pool[0]
        matches = [{"skuId": sku_id, "quantity": qty} for sku_id, qty in best]

        logger.info(
            "attributed txn=%s amount=%s candidates=%s confidence=%.2f",
            txn["txnId"], amount, total_candidates, confidence,
        )
        results.append(
            {
                "txnId": txn["txnId"],
                "matches": matches,
                "confidence": confidence,
                "candidates": total_candidates,
            }
        )
    return results
