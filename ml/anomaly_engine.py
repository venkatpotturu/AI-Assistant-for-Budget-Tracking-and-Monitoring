import numpy as np
from collections import defaultdict

def analyze_spending_anomalies(expenses):
    category_data = defaultdict(list)

    for e in expenses:
        category_data[e.category].append(e.amount)

    insights = []
    anomalies = []

    for category, amounts in category_data.items():
        avg = np.mean(amounts)
        std = np.std(amounts)

        for amt in amounts:
            if amt > avg + 2 * std:
                anomalies.append({
                    "category": category,
                    "amount": amt,
                    "average": round(avg, 2),
                    "reason": "Unusually high spending compared to your past behavior"
                })

    # Financial literacy insights
    if anomalies:
        insights.append(
            "High-value expenses were detected that exceed your usual spending patterns."
        )
        insights.append(
            "Tracking category-wise limits can help control impulsive purchases."
        )
    else:
        insights.append(
            "Your spending behavior is consistent and well controlled."
        )

    return {
        "total_expenses": len(expenses),
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "financial_insights": insights
    }
