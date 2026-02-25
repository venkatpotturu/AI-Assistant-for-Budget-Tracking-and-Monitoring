from groq import Groq
import os
import json

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def clean_receipt_items(raw_items):

    try:

        items = [item.get("description", "") for item in raw_items]

        prompt = f"""
Clean these receipt item names.

Return JSON array only.

Example:
Input: ["1 UNIT *"]
Output: ["Android USB Cable"]

Items:
{items}
"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Return JSON array only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        content = response.choices[0].message.content.strip()

        start = content.find("[")
        end = content.rfind("]")

        if start != -1 and end != -1:
            content = content[start:end+1]

        return json.loads(content)

    except Exception as e:
        print("AI CLEAN FAIL:", e)
        return []
