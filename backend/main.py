from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from app.api.router import api_router
import os
import json
import re
import pdfplumber

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


class ChatRequest(BaseModel):
    message: str
    history: list | None = None


def extract_text_from_pdf(file_path: str) -> str:
    extracted_text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

    return extracted_text.strip()


def detect_month_from_text(text: str) -> str:
    match = re.search(r"לתאריך\s+(\d{2})/(\d{2})/(\d{2})", text)

    if match:
        return f"{match.group(2)}/20{match.group(3)}"

    match = re.search(r"תאריך\s+(\d{2})/(\d{2})/(\d{2})", text)

    if match:
        return f"{match.group(2)}/20{match.group(3)}"

    return "לא זוהה"


def extract_amounts(text: str):
    amounts = re.findall(r"[\d,]+\.\d{2}", text)
    clean_amounts = []

    for amount in amounts:
        try:
            clean_amounts.append(float(amount.replace(",", "")))
        except Exception:
            pass

    return clean_amounts


def extract_json_from_response(text: str):
    try:
        start = text.rfind("{")
        end = text.rfind("}")

        if start != -1 and end != -1 and end > start:
            json_str = text[start:end + 1]
            return json.loads(json_str)

    except Exception:
        pass

    return {}


def basic_local_analysis(text: str):
    amounts = extract_amounts(text)
    month = detect_month_from_text(text)

    large_amounts = [x for x in amounts if x >= 500]
    very_large_amounts = [x for x in amounts if x >= 2000]

    keywords = {
        "crypto": [
            "KRAKEN",
            "SWAPPED",
            "MELD",
            "BIT",
            "BINANCE",
        ],
        "subscriptions": [
            "GOOGLE",
            "MICROSOFT",
            "CLAUDE",
            "OPENAI",
            "NAMECHEAP",
            "NAME-CHEAP",
            "SHOPIFY",
            "TINDER",
            "SPOTIFY",
            "NETFLIX",
        ],
        "food": [
            "סופר",
            "מרקט",
            "רמי לוי",
            "חצי חינם",
            "ויקטורי",
            "פרשמרקט",
            "מאפיית",
            "מאפה",
        ],
        "fuel": [
            "פז",
            "YELLOW",
            "דלק",
        ],
        "health": [
            "מכבי",
            "סופר פארם",
            "פארם",
        ],
    }

    detected_categories = {}
    upper_text = text.upper()

    for category, words in keywords.items():
        detected_categories[category] = []

        for word in words:
            if word.upper() in upper_text:
                detected_categories[category].append(word)

    return {
        "month": month,
        "amount_count": len(amounts),
        "max_amount": max(amounts) if amounts else 0,
        "large_amounts": large_amounts[:20],
        "very_large_amounts": very_large_amounts[:20],
        "detected_categories": detected_categories,
    }


@app.get("/")
async def root():
    return {
        "status": "HomeMind AI backend is running"
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    messages = [
        {
            "role": "system",
            "content": """
אתה HomeMind AI.
עוזר פיננסי ישראלי חכם, רגוע, אנושי וחם.
תענה בעברית בלבד.
אם המשתמש שואל על מסמכים, הוצאות, חריגות או תקציב —
תענה כמו יועץ פיננסי מקצועי.
"""
        }
    ]

    if request.history:
        for item in request.history[-10:]:
            role = item.get("role", "user")
            content = item.get("content", "")

            if role in ["user", "assistant"] and content:
                messages.append({
                    "role": role,
                    "content": content
                })

    messages.append({
        "role": "user",
        "content": request.message
    })

    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages
    )

    return {
        "response": completion.choices[0].message.content
    }


@app.post("/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    extracted_text = ""

    if file.filename.lower().endswith(".pdf"):
        extracted_text = extract_text_from_pdf(file_path)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            extracted_text = f.read()

    if extracted_text.strip() == "":
        extracted_text = "לא הצלחתי לקרוא טקסט מהמסמך."

    local_analysis = basic_local_analysis(extracted_text)

    prompt = f"""
אתה HomeMind AI —
אנליסט פיננסי ישראלי מומחה למשקי בית.

קיבלת מסמך פיננסי,
כנראה פירוט אשראי או בנק.

נתוני זיהוי ראשוניים:

{json.dumps(local_analysis, ensure_ascii=False, indent=2)}

נתח את המסמך בכמה רמות:

1. סיכום מנהלים קצר
- איזה סוג מסמך זה
- לאיזה חודש
- מה הדבר הכי חשוב במסמך

2. מספרים מרכזיים
- סך חיובים אם מופיע
- חיובים גדולים
- התחייבויות
- ריביות
- עמלות

3. חריגות
- עסקאות חריגות
- קפיצות חריגות
- חיובים שחוזרים כמה פעמים
- עסקאות קריפטו
- עסקאות חו"ל
- מנויים

4. קטגוריות
חלק את ההוצאות לפי:
- מזון וסופר
- מסעדות ובילויים
- דלק ותחבורה
- בריאות
- טכנולוגיה ומנויים
- קריפטו והשקעות
- תשלומים קבועים
- אחר

5. מנויים וחיובים חוזרים
מצא שירותים כמו:
Google
Microsoft
OpenAI
Claude
Shopify
Namecheap
Tinder
Netflix
Spotify
וכו'

6. המלצות פעולה
תן המלצות פרקטיות:
- מה לבדוק
- מה לבטל
- איפה ניתן לחסוך
- אילו עסקאות דורשות בירור

7. ציון פיננסי
תן ציון מ-1 עד 100 למסמך הזה בלבד
והסבר למה.

8. פלט JSON בסוף
בסוף התשובה תוסיף JSON קצר בפורמט הבא:

{{
  "month": "...",
  "financial_score": 0,
  "risk_level": "low/medium/high",
  "top_anomalies": [],
  "subscriptions": [],
  "large_expenses": [],
  "recommendations": []
}}

תענה בעברית בלבד.
אל תמציא סכומים שלא מופיעים במסמך.
אם משהו לא ברור —
תגיד שלא ברור.
"""

    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": extracted_text[:50000]
            }
        ],
        temperature=0.2
    )

    response_text = completion.choices[0].message.content
    dashboard_data = extract_json_from_response(response_text)

    return {
        "filename": file.filename,
        "month": local_analysis["month"],
        "local_analysis": local_analysis,
        "analysis": response_text,
        "dashboard": dashboard_data
    }
