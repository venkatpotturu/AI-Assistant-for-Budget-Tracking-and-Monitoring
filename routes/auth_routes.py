from flask import Blueprint, request, jsonify
from models.user_model import create_user, find_user_by_email
from utils.jwt_utils import generate_token
import bcrypt

auth_bp = Blueprint("auth", __name__)

# ---------------- REGISTER ----------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Invalid or missing JSON"}), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # Validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    if find_user_by_email(email):
        return jsonify({"error": "Email already registered"}), 400

    # Hash password
    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    create_user(name, email, hashed_password)

    return jsonify({"message": "User registered successfully"}), 201

# ---------------- LOGIN (WITH JWT) ----------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = find_user_by_email(email)

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # 🔐 Generate JWT Token
    token = generate_token(user["_id"], user["email"])

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "name": user["name"],
            "email": user["email"]
        }
    })
