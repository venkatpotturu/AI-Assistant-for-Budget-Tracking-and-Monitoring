import pickle
import numpy as np
from sklearn.ensemble import IsolationForest

# Example categories (same as ML categorization)
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

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42
        )

    def train(self, expenses):
        """
        expenses: list of dicts
        [{ "amount": 250, "category": "Food" }, ...]
        """
        X = []

        for e in expenses:
            category_code = CATEGORY_MAP.get(e["category"], 7)
            X.append([e["amount"], category_code])

        X = np.array(X)
        self.model.fit(X)

    def predict(self, amount, category):
        category_code = CATEGORY_MAP.get(category, 7)
        X = np.array([[amount, category_code]])

        prediction = self.model.predict(X)
        # -1 = anomaly, 1 = normal
        return prediction[0] == -1

    def save(self, path):
        with open(path, "wb") as f:
            pickle.dump(self.model, f)

    def load(self, path):
        with open(path, "rb") as f:
            self.model = pickle.load(f)
