from flask import Blueprint, request, jsonify
from bson import ObjectId
from database.db import get_db
from utils.auth_middleware import token_required

user_bp = Blueprint("user", __name__)
db = get_db()
users_collection = db["users"]


@user_bp.route("/update-profile", methods=["PUT"])
@token_required
def update_profile():

    user_id = ObjectId(request.user["user_id"])
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    theme = data.get("theme")

    users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "name": name,
            "email": email
        }}
    )

    # 🔥 Fetch updated user
    user = users_collection.find_one({"_id": user_id})

    # 🔥 THIS is the important return
    return jsonify({
        "user": {
            "name": user["name"],
            "email": user["email"]
        }
    })