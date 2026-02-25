import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import cv2
import os
import tempfile
from pdf2image import convert_from_path


# If needed, set tesseract path manually
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def preprocess_image(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]
    return thresh


def extract_text_from_image(image_path):
    processed = preprocess_image(image_path)
    text = pytesseract.image_to_string(processed)
    return text


def extract_text_from_pdf(pdf_path):
    images = convert_from_path(pdf_path)

    full_text = ""

    with tempfile.TemporaryDirectory() as temp_dir:
        for i, page in enumerate(images):
            img_path = os.path.join(temp_dir, f"page_{i}.png")
            page.save(img_path, 'PNG')
            full_text += extract_text_from_image(img_path)

    return full_text


def extract_text(file_path):

    text = ""

    # 🟢 If PDF → convert to images
    if file_path.lower().endswith(".pdf"):

        pages = convert_from_path(file_path, dpi=300)

        for page in pages:
            text += pytesseract.image_to_string(page)

    else:
        from PIL import Image
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)

    return text

