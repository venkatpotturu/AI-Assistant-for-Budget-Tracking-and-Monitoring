import numpy as np
from models.expense_model import get_expenses_by_user

def analyze_user_anomalies(user_id):
    expenses = get_expenses_by_user(user_id)

    if len(expenses) < 5:
        return {
            "message": "Not enough data to detect spending anomalies yet"
        }

    category_map = {}
    results = []

    for e in expenses:
        category_map.setdefault(e["category"], []).append(e["amount"])

    for e in expenses:
        amounts = category_map[e["category"]]
        avg = np.mean(amounts)
        std = np.std(amounts)

        threshold = avg + 2 * std

        if e["amount"] > threshold:
            ratio = e["amount"] / avg if avg else 0

            if ratio > 2:
                severity = "HIGH"
            elif ratio > 1.5:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            results.append({
                "category": e["category"],
                "amount": e["amount"],
                "date": e["date"],
                "severity": severity,
                "avg": round(avg, 2),
                "threshold": round(threshold, 2),
                "insight": generate_financial_tip(e["category"], severity)
            })

    return {
        "total_expenses": len(expenses),
        "anomalies_detected": len(results),
        "anomalies": results
    }


def generate_financial_tip(category, severity):
    tips = {
        "Food": {
            "HIGH": "High food spending often comes from frequent ordering. Try weekly meal planning.",
            "MEDIUM": "Food costs are rising. Track dine-out vs groceries separately.",
            "LOW": "Minor spike. Just stay mindful of small daily spends."
        },
        "Shopping": {
            "HIGH": "Impulse buying detected. Try a 24-hour wait rule before purchases.",
            "MEDIUM": "Shopping expenses are growing. Set a monthly cap.",
            "LOW": "Occasional splurge is fine if budgeted."
        }
    }

    return tips.get(category, {}).get(
        severity,
        "Review this expense to ensure it aligns with your financial goals."
    )
