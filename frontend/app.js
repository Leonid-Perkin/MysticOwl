const tg = window.Telegram.WebApp;
tg.expand();

const greetingElement = document.getElementById('user-greeting');
const cardContainer = document.getElementById('card-container');
const predictionBox = document.getElementById('prediction-box');
const cardName = document.getElementById('card-name');
const cardDesc = document.getElementById('card-desc');
const fortuneBtn = document.getElementById('fortune-btn');
const shareBtn = document.getElementById('share-btn');

const owlLogo = document.querySelector('.owl-logo');

let currentCard = null;

const user = tg.initDataUnsafe?.user;
if (user && user.first_name) {
    greetingElement.innerText = `Привет, ${user.first_name}! Пришёл узнать свою судьбу?`;
} else {
    greetingElement.innerText = "Привет! Пришёл узнать свою судьбу?";
}

fortuneBtn.addEventListener('click', async () => {
    fortuneBtn.disabled = true;
    fortuneBtn.innerText = "Мудрая сова думает...";
    predictionBox.classList.add('hidden');

    cardContainer.classList.remove('flip');
    cardContainer.innerHTML = `<div class="card-back">🔮</div>`;

    owlLogo.classList.add('owl-thinking');

    try {
        const response = await fetch('/api/fortune');
        if (!response.ok) throw new Error('Ошибка сети');

        currentCard = await response.json();

        await new Promise(resolve => setTimeout(resolve, 1000));

        cardContainer.classList.add('flip');

        setTimeout(() => {
            cardContainer.innerHTML = `<img src="${currentCard.image}" alt="${currentCard.name}" class="card-img">`;
            cardName.innerText = currentCard.name;
            cardDesc.innerText = currentCard.description;

            predictionBox.classList.remove('hidden');

            owlLogo.classList.remove('owl-thinking');

            fortuneBtn.disabled = false;
            fortuneBtn.innerText = "Получить другой расклад";
        }, 300);

    } catch (error) {
        console.error(error);
        alert("Связь с совой прервалась.");

        owlLogo.classList.remove('owl-thinking');

        fortuneBtn.disabled = false;
        fortuneBtn.innerText = "Получить расклад дня";
    }
});

shareBtn.addEventListener('click', async () => {
    if (!currentCard || !user?.id) {
        alert("Не удалось определить пользователя или карту.");
        return;
    }

    shareBtn.disabled = true;
    shareBtn.innerText = "Отправка...";

    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                card_name: currentCard.name,
                card_description: currentCard.description
            })
        });

        if (response.ok) {
            shareBtn.innerText = "✅ Отправлено в чат!";
            setTimeout(() => { tg.close(); }, 1500);
        } else {
            throw new Error('Ошибка сервера при отправке');
        }
    } catch (error) {
        console.error(error);
        alert("Не удалось отправить сообщение. Убедитесь, что вы запустили бота.");
        shareBtn.disabled = false;
        shareBtn.innerText = "📥 Отправить результат в чат";
    }
});