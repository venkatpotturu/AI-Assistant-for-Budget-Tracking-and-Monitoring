CATEGORY_MAP = {
    "food": "Food & Dining",
    "dining": "Food & Dining",
    "restaurant": "Food & Dining",
    "milk": "Food & Dining",
    "grocery": "Food & Dining",

    "uber": "Transportation",
    "ola": "Transportation",
    "fuel": "Transportation",
    "petrol": "Transportation",
    "bus": "Transportation",

    "amazon": "Shopping",
    "flipkart": "Shopping",
    "clothes": "Shopping",
    "electronics": "Shopping",

    "electricity": "Bills & Utilities",
    "internet": "Bills & Utilities",
    "water": "Bills & Utilities",
    "rent": "Bills & Utilities",

    "netflix": "Entertainment",
    "movie": "Entertainment",
    "spotify": "Entertainment",

    "hospital": "Healthcare",
    "pharmacy": "Healthcare",
    "medicine": "Healthcare",

    "salary": "Salary"
}
def map_to_dropdown_category(description, ai_category=None):
    desc = description.lower()

    # First try keyword mapping
    for keyword, mapped in CATEGORY_MAP.items():
        if keyword in desc:
            return mapped

    # If AI suggested category, normalize it
    if ai_category:
        ai_category = ai_category.lower()

        if "food" in ai_category:
            return "Food & Dining"
        if "transport" in ai_category:
            return "Transportation"
        if "shop" in ai_category:
            return "Shopping"
        if "bill" in ai_category:
            return "Bills & Utilities"
        if "entertain" in ai_category:
            return "Entertainment"
        if "health" in ai_category:
            return "Healthcare"
        if "salary" in ai_category:
            return "Salary"

    return "Other"
