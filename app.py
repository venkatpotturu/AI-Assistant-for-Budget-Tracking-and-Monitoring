import os
from flask_cors import CORS
from routes.auth_routes import auth_bp
from utils.auth_middleware import token_required
from routes.expense_routes import expense_bp
from routes.analytics_routes import analytics_bp
from routes.ai_routes import ai_bp # Added: Import ai_bp
from flask import render_template
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from ml.predict_category import predict_expense_category
from ml.predict_anomaly import is_anomalous_expense
from ml.insights_engine import generate_insights
from ml.what_if_engine import what_if_analysis
from routes.ocr_routes import ocr_bp
from routes.voice_routes import voice_bp
from routes.user_routes import user_bp


load_dotenv()   # ✅ LOADS .env FILE


app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(expense_bp, url_prefix="/api/expenses")
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
app.register_blueprint(ai_bp, url_prefix="/api/ai") # Added: Register ai_bp
app.register_blueprint(ocr_bp, url_prefix="/api/ocr")
app.register_blueprint(voice_bp)
app.register_blueprint(user_bp, url_prefix="/api/user")

# Health check route
@app.route("/")
def home():
    return render_template("index.html")


# Protected test route
@app.route("/api/protected")
@token_required
def protected():
    return {
        "message": "You accessed a protected route 🔐",
        "user": request.user
    }

@app.route("/predict-category", methods=["POST"])
def predict_category():
    data = request.get_json()

    description = data.get("description", "")

    if not description:
        return jsonify({"error": "Description is required"}), 400

    category = predict_expense_category(description)

    return jsonify({
        "description": description,
        "predicted_category": category
    })

@app.route("/detect-anomaly", methods=["POST"])
def detect_anomaly():
    data = request.get_json()

    amount = data.get("amount")
    category = data.get("category")

    if amount is None or not category:
        return jsonify({"error": "Amount and category are required"}), 400

    anomaly = is_anomalous_expense(float(amount), category)

    return jsonify({
        "amount": amount,
        "category": category,
        "is_anomaly": anomaly
    })

@app.route("/generate-insights", methods=["POST"])
def generate_user_insights():
    data = request.get_json()
    expenses = data.get("expenses", [])

    if not expenses:
        return jsonify({"error": "Expense data is required"}), 400

    insights = generate_insights(expenses)

    return jsonify({
        "insights": insights
    })

@app.route("/what-if-analysis", methods=["POST"])
def what_if():
    data = request.get_json()

    expenses = data.get("expenses", [])
    category = data.get("category")
    reduction_percent = data.get("reduction_percent")

    if not expenses or not category or reduction_percent is None:
        return jsonify({"error": "Expenses, category and reduction_percent are required"}), 400

    result = what_if_analysis(
        expenses,
        category,
        float(reduction_percent)
    )

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

