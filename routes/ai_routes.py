import os
from groq import Groq
from flask import Blueprint, request, jsonify # Added: Import Blueprint, request, jsonify
from bson import ObjectId # Added: Import ObjectId
from utils.auth_middleware import token_required # Added: Import token_required
from database.db import get_db # Added: Import get_db
from models.expense_model import get_expenses_by_user
from bson import ObjectId
import numpy as np
from dotenv import load_dotenv
load_dotenv()

# Initialize Blueprint
ai_bp = Blueprint("ai", __name__) # Added: Define ai_bp
from flask import Blueprint, request, jsonify

ai_bp = Blueprint("ai_bp", __name__)


groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# Initialize database connection and collection
db = get_db()
expenses_collection = db["expenses"] # Added: Define expenses_collection

# Added: Placeholder for build_prompt function
def build_prompt(income, expense, category_totals):
    prompt_parts = [
        f"I have an income of ${income:.2f} and expenses of ${expense:.2f}.",
        "My spending by category is:"
    ]
    for category, amount in category_totals.items():
        prompt_parts.append(f"- {category}: ${amount:.2f}")
    prompt_parts.append("Based on this, provide some financial recommendations.")
    return "\n".join(prompt_parts)

@ai_bp.route("/recommendations", methods=["GET"])
@token_required
def ai_recommendations():
    user_id = ObjectId(request.user["user_id"])
    expenses = list(expenses_collection.find({"user_id": user_id}))

    income = 0
    expense = 0
    category_totals = {}

    for t in expenses:
        if t.get("txn_type") == "income":
            income += t["amount"]
        elif t.get("txn_type") == "expense":
            expense += t["amount"]
            category_totals[t["category"]] = category_totals.get(t["category"], 0) + t["amount"]

    summary = "\n".join([f"{k}: ₹{v}" for k, v in category_totals.items()])

    prompt = f"""
    User income: ₹{income}
    User expense: ₹{expense}

    Category breakdown:
    {summary}

    Give simple financial advice.
    """

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a financial advisor."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,
        max_tokens=512
    )

    reply = response.choices[0].message.content.strip()

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a financial advisor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=512
        )

        reply = response.choices[0].message.content.strip()

        return jsonify({
            "source": "groq",
            "advice": reply
        })

    except Exception as e:
        print("🔥 GROQ ERROR:", str(e))
        return jsonify({
            "source": "groq",
            "error": "Groq recommendation failed"
        }), 500

from services.anomaly_service import analyze_user_anomalies

@ai_bp.route("/anomaly-analysis", methods=["GET"])
@token_required
def anomaly_analysis():
    user_id = request.user["user_id"]
    sensitivity = int(request.args.get("sensitivity", 3))

    expenses = get_expenses_by_user(user_id)

    if len(expenses) < 5:
        return jsonify({
            "total_expenses": len(expenses),
            "anomalies_detected": 0,
            "anomalies": [],
            "message": "Not enough data for anomaly detection"
        })

    import numpy as np

    # Sensitivity → std multiplier
    sensitivity_map = {
        1: 3.0,   # very low sensitivity
        2: 2.5,
        3: 2.0,   # medium (default)
        4: 1.5,
        5: 1.0    # very high sensitivity
    }
    multiplier = sensitivity_map.get(sensitivity, 2.0)

    # Group expenses by category
    category_map = {}
    for e in expenses:
        if e.get("txn_type") != "expense":
            continue
        category_map.setdefault(e["category"], []).append(e["amount"])

    anomalies = []

    # Detect anomalies
    for e in expenses:
        if e.get("txn_type") != "expense":
            continue

        amounts = category_map[e["category"]]
        avg = np.mean(amounts)
        std = np.std(amounts)

        threshold = avg + (multiplier * std)

        if e["amount"] > threshold:
            anomalies.append({
                "amount": e["amount"],
                "category": e["category"],
                "date": e["date"],
                "avg": round(avg, 2),
                "threshold": round(threshold, 2),
                "reason": f"Unusually high {e['category']} spending",
                "why_risky": (
                    f"This expense is much higher than your usual "
                    f"{e['category']} spending. Frequent overspending "
                    "can reduce savings and create financial stress."
                )
            })

    return jsonify({
        "total_expenses": len(expenses),
        "anomalies_detected": len(anomalies),
        "anomalies": anomalies
    })


   

@ai_bp.route("/discipline-score", methods=["GET"])
@token_required
def discipline_score():
    user_id = request.user.get("user_id")
    expenses = get_expenses_by_user(user_id)

    expenses = [e for e in expenses if e.get("txn_type") == "expense"]

    if len(expenses) < 5:
        return jsonify({
            "score": 80,
            "message": "Not enough data. Default healthy score assigned."
        })

    import numpy as np

    category_map = {}
    anomalies = []

    for e in expenses:
        category_map.setdefault(e["category"], []).append(e["amount"])

    for e in expenses:
        amounts = category_map[e["category"]]
        avg = np.mean(amounts)
        std = np.std(amounts)

        if std == 0:
            continue

        if e["amount"] > avg + 2 * std:
            anomalies.append("high")
        elif e["amount"] > avg + std:
            anomalies.append("medium")

    # 🎯 Scoring logic
    score = 100
    score -= anomalies.count("high") * 15
    score -= anomalies.count("medium") * 8

    score = max(score, 0)

    level = (
        "Excellent" if score >= 85 else
        "Good" if score >= 70 else
        "Needs Improvement"
    )

    return jsonify({
        "score": score,
        "level": level,
        "message": f"Your financial discipline is {level}"
    })

@ai_bp.route("/budget-alerts", methods=["GET"])
@token_required
def budget_alerts():
    user_id = request.user.get("user_id")
    expenses = get_expenses_by_user(user_id)

    expenses = [e for e in expenses if e.get("txn_type") == "expense"]

    import datetime
    from collections import defaultdict

    current_month = datetime.datetime.now().month
    monthly_totals = defaultdict(float)

    for e in expenses:
        date = datetime.datetime.fromisoformat(e["date"])
        if date.month == current_month:
            monthly_totals[e["category"]] += e["amount"]

    # ⚠️ Simple intelligent limits
    limits = {
        "Food": 5000,
        "Shopping": 4000,
        "Entertainment": 3000,
        "Transport": 2500,
        "Bills": 6000
    }

    alerts = []

    for cat, spent in monthly_totals.items():
        limit = limits.get(cat)
        if limit and spent > limit:
            alerts.append({
                "category": cat,
                "spent": spent,
                "limit": limit,
                "message": f"You exceeded your {cat} budget by ₹{spent - limit}"
            })

    return jsonify({
        "alerts_detected": len(alerts),
        "alerts": alerts
    })

@ai_bp.route("/financial-health", methods=["GET"])
@token_required
def financial_health():
    user_id = request.user.get("user_id")
    expenses = get_expenses_by_user(user_id)

    income = 0
    expense = 0

    for e in expenses:
        if e.get("txn_type") == "income":
            income += e["amount"]
        elif e.get("txn_type") == "expense":
            expense += e["amount"]

    if income == 0:
        return jsonify({
            "score": 50,
            "level": "Unknown",
            "message": "Add income data to calculate health score"
        })

    savings_rate = (income - expense) / income
    expense_ratio = expense / income

    # 🎯 Scoring logic
    score = 100
    score -= max(0, expense_ratio - 0.7) * 100
    score += savings_rate * 30

    score = int(min(max(score, 0), 100))

    level = (
        "Excellent" if score >= 80 else
        "Good" if score >= 65 else
        "At Risk"
    )

    return jsonify({
        "score": score,
        "level": level,
        "savings_rate": round(savings_rate * 100, 2),
        "expense_ratio": round(expense_ratio * 100, 2)
    })

@ai_bp.route("/spending-behavior", methods=["GET"])
@token_required
def spending_behavior():
    user_id = request.user["user_id"]
    expenses = get_expenses_by_user(user_id)

    if not expenses:
        return jsonify({
            "summary": "No spending data available yet.",
            "patterns": [],
            "advice": []
        })

    total = 0
    category_totals = {}

    for e in expenses:
        if e.get("txn_type") != "expense":
            continue
        amt = float(e["amount"])
        total += amt
        category_totals[e["category"]] = category_totals.get(e["category"], 0) + amt

    # Sort categories
    sorted_categories = sorted(
        category_totals.items(), key=lambda x: x[1], reverse=True
    )

    top_category, top_amount = sorted_categories[0]
    top_percent = (top_amount / total) * 100

    patterns = []
    advice = []

    # ---- Behavioral Reasoning ----
    if top_percent > 40:
        patterns.append(
            f"High dependency on {top_category} spending ({top_percent:.1f}%)."
        )
        advice.append(
            f"You rely heavily on {top_category}. Try setting a weekly cap instead of monthly."
        )

    if len(sorted_categories) <= 3:
        patterns.append(
            "Spending concentrated in very few categories."
        )
        advice.append(
            "Diversifying spending usually improves financial control awareness."
        )

    if total > 0:
        advice.append(
            "A healthy rule is: Needs ≤ 50%, Wants ≤ 30%, Savings ≥ 20%."
        )

    return jsonify({
        "summary": "Your spending behavior has been analyzed using AI.",
        "top_category": top_category,
        "patterns": patterns,
        "advice": advice
    })

@ai_bp.route("/spending-insights", methods=["GET"])
@token_required
def spending_insights():
    user_id = request.user["user_id"]
    expenses = get_expenses_by_user(user_id)

    if not expenses:
        return jsonify({"insights": ["No expense data available. Start tracking to get insights."]})

    income = 0
    total_expense = 0
    category_totals = {}

    # ---- DATA AGGREGATION ----
    for e in expenses:
        if e["txn_type"] == "income":
            income += e["amount"]
        elif e["txn_type"] == "expense":
            total_expense += e["amount"]
            category_totals[e["category"]] = category_totals.get(e["category"], 0) + e["amount"]

    insights = []

    # ---- 1. BASIC FINANCIAL HEALTH ----
    if income > 0:
        expense_ratio = (total_expense / income) * 100
        insights.append(f"You are spending {int(expense_ratio)}% of your income.")

        if expense_ratio > 90:
            insights.append(
                "⚠️ Your expenses are dangerously close to your income. This can lead to financial stress."
            )
        elif expense_ratio > 70:
            insights.append(
                "You have moderate savings discipline, but reducing expenses can improve stability."
            )
        else:
            insights.append(
                "✅ You maintain a healthy balance between income and expenses."
            )

    # ---- 2. CATEGORY DEPENDENCY ANALYSIS ----
    sorted_categories = sorted(
        category_totals.items(), key=lambda x: x[1], reverse=True
    )

    top_category, top_amount = sorted_categories[0]
    top_percentage = (top_amount / total_expense) * 100

    insights.append(
        f"Your highest spending category is {top_category}, contributing {int(top_percentage)}% of total expenses."
    )

    if top_percentage > 45:
        insights.append(
            f"⚠️ Heavy dependency on {top_category} detected. Over-dependence reduces financial flexibility."
        )

    # ---- 3. NEEDS vs WANTS ANALYSIS ----
    needs = ["Food", "Bills", "Healthcare", "Transport"]
    wants = ["Shopping", "Entertainment"]

    needs_spend = sum(category_totals.get(c, 0) for c in needs)
    wants_spend = sum(category_totals.get(c, 0) for c in wants)

    if wants_spend > needs_spend:
        insights.append(
            "⚠️ You are spending more on wants than needs. This may impact long-term savings."
        )
    else:
        insights.append(
            "✅ Your spending prioritizes essential needs over lifestyle expenses."
        )

    # ---- 4. FINANCIAL LITERACY INSIGHT ----
    insights.append(
        "📘 Financial Tip: A good practice is the 50–30–20 rule "
        "(50% needs, 30% wants, 20% savings)."
    )

    return jsonify({"insights": insights})


@ai_bp.route("/spending-behavior-ai", methods=["GET"])
@token_required
def spending_behavior_ai():
    user_id = request.user["user_id"]
    expenses = get_expenses_by_user(user_id)

    if not expenses:
        return jsonify({
            "source": "groq",
            "insights": "No spending data available yet."
        })

    total = 0
    category_totals = {}

    for e in expenses:
        if e.get("txn_type") != "expense":
            continue
        amt = float(e["amount"])
        total += amt
        category_totals[e["category"]] = category_totals.get(e["category"], 0) + amt

    if total == 0:
        return jsonify({
            "source": "groq",
            "insights": "No expense transactions found."
        })

    category_summary = "\n".join(
        [f"{cat}: ₹{amt:.0f}" for cat, amt in category_totals.items()]
    )

    prompt = f"""
    You are an expert financial advisor.

    User spending summary:
    Total Monthly Spending: ₹{total:.0f}

    Category-wise breakdown:
    {category_summary}

    Tasks:
    1. Explain spending behavior
    2. Identify bad habits if any
    3. Explain why it is risky or healthy
    4. Suggest 3 actionable improvements

    Rules:
    - Simple language
    - Financial literacy focused
    - No markdown symbols
    - No bullets
    - Short clear sentences
    """

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful financial advisor."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4
        )

        reply = response.choices[0].message.content.strip()

        return jsonify({
            "source": "groq",
            "insights": reply
        })

    except Exception as e:
        print("🔥 GROQ ERROR:", str(e))
        return jsonify({
            "source": "groq",
            "error": "Groq analysis failed"
        }), 500

# Simple in-memory chat memory (per user)
CHAT_MEMORY = {}
MAX_MEMORY = 5

@ai_bp.route("/chat", methods=["POST"])
@token_required
def financial_chat():
    user_id = request.user["user_id"]
    data = request.json

    user_message = data.get("message", "").strip()
    user_message = data.get("message", "").strip()
    language = data.get("language", "en").lower()

    # ---- NORMALIZE LANGUAGE CODE ----
    if language.startswith("hi"):
        language = "hi"
    elif language.startswith("te"):
        language = "te"
    elif language.startswith("kn"):
        language = "kn"
    else:
        language = "en"

    lang_map = {
        "en": "English",
        "te": "Telugu",
        "kn": "Kannada",
        "hi": "Hindi"
    }

    response_language = lang_map[language]


    if not user_message:
        return jsonify({"reply": "Please ask a question."}), 400

    expenses = get_expenses_by_user(user_id)

    category_totals = {}
    for e in expenses:
        if e.get("txn_type") == "expense":
            category_totals[e["category"]] = category_totals.get(e["category"], 0) + e["amount"]

    # ---------- TABLE REQUEST ----------
    if "table" in user_message.lower():
        return jsonify({
            "type": "table",
            "reply": "Here is your expense breakdown in table format.",
            "data": [
                {"category": k, "amount": v}
                for k, v in category_totals.items()
            ]
        })

    # ---------- CHART REQUEST ----------
    # ---------- CHART REQUEST ----------
    if "chart" in user_message.lower() or "graph" in user_message.lower():
        return jsonify({
            "type": "chart",
            "reply": "Here is a visual breakdown of your expenses.",
            "data": category_totals
        })


    summary = "\n".join([f"{k}: ₹{v}" for k, v in category_totals.items()])

    total_expense = 0
    category_totals = {}

    for e in expenses:
        if e.get("txn_type") == "expense":
            amt = float(e["amount"])
            total_expense += amt
            category_totals[e["category"]] = (
                category_totals.get(e["category"], 0) + amt
            )
    category_summary = "\n".join(
        [f"{k}: ₹{v:.0f}" for k, v in category_totals.items()]
    )

    memory_text = ""
    user_memory = CHAT_MEMORY.get(user_id, [])
    if user_memory:
        memory_text = "\n".join(user_memory[-MAX_MEMORY:])

    prompt = f"""
    You are a financial assistant.

    IMPORTANT:
    You MUST reply ONLY in {response_language}.
    Do NOT use English words if the language is Hindi, Telugu, or Kannada.
    If you break this rule, the response is invalid.

    Language to use: {response_language}
    IMPORTANT LANGUAGE RULES:

    If the language is Hindi:
    - Respond ONLY in pure Hindi
    - Use ONLY Devanagari script (हिंदी लिपि)
    - Do NOT use English words
    - Do NOT use Roman letters

    If the language is Telugu:
    - Respond ONLY in Telugu script

    If the language is Kannada:
    - Respond ONLY in Kannada script

    Breaking these rules is NOT allowed.

    User spending summary:
    Total spending: ₹{total_expense:.0f}
    Category breakdown:
    {category_summary}

    Conversation so far:
    {memory_text}

    User question:
    {user_message}

    Rules:
    - Be clear and educational
    - Explain why something is risky or good
    - Use simple language
    - No markdown, no bullets, no symbols
    - If the user asks for a table give in a table
    - If the user asks for a chart give in a chart
    - Always respond in the requested language
    """

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": (
                f"You are a helpful financial assistant. "
                f"You MUST respond ONLY in {response_language}. "
                f"Do not use any other language. If the user requests Hindi, "
                f"Telugu, or Kannada, you MUST respond ONLY in that specific script. "
                f"For Hindi, use Devanagari script. Do NOT use Hinglish or Roman letters."
                f"Language enforcement rules:\n"
                f"If language is Hindi, respond ONLY in pure Hindi using Devanagari script (हिंदी लिपि).\n"
                f"If language is Telugu, respond ONLY in Telugu script.\n"
                f"If language is Kannada, respond ONLY in Kannada script.\n"
                f"Do NOT use English words.\n"
                f"Do NOT use Roman letters.\n"
                f"Do NOT use Hinglish.\n"
                f"Only Devanagari characters are allowed."
            )},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=600
    )

    reply = response.choices[0].message.content.strip()

    return jsonify({"reply": reply})

@ai_bp.route("/discipline-explanation", methods=["GET"])
@token_required
def explain_discipline_score():
    user_id = request.user["user_id"]
    expenses = get_expenses_by_user(user_id)

    income = 0
    expense = 0
    category_totals = {}

    for e in expenses:
        if e["txn_type"] == "income":
            income += e["amount"]
        elif e["txn_type"] == "expense":
            expense += e["amount"]
            category_totals[e["category"]] = category_totals.get(e["category"], 0) + e["amount"]

    if income == 0:
        return jsonify({
            "explanation": "Add income data so I can evaluate your financial discipline."
        })

    savings_rate = ((income - expense) / income) * 100

    category_summary = "\n".join(
        [f"{cat}: ₹{amt:.0f}" for cat, amt in category_totals.items()]
    )

    prompt = f"""
    You are a financial coach.

    User data:
    Income: ₹{income:.0f}
    Expenses: ₹{expense:.0f}
    Savings rate: {savings_rate:.1f}%

    Category spending:
    {category_summary}

    Task:
    Explain the user's financial discipline score.
    Explain:
    1. Why the score is high or low
    2. What habits are good or bad
    3. What to improve first
    Use simple educational language.
    No markdown. 5 to 6 sentences.
    """

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial coach who explains scores clearly."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4
        )

        explanation = response.choices[0].message.content.strip()

        return jsonify({
            "source": "groq",
            "explanation": explanation
        })

    except Exception as e:
        print("🔥 GROQ SCORE ERROR:", e)
        return jsonify({
            "explanation": "Could not explain the score right now."
        }), 500

# @ai_bp.route("/predict-category", methods=["POST"])
# def predict_category():

#     data = request.json
#     desc = data.get("description", "").lower()

#     mapping = {
#         "Food": ["swiggy", "zomato", "restaurant", "food", "dinner", "lunch", "breakfast", "cafe", "coffee", "burger", "pizza", "meal"],
#         "Transport": ["uber", "ola", "petrol", "fuel", "bus", "train", "metro", "taxi", "cab", "transport", "auto", "flight", "travel", "ticket", "parking", "toll"],
#         "Shopping": ["amazon", "flipkart", "store", "mall", "clothes", "shoes", "electronics", "gadget", "shopping", "gift", "accessory", "furniture", "home decor", "cosmetics", "beauty", "jewelry", "book", "subscription",  "apparel", "groceries", "supermarket", "pharmacy", "medicine", "health", "wellness", "sports", "fitness", "hobby", "entertainment", "movie", "music", "game", "event", "ticket", "donation", "charity"],
#         "Bills": ["electricity", "rent", "wifi", "internet", "phone", "gas", "water", "utility", "bill", "subscription", "insurance", "loan", "credit card", "tax", "education", "school", "tuition", "childcare", "healthcare", "medical", "doctor", "hospital", "pharmacy", "medicine", "wellness", "gym", "fitness", "sports", "hobby", "entertainment", "movie", "music", "game", "event", "ticket", "donation", "charity", "amazon", "flipkart", "store", "mall", "clothes", "shoes", "electronics", "gadget", "shopping", "gift", "accessory", "furniture", "home decor", "cosmetics", "beauty", "jewelry", "book", "subscription"],
#         "Salary": ["salary", "bonus", "payroll", "income", "pay", "earning", "wage", "compensation", "stipend", "dividend", "investment", "interest", "refund", "rebate", "cashback", "gift", "freelance", "side hustle", "business", "sale", "rent", "royalty", "commission", "allowance", "grants", "pension", "social security", "alimony", "child support", "inheritance", "lottery", "gambling", "other income", "amazon", "flipkart", "store", "mall", "clothes", "shoes", "electronics", "gadget", "shopping", "gift", "accessory", "furniture", "home decor", "cosmetics", "beauty", "jewelry", "book", "subscription"]
#     }

#     for category, words in mapping.items():
#         if any(word in desc for word in words):
#             return jsonify({"category": category})

#     return jsonify({"category": "Other"})

@ai_bp.route("/predict-category", methods=["POST"])
def predict_category():

    data = request.get_json()
    description = data.get("description", "").lower()

    # Simple AI logic (can upgrade later to ML)

    if any(word in description for word in ["uber","ola","cab","bus","train","metro","taxi","transport","auto","flight","travel","ticket","parking","toll","petrol","fuel","bike","cycle","rent-a-car"]):
        return jsonify({"category":"Transport"})

    elif any(word in description for word in ["pizza","food","restaurant","swiggy","zomato","cafe","coffee","burger","meal","dinner","lunch","breakfast","groceries","supermarket",]):
        return jsonify({"category":"Food"})

    elif any(word in description for word in ["amazon","shopping","mall","cloth","bag","shoes","watch","shoe","electronics","gadget","gift","accessory","furniture","home decor","cosmetic","beauty","jewelry","book","subscription","apparel","pharmacy","medicine","health","wellness","sports","fitness","hobby","entertainment","movie","music","game","event","ticket",]):
        return jsonify({"category":"Shopping"})

    elif any(word in description for word in ["electricity","rent","bill","water","gas","wifi","internet","phone","utility","insurance","loan","credit card","tax","education","school","tuition","childcare","healthcare","medical","doctor","hospital","pharmacy","medicine","wellness","gym",]):
        return jsonify({"category":"Bills"})

    elif any(word in description for word in ["movie","netflix","game","music","concert","event","ticket","hobby","sports","fitness","entertainment",]):
        return jsonify({"category":"Entertainment"})

    elif any(word in description for word in ["salary","bonus","income","payroll","wage","compensation","stipend","dividend","investment","interest","refund","rebate","cashback","gift","freelance","side hustle","business","sale"]):
        return jsonify({"category":"Salary"})

    else:
        return jsonify({"category":"Other"})

import json
import re

@ai_bp.route("/parse-transaction", methods=["POST"])
def parse_transaction():

    data = request.json
    text = data.get("description")

    if not text:
        return jsonify({"error": "No description provided"}), 400

    prompt = f"""
        You are a strict financial transaction parser.

        Your job is to extract structured information from a user transaction sentence.

        Sentence:
        "{text}"

        Return ONLY valid JSON.

        Rules:

        1. Understand the semantic meaning of the sentence before extracting data.

        2. Category must be one of:
        Food, Transport, Shopping, Bills, Entertainment, Healthcare, Salary, Other

        3. Type must be:
        "income" OR "expense"

        4. Amount must be:
        A numeric value only (no ₹ symbol, no words)

        5. Description must be:
        A clean human-friendly short title that includes ONLY:
        - Merchant name
        - Purpose of transaction

        STRICTLY REMOVE:
        - Numbers
        - Amounts
        - Currency words (rupees, rs, inr, ₹)
        - Digits
        - Price references

        Description MUST NEVER contain:
        - Any number
        - Any currency symbol
        - Any money reference

        Description must be properly capitalized.

        Examples:

        Input:
        "zomato dinner rupees 500"

        Output:
        {{
        "category": "Food",
        "type": "expense",
        "amount": 500,
        "description": "Zomato Dinner"
        }}

        Input:
        "uber ride 200"

        Output:
        {{
        "category": "Transport",
        "type": "expense",
        "amount": 200,
        "description": "Uber Ride"
        }}

        Output format MUST be strictly:

        {{
        "category": "...",
        "type": "...",
        "amount": ...,
        "description": "..."
        }}

        DO NOT:
        - Explain
        - Add text
        - Add markdown
        - Add code
        - Add examples

        Return ONLY valid JSON.
        """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        
        content = response.choices[0].message.content

        print("GROQ RAW RESPONSE:\n", content)

        # Extract JSON safely
        match = re.search(r"\{.*\}", content, re.DOTALL)

        if match:
            parsed_json = match.group(0)
            data = json.loads(parsed_json)
        else:
            data = {
                "category": "",
                "type": "",
                "amount": "",
                "description": text
            }

        return jsonify(data)


    except Exception as e:
        print("AI Parse Error:", e)
        return jsonify({"category": None, "type": None, "amount": None})

