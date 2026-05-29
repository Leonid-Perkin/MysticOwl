import json
import os
import random
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import requests
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

BOT_TOKEN = os.getenv("BOT_TOKEN")
APP_URL = os.getenv("APP_URL")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
CARDS_FILE = Path(__file__).resolve().parent / "cards.json"

def reduce_to_22(num: int) -> int:
    """Нумерологическое сложение цифр, пока число не станет <= 22"""
    if num <= 22:
        return num
    while num > 22:
        num = sum(int(digit) for digit in str(num))
    return num

@asynccontextmanager
async def lifespan(app: FastAPI):
    if APP_URL:
        webhook_url = f"{APP_URL}/webhook"
        await bot.set_webhook(url=webhook_url, drop_pending_updates=True)
        print(f"🤖 [БОТ ВЕБХУК]: Успешно установлен на адрес: {webhook_url}")
    else:
        print("⚠️ [КРИТИЧЕСКАЯ ОШИБКА]: APP_URL не найден в .env! Бот не будет отвечать на /start")

    yield

    await bot.delete_webhook()
    print("🤖 [БОТ ВЕБХУК]: Вебхук удален.")


app = FastAPI(title="MysticOwl API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


class ShareRequest(BaseModel):
    user_id: int
    card_name: str
    card_description: str
    category_name: str
    card_image_path: str
    is_triple: Optional[bool] = False


@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    welcome_text = (
        f"🦉 *Приветствую тебя в обители MysticOwl!*\n\n"
        f"Я подготовила для тебя два режима гадания: индивидуальная *Карта дня* в разных сферах жизни и полноценный *Расклад времени из 3 карт*.\n\n"
        f"Нажми кнопку ниже, выбери нужную вкладку и приоткрой завесу тайны! 🔮"
    )

    current_app_url = APP_URL if APP_URL else "https://localhost"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔮 Запустить MysticOwl", web_app=WebAppInfo(url=current_app_url))]
    ])

    try:
        await message.answer(welcome_text, parse_mode="Markdown", reply_markup=keyboard)
        print(f"✅ Отправлено приветствие для пользователя {message.from_user.id}")
    except Exception as e:
        print(f"❌ Не удалось отправить сообщение в ТГ: {e}")


@app.post("/webhook")
async def telegram_webhook(request: Request):
    try:
        update_data = await request.json()
        update = types.Update(**update_data)
        await dp.feed_update(bot, update)
        return {"status": "ok"}
    except Exception as e:
        print(f"❌ Ошибка внутри вебхука при обработке команды: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/fortune")
def get_random_card(category: str = Query("advice")):
    with open(CARDS_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)
    random_card = random.choice(cards)
    descriptions = random_card.get("descriptions", {})
    text_prediction = descriptions.get(category, descriptions.get("advice", "Толкование отсутствует."))
    return {"card": random_card, "description": text_prediction}


@app.get("/api/fortune-triple")
def get_triple_cards():
    with open(CARDS_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)
    selected_cards = random.sample(cards, 3)
    return {
        "past": {"name": selected_cards[0]["name"], "image": selected_cards[0]["image"],
                 "desc": selected_cards[0]["descriptions"]["advice"]},
        "present": {"name": selected_cards[1]["name"], "image": selected_cards[1]["image"],
                    "desc": selected_cards[1]["descriptions"]["advice"]},
        "future": {"name": selected_cards[2]["name"], "image": selected_cards[2]["image"],
                   "desc": selected_cards[2]["descriptions"]["advice"]}
    }


class ShareRequest(BaseModel):
    user_id: int
    card_name: str
    card_description: str
    category_name: str
    card_image_path: str
    is_triple: Optional[bool] = False


@app.post("/api/share")
def share_fortune(data: ShareRequest):
    if not BOT_TOKEN:
        return {"status": "error", "details": "Бот-токен не найден"}

    # 🔥 Формируем красивый текст
    if "Матрица" in data.category_name:
        caption = (
            f"🌌 *{data.category_name}*\n"
            f"📋 *{data.card_name}:*\n\n"
            f"{data.card_description}\n\n"
            f"🦉 _Рассчитайте свой код души в приложении MysticOwl!_"
        )
    elif data.is_triple:
        caption = (
            f"🦉 *Мудрая сова MysticOwl сделала вам Расклад Дня!*\n\n"
            f"📋 *Тип гадания:* {data.category_name}\n\n"
            f"{data.card_description}\n\n"
            f"🔮 _Полное толкование и детали смотрите внутри приложения!_"
        )
    else:
        caption = (
            f"🦉 *Мудрая сова MysticOwl прислала ваш расклад!*\n\n"
            f"📋 *Категория:* {data.category_name}\n"
            f"🔮 *Карта дня:* {data.card_name}\n\n"
            f"📜 *Толкование:* {data.card_description}"
        )

    telegram_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"

    # Пытаемся найти файл локально на диске
    # data.card_image_path приходит как "/frontend/images/..." или "frontend/images/..."
    clean_path = data.card_image_path.lstrip("/")
    local_file_path = BASE_DIR / clean_path

    try:
        if local_file_path.exists() and local_file_path.is_file():
            # 📁 Способ 1: Отправляем файл напрямую байтами (Локальный метод — обходит любые лимиты Ngrok)
            print(f"📦 Отправка локального файла: {local_file_path}")
            with open(local_file_path, "rb") as photo_file:
                files = {"photo": photo_file}
                payload = {
                    "chat_id": data.user_id,
                    "caption": caption,
                    "parse_mode": "Markdown"
                }
                response = requests.post(telegram_url, data=payload, files=files)
        else:
            # 🌐 Способ 2: Если файл не найден (например, тестовая заглушка), шлем железную интернет-ссылку
            print(f"⚠️ Локальный файл не найден по пути {local_file_path}. Отправляем резервную ссылку.")
            backup_url = "https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/assets/aiogram.png"  # Или любая твоя живая ссылка
            payload = {
                "chat_id": data.user_id,
                "photo": backup_url,
                "caption": caption,
                "parse_mode": "Markdown"
            }
            response = requests.post(telegram_url, json=payload)

        response_json = response.json()
        if not response_json.get("ok"):
            print(f"❌ Ошибка Telegram API: {response_json}")
            return {"status": "error", "details": response_json}

        print("✅ Сообщение с фото успешно отправлено в чат!")
        return {"status": "success"}

    except Exception as e:
        print(f"❌ Критическая ошибка отправки: {e}")
        return {"status": "error", "details": str(e)}


app.mount("/frontend", StaticFiles(directory=BASE_DIR / "frontend"), name="frontend")


@app.get("/")
def read_root():
    return FileResponse(BASE_DIR / "frontend" / "index.html")


@app.get("/api/matrix")
def calculate_matrix(birth_date: str = Query(...)):
    # birth_date приходит в формате YYYY-MM-DD
    try:
        parts = birth_date.split("-")
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
    except Exception:
        return {"status": "error", "message": "Неверный формат даты"}

    # 1. Расчет базовых энергий
    point_a = reduce_to_22(day)
    point_b = reduce_to_22(month)

    # Для года складываем все его цифры
    year_sum = sum(int(d) for d in str(year))
    point_v = reduce_to_22(year_sum)

    point_g = reduce_to_22(point_a + point_b + point_v)
    point_d = reduce_to_22(point_a + point_b + point_v + point_g)

    # Загружаем карты, чтобы сопоставить числа с их именами
    with open(CARDS_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)

    # Карта соответствует индексу или полю id.
    # У нас в cards.json лежит массив из 22 карт. Создадим удобный словарь {номер_аркана: карта}
    cards_dict = {}
    for i, card in enumerate(cards):
        cards_dict[i] = card  # Индексы 0-21 соответствуют Арканам 0-21 (Мир - 21).
        # Если у нас выпал 22, в системе Ладини 22-й аркан — это Дурак (который у нас имеет индекс 0).

    def get_card_info(val):
        target_idx = 0 if val == 22 else val
        card = cards_dict.get(target_idx, cards[0])
        return {"num": val, "name": card["name"], "desc": card["descriptions"]["advice"]}

    return {
        "personality": get_card_info(point_a),
        "talents": get_card_info(point_b),
        "finance": get_card_info(point_v),
        "karma": get_card_info(point_g),
        "comfort": get_card_info(point_d)
    }