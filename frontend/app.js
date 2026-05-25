const tg = window.Telegram.WebApp;
tg.expand();

const greetingElement = document.getElementById('user-greeting');
const predictionBox = document.getElementById('prediction-box');
const cardName = document.getElementById('card-name');
const cardDesc = document.getElementById('card-desc');
const fortuneBtn = document.getElementById('fortune-btn');
const shareBtn = document.getElementById('share-btn');
const owlLogo = document.querySelector('.owl-logo');

const tabButtons = document.querySelectorAll('.tab-btn');
const modeContents = document.querySelectorAll('.mode-content');

const cardContainerOne = document.getElementById('card-container');
const categoryButtons = document.querySelectorAll('.cat-btn');

const card31 = document.getElementById('card3-1');
const card32 = document.getElementById('card3-2');
const card33 = document.getElementById('card3-3');

let currentMode = 'one-card-mode';
let selectedCategory = 'advice';
let singleCardData = null;
let tripleCardsData = null;

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
    });
});

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedCategory = button.getAttribute('data-category');
    });
});

const user = tg.initDataUnsafe?.user;
greetingElement.innerText = user && user.first_name ? `Привет, ${user.first_name}! Пришёл узнать свою судьбу?` : "Привет! Пришёл узнать свою судьбу?";

fortuneBtn.addEventListener('click', async () => {
    fortuneBtn.disabled = true;
    fortuneBtn.innerText = "Мудрая сова думает...";
    predictionBox.classList.add('hidden');
    owlLogo.classList.add('owl-thinking');

    if (currentMode === 'one-card-mode') {
        cardContainerOne.classList.remove('flip');
        cardContainerOne.innerHTML = `<div class="card-back">🔮</div>`;

        try {
            const response = await fetch(`/api/fortune?category=${selectedCategory}`);
            const data = await response.json();
            singleCardData = data;
            tripleCardsData = null;

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
        } catch (e) { alert("Ошибка сети"); owlLogo.classList.remove('owl-thinking'); fortuneBtn.disabled = false; }

    } else {
        [card31, card32, card33].forEach(c => c.classList.remove('flip'));
        card31.innerHTML = `<div class="card-back">01</div>`;
        card32.innerHTML = `<div class="card-back">02</div>`;
        card33.innerHTML = `<div class="card-back">03</div>`;

        try {
            const response = await fetch('/api/fortune-triple');
            const data = await response.json();
            tripleCardsData = data;
            singleCardData = null;

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

        } catch (e) { alert("Ошибка сети"); owlLogo.classList.remove('owl-thinking'); fortuneBtn.disabled = false; }
    }
});

shareBtn.addEventListener('click', async () => {
    if (!user?.id) return;
    shareBtn.disabled = true;
    shareBtn.innerText = "Отправка...";

    let payload = { user_id: user.id };

    if (singleCardData) {
        const catNames = {'advice': 'Совет дня 🦉', 'love': 'Расклад на любовь ❤️', 'finance': 'Расклад на финансы 💰'};
        payload.is_triple = false;
        payload.card_name = singleCardData.card.name;
        payload.card_description = cardDesc.innerText;
        payload.category_name = catNames[selectedCategory];
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
        }
    } catch (e) { alert("Ошибка"); shareBtn.disabled = false; }
});