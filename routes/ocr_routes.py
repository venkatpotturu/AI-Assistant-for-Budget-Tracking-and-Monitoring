import os
import tempfile
from flask import Blueprint, request, jsonify
from services.ocr_service import extract_text
from services.receipt_parser import parse_receipt_text
from utils.auth_middleware import token_required
from services.ocr_ai_cleaner import clean_receipt_items
from services.category_mapper import map_to_dropdown_category


ocr_bp = Blueprint("ocr", __name__)

@ocr_bp.route("/extract", methods=["POST"])
@token_required
def extract_receipt():

    print("FILES:", request.files)

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    ext = os.path.splitext(file.filename)[1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
        file.save(temp.name)
        file_path = temp.name

    try:
        print("FILE RECEIVED:", file.filename)
        print("TEMP FILE PATH:", file_path)

        # OCR
        text = extract_text(file_path)
        print("OCR OUTPUT:", text)

        # Parse
        raw_transactions = parse_receipt_text(text)

        # 🔥 Fallback simple parser for clean OCR like:
        # T-Shirt 500 500
        if not raw_transactions:
            lines = text.split("\n")
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 2:
                    try:
                        amount = float(parts[-1])
                        desc = " ".join(parts[:-1])

                        raw_transactions.append({
                            "description": desc,
                            "amount": amount,
                            "date": datetime.utcnow().strftime("%Y-%m-%d"),
                            "confidence": 0.9
                        })
                    except:
                        pass

        # AI Clean (safe)
        cleaned = clean_receipt_items(raw_transactions)

        final_txns = []

        for i, txn in enumerate(raw_transactions):

            desc = txn.get("description")

            if i < len(cleaned) and cleaned[i]:

                # 🟢 AI may return list → convert to string
                if isinstance(cleaned[i], list):
                    desc = cleaned[i][0]
                else:
                    desc = cleaned[i]

            category = map_to_dropdown_category(desc)


            final_txns.append({
                **txn,
                "description": desc,
                "category": category
            })

        # ✅ ALWAYS RETURN
        return jsonify({
            "transactions": final_txns,
            "raw_text": text
        })

    except Exception as e:
        print("OCR ROUTE ERROR:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        os.remove(file_path)


from database.db import get_db
from bson import ObjectId
from datetime import datetime

db = get_db()
transactions_collection = db["expenses"]


@ocr_bp.route("/save", methods=["POST"])
@token_required
def save_ocr_transactions():

    data = request.json
    txns = data.get("transactions", [])

    if not txns:
        return jsonify({"error": "No transactions provided"}), 400

    user_id = ObjectId(request.user["user_id"])

    saved = []

    for txn in txns:
        new_txn = {
            "user_id": user_id,
            "txn_type": txn.get("txn_type") or txn.get("type") or "expense",
            "title": txn.get("description"),   # needed for dashboard UI
            "amount": float(txn.get("amount", 0)),
            "category": txn.get("category", "Other"),
            "date": txn.get("date"),
            "created_at": datetime.utcnow()
        }


        result = transactions_collection.insert_one(new_txn)
        new_txn["_id"] = str(result.inserted_id)
        saved.append(new_txn)

    return jsonify({
        "message": "Transactions saved successfully",
        "count": len(saved)
    })
