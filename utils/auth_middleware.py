from functools import wraps
from flask import request, jsonify
from utils.jwt_utils import decode_token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Token missing"}), 401

        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({"error": "Invalid token format"}), 401

        decoded = decode_token(token)

        if not decoded:
            return jsonify({"error": "Invalid or expired token"}), 401

        request.user = decoded
        return f(*args, **kwargs)

    return decorated
