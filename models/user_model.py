from database.db import get_db
import bcrypt

db = get_db()
users_collection = db["users"]

def create_user(name, email, password):
    user = {
        "name": name,
        "email": email,
        "password": password  # ✅ already hashed
    }

    users_collection.insert_one(user)
    return True


def find_user_by_email(email):
    return users_collection.find_one({"email": email})
