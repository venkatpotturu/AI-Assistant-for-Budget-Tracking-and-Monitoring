import re
from datetime import datetime
from services.category_mapper import map_to_dropdown_category
from services.currency_converter import convert_to_inr


def parse_receipt_text(text):

    lines = text.split("\n")

    transactions = []
    today = datetime.today().strftime("%Y-%m-%d")

    for line in lines:

        try:

            match = re.search(r'(.+?)\s*([$₹€£])?\s*(\d+\.\d{2})', line)


            if not match:
                continue

            name = re.sub(r'\d+x', '', match.group(1)).strip()
            currency = match.group(2)
            amount = float(match.group(3))
            amount = convert_to_inr(amount, currency)

            ignore_words = [
                "gst", "total", "cash", "round", "terminal",
                "document", "thank", "reg", "date", "time", "change", "balance", "card", "visa", "mastercard", "amex", "rupay", "upi",
                "debit", "credit", "net", "pay", "ref", "id", "invoice", "receipt"
            ]

            if any(word in name.lower() for word in ignore_words):
                continue

            # Skip lines that are just quantities
            if len(name) < 3:
                continue

            category = map_to_dropdown_category(name)

            confidence = 0.9
            if any(char.isdigit() for char in name):
                confidence = 0.6

            transactions.append({
                "type": "expense",
                "amount": amount,
                "category": category,
                "date": today,
                "description": name,
                "confidence": confidence
            })

        except:
            continue



    return transactions
