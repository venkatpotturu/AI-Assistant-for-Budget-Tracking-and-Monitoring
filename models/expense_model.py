from database.db import get_db
from bson import ObjectId

db = get_db()
expenses_collection = db["expenses"]

def create_expense(user_id,title, amount, category, date, description, txn_type):
    expense = {
        "user_id": user_id,
        "title": title,
        "amount": float(amount),
        "txn_type": txn_type,   # ✅ IMPORTANT
        "category": category,
        "date": date,
        "description": description
    }

    expenses_collection.insert_one(expense)
    return expense


def get_expenses_by_user(user_id):
    return list(expenses_collection.find({"user_id": ObjectId(user_id)}))

def delete_expense(expense_id):
    expenses_collection.delete_one({"_id": ObjectId(expense_id)})

def update_expense(expense_id, data):

    update_data = {}

    if "description" in data:
        update_data["description"] = data["description"]

    if "amount" in data:
        update_data["amount"] = float(data["amount"])

    if "category" in data:
        update_data["category"] = data["category"]

    if "txn_type" in data:
        update_data["txn_type"] = data["txn_type"]

    expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data}
    )
