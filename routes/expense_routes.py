from flask import Blueprint, request, jsonify
from models.expense_model import (
    create_expense,
    get_expenses_by_user,
    update_expense,
    delete_expense,
)
from utils.auth_middleware import token_required
from bson import ObjectId

expense_bp = Blueprint("expense", __name__)

# -------- ADD EXPENSE --------
@expense_bp.route("/", methods=["POST"])
@token_required
def add_expense():
    data = request.json
    user_id = ObjectId(request.user["user_id"])
    
    # Added: Basic validation for required fields
    required_fields = ["amount", "category", "date", "type"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        amount = float(data["amount"])
        category = data["category"]
        date = data["date"]
        txn_type = data["type"] # Renamed from 'type' to 'txn_type' for clarity and consistency

        # Use .get() for optional fields or provide a default
        title = data.get("title", category) # Default title to category if not provided
        description = data.get("description", "")

        expense = create_expense(
            user_id=user_id, title=title, amount=amount, category=category,
            date=date, description=description, txn_type=txn_type
        )
    except ValueError:
        return jsonify({"error": "Invalid amount. Must be a number."}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return jsonify({"message": "Transaction added"}), 201


# -------- GET EXPENSES --------
@expense_bp.route("/", methods=["GET"])
@token_required
def get_expenses():
    user_id = request.user["user_id"] # user_id is already a string from token_required
    expenses = get_expenses_by_user(user_id)

    # Convert ObjectId to string
    for exp in expenses:
        exp["_id"] = str(exp["_id"])
        exp["user_id"] = str(exp["user_id"])

    return jsonify(expenses)


# -------- UPDATE EXPENSE --------
@expense_bp.route("/<expense_id>", methods=["PUT"])
@token_required
def edit_expense(expense_id):
    data = request.json

    # Map frontend → DB field
    if "type" in data:
        data["txn_type"] = data.pop("type")

    # mark edited
    data["isUpdated"] = True

    update_expense(expense_id, data)

    return jsonify({"message": "Expense updated successfully"})


# -------- DELETE EXPENSE --------
@expense_bp.route("/<expense_id>", methods=["DELETE"])
@token_required
def remove_expense(expense_id):
    delete_expense(expense_id)
    return jsonify({"message": "Expense deleted successfully"})



