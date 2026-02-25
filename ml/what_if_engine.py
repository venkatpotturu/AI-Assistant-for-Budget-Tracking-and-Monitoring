def what_if_analysis(expenses, category, reduction_percent):
    """
    expenses: list of dicts
    category: str
    reduction_percent: float (e.g., 10 for 10%)
    """

    original_total = sum(e["amount"] for e in expenses)

    category_total = sum(
        e["amount"] for e in expenses if e["category"] == category
    )

    reduction_amount = category_total * (reduction_percent / 100)
    new_total = original_total - reduction_amount

    insight = (
        f"If you reduce {category} spending by {reduction_percent}%, "
        f"you will save ₹{reduction_amount:.0f} and your new total "
        f"spending will be ₹{new_total:.0f}."
    )

    return {
        "original_total": original_total,
        "category": category,
        "reduction_percent": reduction_percent,
        "savings": round(reduction_amount, 2),
        "new_total": round(new_total, 2),
        "insight": insight
    }
