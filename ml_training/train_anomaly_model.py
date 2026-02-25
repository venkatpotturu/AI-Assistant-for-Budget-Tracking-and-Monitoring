from anomaly_detector import AnomalyDetector

# Sample historical expense data
expenses = [
    {"amount": 200, "category": "Food"},
    {"amount": 250, "category": "Food"},
    {"amount": 300, "category": "Food"},
    {"amount": 150, "category": "Transport"},
    {"amount": 180, "category": "Transport"},
    {"amount": 1200, "category": "Shopping"},
    {"amount": 1300, "category": "Shopping"},
    {"amount": 500, "category": "Groceries"},
    {"amount": 550, "category": "Groceries"},
    {"amount": 400, "category": "Utilities"},
    {"amount": 450, "category": "Utilities"},
]

detector = AnomalyDetector()
detector.train(expenses)
detector.save("anomaly_model.pkl")

print("Anomaly model trained and saved!")

