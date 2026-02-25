import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["expense_db"]

def get_db():
    print("✅ MongoDB Connected:", db.list_collection_names())
    return db
