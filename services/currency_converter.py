from forex_python.converter import CurrencyRates

c = CurrencyRates()

def convert_to_inr(amount, symbol):

    symbol_map = {
        "$": "USD",
        "€": "EUR",
        "£": "GBP",
        "¥": "JPY",
        "RM": "MYR",
        "AED": "AED",
        "SGD": "SGD"
    }

    if symbol not in symbol_map:
        return amount  # assume already INR

    try:
        rate = c.get_rate(symbol_map[symbol], "INR")
        return round(amount * rate)
    except:
        return amount
