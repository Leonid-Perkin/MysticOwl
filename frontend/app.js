const tg = window.Telegram.WebApp;
tg.expand();

const greetingElement = document.getElementById('user-greeting');
const predictionBox = document.getElementById('prediction-box');
const cardName = document.getElementById('card-name');
const cardDesc = document.getElementById('card-desc');
const fortuneBtn = document.getElementById('fortune-btn');
const shareBtn = document.getElementById('share-btn');
const owlLogo = document.querySelector('.owl-logo');

// Элементы переключения вкладок (Режимов)
const tabButtons = document.querySelectorAll('.tab-btn');
const modeContents = document.querySelectorAll('.mode-content');

// Элементы Одиночного режима
const cardContainerOne = document.getElementById('card-container');
const categoryButtons = document.querySelectorAll('.cat-btn');

// Элементы Тройного режима
const card31 = document.getElementById('card3-1');
const card32 = document.getElementById('card3-2');
const card33 = document.getElementById('card3-3');

// Элементы Матрицы
const birthDateInput = document.getElementById('birth-date');

let currentMode = 'one-card-mode';
let selectedCategory = 'advice';
let singleCardData = null;
let tripleCardsData = null;
let matrixData = null;

// Логика переключения Главных Вкладок
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        currentMode = button.getAttribute('data-tab');

        modeContents.forEach(content => {
            if (content.id === currentMode) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });

        predictionBox.classList.add('hidden');

        if (currentMode === 'matrix-mode') {
            fortuneBtn.innerText = "Рассчитать Матрицу Судьбы";
        } else if (currentMode === 'three-cards-mode') {
            fortuneBtn.innerText = "Получить расклад (3 карты)";
        } else {
            fortuneBtn.innerText = "Получить расклад";
        }
    });
});

// Внутренние категории карты дня
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedCategory = button.getAttribute('data-category');
    });
});

// Имя пользователя
const user = tg.initDataUnsafe?.user;
greetingElement.innerText = user && user.first_name ? `Привет, ${user.first_name}! Пришёл узнать свою судьбу?` : "Привет! Пришёл узнать свою судьбу?";

// Кнопка действия
fortuneBtn.addEventListener('click', async () => {
    fortuneBtn.disabled = true;
    predictionBox.classList.add('hidden');
    owlLogo.classList.add('owl-thinking');

    if (currentMode === 'one-card-mode') {
        fortuneBtn.innerText = "Мудрая сова думает...";
        cardContainerOne.classList.remove('flip');
        cardContainerOne.innerHTML = `<div class="card-back">🔮</div>`;

        try {
            const response = await fetch(`/api/fortune?category=${selectedCategory}`);
            const data = await response.json();
            singleCardData = data; tripleCardsData = null; matrixData = null;

            await new Promise(r => setTimeout(r, 1000));
            cardContainerOne.classList.add('flip');

            setTimeout(() => {
                cardContainerOne.innerHTML = `<img src="${data.card.image}" class="card-img">`;
                cardName.innerText = data.card.name;
                cardDesc.innerText = data.description;
                predictionBox.classList.remove('hidden');
                owlLogo.classList.remove('owl-thinking');
                fortuneBtn.disabled = false;
                fortuneBtn.innerText = "Получить другой расклад";
            }, 300);
        } catch (e) { alert("Ошибка сети"); fortuneBtn.disabled = false; owlLogo.classList.remove('owl-thinking'); }

    } else if (currentMode === 'three-cards-mode') {
        fortuneBtn.innerText = "Мудрая сова думает...";
        [card31, card32, card33].forEach(c => c.classList.remove('flip'));
        card31.innerHTML = `<div class="card-back">📜</div>`;
        card32.innerHTML = `<div class="card-back">🔮</div>`;
        card33.innerHTML = `<div class="card-back">✨</div>`;

        try {
            const response = await fetch('/api/fortune-triple');
            const data = await response.json();
            tripleCardsData = data; singleCardData = null; matrixData = null;

            await new Promise(r => setTimeout(r, 1000));

            card31.classList.add('flip');
            card31.innerHTML = `<img src="${data.past.image}" class="card-img">`;

            setTimeout(() => {
                card32.classList.add('flip');
                card32.innerHTML = `<img src="${data.present.image}" class="card-img">`;
            }, 300);

            setTimeout(() => {
                card33.classList.add('flip');
                card33.innerHTML = `<img src="${data.future.image}" class="card-img">`;

                cardName.innerText = "Ваш расклад времени";
                cardDesc.innerHTML = `
                    <strong>Прошлое:</strong> ${data.past.name}<br>${data.past.desc}<br><br>
                    <strong>Настоящее:</strong> ${data.present.name}<br>${data.present.desc}<br><br>
                    <strong>Будущее:</strong> ${data.future.name}<br>${data.future.desc}
                `;
                predictionBox.classList.remove('hidden');
                owlLogo.classList.remove('owl-thinking');
                fortuneBtn.disabled = false;
                fortuneBtn.innerText = "Сделать новый расклад";
            }, 600);
        } catch (e) { alert("Ошибка сети"); fortuneBtn.disabled = false; owlLogo.classList.remove('owl-thinking'); }

    } else if (currentMode === 'matrix-mode') {
        const dateVal = birthDateInput.value;
        if (!dateVal) {
            alert("Пожалуйста, выберите дату своего рождения!");
            owlLogo.classList.remove('owl-thinking');
            fortuneBtn.disabled = false;
            return;
        }

        fortuneBtn.innerText = "Вычисляю коды души...";

        try {
            const response = await fetch(`/api/matrix?birth_date=${dateVal}`);
            const data = await response.json();
            matrixData = data; singleCardData = null; tripleCardsData = null;

            await new Promise(r => setTimeout(r, 1000));

            cardName.innerText = `Матрица Судьбы (${dateVal.split('-').reverse().join('.')})`;
            cardDesc.innerHTML = `
                <div class="matrix-result-item"><strong>🧬 Личность (Точка А): Аркан ${data.personality.num} — ${data.personality.name}</strong><br>${data.personality.desc}</div>
                <div class="matrix-result-item"><strong>✨ Таланты (Точка Б): Аркан ${data.talents.num} — ${data.talents.name}</strong><br>${data.talents.desc}</div>
                <div class="matrix-result-item"><strong>💰 Финансы (Точка В): Аркан ${data.finance.num} — ${data.finance.name}</strong><br>${data.finance.desc}</div>
                <div class="matrix-result-item"><strong>📜 Карма (Точка Г): Аркан ${data.karma.num} — ${data.karma.name}</strong><br>${data.karma.desc}</div>
                <div class="matrix-result-item"><strong>🏰 Зона комфорта (Точка Д): Аркан ${data.comfort.num} — ${data.comfort.name}</strong><br>${data.comfort.desc}</div>
            `;
            predictionBox.classList.remove('hidden');
            owlLogo.classList.remove('owl-thinking');
            fortuneBtn.disabled = false;
            fortuneBtn.innerText = "Рассчитать другую дату";
        } catch (e) { alert("Ошибка сети"); fortuneBtn.disabled = false; owlLogo.classList.remove('owl-thinking'); }
    }
});

// Кнопка отправки результатов в чат (Шеринг)
shareBtn.addEventListener('click', async () => {
    if (!user?.id) {
        alert("ID пользователя не найден.");
        return;
    }
    shareBtn.disabled = true;
    shareBtn.innerText = "Отправка...";

    let payload = { user_id: user.id };

    if (matrixData) {
        payload.is_triple = true;
        payload.category_name = "Расчет Матрицы Судьбы 🌌";
        payload.card_name = "Код Души по дате рождения";
        // Чистый текст без HTML тегов, чтобы Markdown в ТГ не ломался
        payload.card_description =
            `• Личность: Аркан ${matrixData.personality.num} (${matrixData.personality.name})\n` +
            `• Таланты: Аркан ${matrixData.talents.num} (${matrixData.talents.name})\n` +
            `• Финансы: Аркан ${matrixData.finance.num} (${matrixData.finance.name})\n` +
            `• Карма: Аркан ${matrixData.karma.num} (${matrixData.karma.name})\n` +
            `• Комфорт: Аркан ${matrixData.comfort.num} (${matrixData.comfort.name})`;

        // 🔥 ИСПРАВЛЕНО: Теперь имя файла строго совпадает с диском: "10-WheelOfFortune.jpg"
        payload.card_image_path = "/frontend/images/10-WheelOfFortune.jpg";

    } else if (singleCardData) {
        const catNames = {'advice': 'Совет дня 🦉', 'love': 'Расклад на любовь ❤️', 'finance': 'Расклад на финансы 💰'};
        payload.is_triple = false;
        payload.card_name = singleCardData.card.name;
        payload.card_description = cardDesc.innerText; // забирает чистый текст из блока
        payload.category_name = catNames[selectedCategory] || 'Расклад Таро';
        payload.card_image_path = singleCardData.card.image;

    } else if (tripleCardsData) {
        payload.is_triple = true;
        payload.category_name = "Полный расклад дня (Прошлое / Настоящее / Будущее) 🔮";
        payload.card_name = "Прошлое, Настоящее и Будущее";
        payload.card_description = `• Прошлое: ${tripleCardsData.past.name}\n• Настоящее: ${tripleCardsData.present.name}\n• Будущее: ${tripleCardsData.future.name}`;
        payload.card_image_path = tripleCardsData.present.image;
    }

    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            shareBtn.innerText = "✅ Отправлено!";
            setTimeout(() => { tg.close(); }, 1500);
        } else {
            alert("Ошибка сервера при отправке.");
            shareBtn.disabled = false;
            shareBtn.innerText = "📥 Отправить результат в чат";
        }
    } catch (e) {
        alert("Ошибка сети");
        shareBtn.disabled = false;
        shareBtn.innerText = "📥 Отправить результат в чат";
    }
});