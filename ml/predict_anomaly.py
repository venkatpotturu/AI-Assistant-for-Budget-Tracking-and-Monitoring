import os
import pickle
import numpy as np

# Same category encoding used during training
CATEGORY_MAP = {
    "Food": 0,
    "Transport": 1,
    "Groceries": 2,
    "Utilities": 3,
    "Shopping": 4,
    "Entertainment": 5,
    "Healthcare": 6,
    "Others": 7
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "anomaly_model.pkl")

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)


def is_anomalous_expense(amount: float, category: str) -> bool:
    category_code = CATEGORY_MAP.get(category, 7)
    X = np.array([[amount, category_code]])

    prediction = model.predict(X)
    # -1 = anomaly, 1 = normal

    # ✅ Convert numpy.bool_ / numpy.int64 to native Python bool
    return bool(prediction[0] == -1)
