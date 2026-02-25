from flask import Blueprint, request, jsonify
import json
import re
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

voice_bp = Blueprint("voice", __name__)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- fallback helpers ---
def extract_amount(text):
    match = re.search(r'\d+', text)
    return int(match.group()) if match else 0

def extract_category(text):
    categories = ["food","transport","shopping","bills","salary","rent","entertainment"]
    for c in categories:
        if c in text.lower():
            return c.capitalize()
    return "Others"

def extract_type(text):
    if "income" in text.lower() or "salary" in text.lower() or "received" in text.lower():
        return "income"
    return "expense"

# --- main route ---
@voice_bp.route("/voice-text", methods=["POST"])
def voice_text():

    text = request.json.get("text")

    prompt = f"""
    You are a financial assistant.

    Convert the spoken statement into a clean financial transaction.

    Rules:
    - Rewrite description professionally
    - Do NOT copy original speech
    - Make it short and meaningful
    - Identify correct category
    - Detect income vs expense

    Input:
    "{text}"

    Return ONLY JSON:

    {{
    "description": "...",
    "amount": number,
    "category": "...",
    "type": "expense" or "income"
    }}
    """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        ai_response = response.choices[0].message.content.strip()
        parsed = json.loads(ai_response)

    except:
        parsed = {
            "description": text,
            "amount": extract_amount(text),
            "category": extract_category(text),
            "type": extract_type(text)
        }

    return jsonify({
        "review": {
            "description": parsed.get("description"),
            "amount": parsed.get("amount"),
            "category": normalize_category(parsed.get("category")),
            "type": parsed.get("type"),
            "date": "today",
            "status": "Review"
        }
    })

def normalize_category(cat):

    cat = cat.lower()

    mapping = {
        "food": "Food & Dining",
        "restaurant": "Food & Dining",
        "dining": "Food & Dining",
        "cafe": "Food & Dining",
        "coffee": "Food & Dining",
        "burger": "Food & Dining",
        "pizza": "Food & Dining",
        "meal": "Food & Dining",
        "dinner": "Food & Dining",
        "lunch": "Food & Dining",
        "breakfast": "Food & Dining",

        "transportation": "Transportation",
        "travel": "Transportation",
        "bus": "Transportation",
        "fuel": "Transportation",
        "uber": "Transportation",
        "ola": "Transportation",
        "taxi": "Transportation",
        "cab": "Transportation",
        "train": "Transportation",
        "metro": "Transportation",
        "transportaion": "Transportation",

        "shopping": "Shopping",
        "clothes": "Shopping",
        "amazon": "Shopping",
        "flipkart": "Shopping",
        "store": "Shopping",
        "mall": "Shopping",
        "shoes": "Shopping",
        "electronics": "Shopping",
        "gadget": "Shopping",
        "gift": "Shopping",
        "accessory": "Shopping",

        "bill": "Bills & Utilities",
        "electricity": "Bills & Utilities",
        "rent": "Bills & Utilities",
        "water": "Bills & Utilities",
        "internet": "Bills & Utilities",
        "phone": "Bills & Utilities",
        "gas": "Bills & Utilities",
        "utility": "Bills & Utilities",
        "subscription": "Bills & Utilities",
        "insurance": "Bills & Utilities",
        "loan": "Bills & Utilities",
        "credit card": "Bills & Utilities",
        "tax": "Bills & Utilities",
        "education": "Bills & Utilities",


        "movie": "Entertainment",
        "entertainment": "Entertainment",
        "netflix": "Entertainment",
        "music": "Entertainment",
        "game": "Entertainment",
        "event": "Entertainment",
        "ticket": "Entertainment",

        "doctor": "Healthcare",
        "hospital": "Healthcare",
        "medicine": "Healthcare",
        "pharmacy": "Healthcare",
        "healthcare": "Healthcare",
        "medical": "Healthcare",    


        "salary": "Salary",
        "income": "Salary",
        "payment received": "Salary",
        "bonus": "Salary",
        "payroll": "Salary",
        "pay": "Salary",
        "earning": "Salary",
        "wage": "Salary",
        "compensation": "Salary",
        "stipend": "Salary",
        "dividend": "Salary",
        "investment": "Salary"

    }

    for key in mapping:
        if key in cat:
            return mapping[key]

    return "Other"