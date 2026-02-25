from collections import defaultdict
from datetime import datetime

def generate_insights(expenses):
    """
    expenses: list of dicts
    [
      { "amount": 250, "category": "Food", "date": "2025-02-01" }
    ]
    """

    insights = []

    total_spending = 0
    category_totals = defaultdict(float)

    for e in expenses:
        total_spending += e["amount"]
        category_totals[e["category"]] += e["amount"]

    # Insight 1: Highest spending category
    if category_totals:
        top_category = max(category_totals, key=category_totals.get)
        insights.append(
            f"You spent the most on {top_category} (₹{category_totals[top_category]:.0f})."
        )

    # Insight 2: Category percentage share
    for category, amount in category_totals.items():
        percent = (amount / total_spending) * 100
        if percent > 40:
            insights.append(
                f"{category} accounts for {percent:.1f}% of your total spending."
            )

    # Insight 3: High total spending warning
    if total_spending > 10000:
        insights.append(
            "Your total spending is higher than usual. Consider reviewing non-essential expenses."
        )

    return insights
