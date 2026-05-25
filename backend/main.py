import json
import os
import random
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

app = FastAPI(title="MysticOwl API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOT_TOKEN = os.getenv("BOT_TOKEN")

CARDS_FILE = Path(__file__).resolve().parent / "cards.json"


class ShareRequest(BaseModel):
    user_id: int
    card_name: str
    card_description: str


@app.get("/api/fortune")
def get_random_card():
    with open(CARDS_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)
    return random.choice(cards)


@app.post("/api/share")
def share_fortune(data: ShareRequest):
    if not BOT_TOKEN:
        return {"status": "error", "details": "Бот-токен не найден в конфигурации сервера"}

    text = (
        f"🦉 *Мудрая сова MysticOwl прислала ваш расклад!*\n\n"
        f"🔮 *Карта дня:* {data.card_name}\n\n"
        f"📜 *Толкование:* {data.card_description}"
    )

    telegram_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": data.user_id,
        "text": text,
        "parse_mode": "Markdown"
    }

    response = requests.post(telegram_url, json=payload)

    if response.status_code == 200:
        return {"status": "success"}
    else:
        return {"status": "error", "details": response.text}


app.mount("/frontend", StaticFiles(directory=BASE_DIR / "frontend"), name="frontend")


@app.get("/")
def read_root():
    return FileResponse(BASE_DIR / "frontend" / "index.html")