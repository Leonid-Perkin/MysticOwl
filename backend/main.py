import json
import os
import random
from pathlib import Path
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

BOT_TOKEN = os.getenv("BOT_TOKEN")

app = FastAPI(title="MysticOwl API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

CARDS_FILE = Path(__file__).resolve().parent / "cards.json"


class ShareRequest(BaseModel):
    user_id: int
    card_name: str
    card_description: str
    category_name: str
    card_image_path: str


@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    welcome_text = (
        f"🦉 *Приветствую тебя, путник, в обители MysticOwl!*\n\n"
        f"Я — Мудрая Сова, твой проводник в мире тайных знаков и древних карт Таро. "
        f"Выбери интересующую тебя сферу жизни и получи точное предсказание.\n\n"
        f"Нажми на кнопку ниже, чтобы запустить приложение и получить свой расклад! 🔮"
    )
    app_url = os.getenv("APP_URL", "https://localhost")
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔮 Открыть MysticOwl", web_app=WebAppInfo(url=app_url))]
    ])
    await message.answer(welcome_text, parse_mode="Markdown", reply_markup=keyboard)


@app.get("/api/fortune")
def get_random_card(category: str = Query("advice")):
    with open(CARDS_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)

    random_card = random.choice(cards)
    descriptions = random_card.get("descriptions", {})
    text_prediction = descriptions.get(category, descriptions.get("advice", "Толкование отсутствует."))

    return {
        "card": random_card,
        "description": text_prediction
    }


@app.post("/api/share")
def share_fortune(data: ShareRequest):
    if not BOT_TOKEN:
        return {"status": "error", "details": "Бот-токен не найден"}

    app_url = os.getenv("APP_URL", "")
    full_photo_url = f"{app_url}{data.card_image_path}"

    caption = (
        f"🦉 *Мудрая сова MysticOwl прислала ваш расклад!*\n\n"
        f"📋 *Категория:* {data.category_name}\n"
        f"🔮 *Карта дня:* {data.card_name}\n\n"
        f"📜 *Толкование:* {data.card_description}"
    )

    telegram_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"

    payload = {
        "chat_id": data.user_id,
        "photo": full_photo_url,
        "caption": caption,
        "parse_mode": "Markdown"
    }

    response = requests.post(telegram_url, json=payload)

    if response.status_code == 200:
        return {"status": "success"}
    else:
        print(f"❌ Ошибка Telegram API: {response.text}")
        return {"status": "error", "details": response.text}


@app.post("/webhook")
async def telegram_webhook(request: Request):
    update_data = await request.json()
    update = types.Update(**update_data)
    await dp.feed_update(bot, update)
    return {"status": "ok"}


@app.router.on_event("startup")
async def on_startup():
    app_url = os.getenv("APP_URL")
    if app_url:
        webhook_url = f"{app_url}/webhook"
        await bot.set_webhook(url=webhook_url)
        print(f"🤖 Вебхук успешно установлен на адрес: {webhook_url}")


app.mount("/frontend", StaticFiles(directory=BASE_DIR / "frontend"), name="frontend")


@app.get("/")
def read_root():
    return FileResponse(BASE_DIR / "frontend" / "index.html")