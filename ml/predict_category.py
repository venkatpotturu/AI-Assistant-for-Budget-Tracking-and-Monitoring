import pickle
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model_path = os.path.join(BASE_DIR, "expense_model.pkl")
vectorizer_path = os.path.join(BASE_DIR, "vectorizer.pkl")

with open(model_path, "rb") as f:
    model = pickle.load(f)

with open(vectorizer_path, "rb") as f:
    vectorizer = pickle.load(f)


def predict_expense_category(description: str) -> str:
    """
    Predict expense category using trained ML model
    """
    description_vector = vectorizer.transform([description])
    prediction = model.predict(description_vector)
    return prediction[0]
