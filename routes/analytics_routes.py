from flask import Blueprint, jsonify, request, make_response
from database.db import get_db
from utils.auth_middleware import token_required
from bson import ObjectId

# ✅ THIS NAME MUST MATCH app.py IMPORT
analytics_bp = Blueprint("analytics", __name__)

db = get_db()
expenses_collection = db["expenses"]

# -------- SUMMARY API --------
@analytics_bp.route("/summary", methods=["GET"])
@token_required
def summary():
    user_id = ObjectId(request.user["user_id"])

    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "txn_type": "expense"   # ✅ ONLY EXPENSES
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }
        }
    ]


    result = list(expenses_collection.aggregate(pipeline))
    total_spent = result[0]["total"] if result else 0

    res = make_response(jsonify(result))
    res.headers["Cache-Control"] = "no-store"
    return res


# -------- CATEGORY WISE API --------
@analytics_bp.route("/category", methods=["GET"])
@token_required
def category_wise():
    user_id = ObjectId(request.user["user_id"])

    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "$or": [
                    # TODO: Standardize on 'txn_type' and migrate existing data if 'type' is also used.
                    {"txn_type": "expense"},
                    {"type": "expense"}
                ]
            }
        },
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"}
            }
        }
    ]

    data = list(expenses_collection.aggregate(pipeline))

    response = []
    for item in data:
        response.append({
            "category": item["_id"],
            "total": item["total"]
        })

    res = make_response(jsonify(response))
    res.headers["Cache-Control"] = "no-store"
    return res

from datetime import datetime, timedelta

# -------- DAILY SPENDING (LAST 7 DAYS) --------
@analytics_bp.route("/daily", methods=["GET"])
@token_required
def daily_spending():
    user_id = ObjectId(request.user["user_id"])

    today = datetime.utcnow().date()
    start_date = today - timedelta(days=6)

    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "$or": [
                    # TODO: Standardize on 'txn_type' and migrate existing data if 'type' is also used.
                    {"txn_type": "expense"},
                    {"type": "expense"}
                ],
                "date": {
                    "$gte": start_date.isoformat(),
                    "$lte": today.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$date",
                "total": {"$sum": "$amount"}
            }
        },
        {
            "$sort": {"_id": 1}
        }
    ]

    results = list(expenses_collection.aggregate(pipeline))

    # Fill missing days with 0
    data_map = {r["_id"]: r["total"] for r in results}
    response = []

    for i in range(7):
        day = start_date + timedelta(days=i)
        day_str = day.isoformat()

        response.append({
            "date": day.strftime("%b %d"),
            "amount": data_map.get(day_str, 0)
        })

    res = make_response(jsonify(response))
    res.headers["Cache-Control"] = "no-store"
    return res

# -------- DAILY INCOME (LAST 7 DAYS) --------
@analytics_bp.route("/daily-income", methods=["GET"])
@token_required
def daily_income():
    user_id = ObjectId(request.user["user_id"])

    today = datetime.utcnow().date()
    start_date = today - timedelta(days=6)

    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "$or": [
                    # TODO: Standardize on 'txn_type' and migrate existing data if 'type' is also used.
                    {"txn_type": "income"},
                    {"type": "income"}
                ],
                "date": {
                    "$gte": start_date.isoformat(),
                    "$lte": today.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$date",
                "total": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    results = list(expenses_collection.aggregate(pipeline))
    data_map = {r["_id"]: r["total"] for r in results}

    response = []
    for i in range(7):
        day = start_date + timedelta(days=i)
        day_str = day.isoformat()

        response.append({
            "date": day.strftime("%b %d"),
            "amount": data_map.get(day_str, 0)
        })

    res = make_response(jsonify(response))
    res.headers["Cache-Control"] = "no-store"
    return res


# -------- MONTHLY SUMMARY --------
@analytics_bp.route("/monthly", methods=["GET"])
@token_required
def monthly_summary():
    user_id = ObjectId(request.user["user_id"])

    pipeline = [
        {
            "$match": {
                "user_id": user_id
            }
        },
        {
            "$group": {
                "_id": {
                    "month": {"$substr": ["$date", 0, 7]},
                    "type": {
                        "$ifNull": ["$txn_type", "$type"]
                    }
                },
                "total": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id.month": 1}}
    ]

    data = list(expenses_collection.aggregate(pipeline))

    result = {}

    for item in data:
        month = item["_id"].get("month")
        txn_type = item["_id"].get("type")

        # 🚨 Skip legacy broken records
        if not txn_type:
            continue

        txn_type = txn_type.lower()

        # 🚨 Skip unknown values
        if txn_type not in ["income", "expense"]:
            continue

        if month not in result:
            result[month] = {"income": 0, "expense": 0}

        result[month][txn_type] += item["total"]

    res = make_response(jsonify(result))
    res.headers["Cache-Control"] = "no-store"
    return res


@analytics_bp.route("/notifications", methods=["GET"])
@token_required
def get_notifications():
    user_id = ObjectId(request.user["user_id"])
    expenses = list(expenses_collection.find({"user_id": user_id}))

    if not expenses:
        return jsonify([])

    from datetime import datetime
    today = datetime.utcnow().date().isoformat()

    notifications = []

    # TODAY SPENDING
    today_spend = {}
    for txn in expenses:
        if txn.get("date","").startswith(today) and (txn.get("txn_type") == "expense" or txn.get("type") == "expense"):
            cat = txn.get("category", "Other")
            today_spend[cat] = today_spend.get(cat, 0) + txn.get("amount", 0)

    for cat, amt in today_spend.items():
        if amt > 3000:
            notifications.append({
                "type": "warning",
                "title": "Unusual Spending Detected",
                "message": f"You spent ₹{amt} on {cat} today"
            })

    # MONTHLY
    monthly = {}
    income = 0
    expense = 0

    for txn in expenses:
        ttype = txn.get("txn_type") or txn.get("type")

        if ttype == "income":
            income += txn.get("amount", 0)
        else:
            expense += txn.get("amount", 0)
            cat = txn.get("category", "Other")
            monthly[cat] = monthly.get(cat, 0) + txn.get("amount", 0)

    if monthly:
        top_cat = max(monthly, key=monthly.get)
        if monthly[top_cat] > 1000:
            save = int(monthly[top_cat] * 0.25)
            notifications.append({
                "type": "tip",
                "title": "Smart Tip",
                "message": f"You can save ₹{save} by reducing {top_cat} spending"
            })

    if income > 0:
        savings = income - expense
        percent = int((savings / income) * 100)

        notifications.append({
            "type": "success",
            "title": "Savings Progress",
            "message": f"You've saved {percent}% of your income"
        })

    return jsonify(notifications)