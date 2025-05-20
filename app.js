document.addEventListener('DOMContentLoaded', () => {
    // Game state variables
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let totalPairs = 0;
    let clickCount = 0;
    let gameActive = false;
    let timer;
    let timeLeft = 0;
    let powerUpAvailable = true;

    // DOM elements
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const difficultySelect = document.getElementById('difficulty');
    const themeToggle = document.getElementById('theme-toggle');
    const powerupBtn = document.getElementById('powerup-btn');
    const timerDisplay = document.getElementById('timer');
    const clicksDisplay = document.getElementById('clicks');
    const matchesDisplay = document.getElementById('matches');
    const pairsLeftDisplay = document.getElementById('pairs-left');
    const messageDisplay = document.getElementById('message');
    const resultPopup = document.getElementById('result-popup');
    const popupTitle = document.getElementById('popup-title');
    const popupPairs = document.getElementById('popup-pairs');
    const popupClicks = document.getElementById('popup-clicks');
    const popupTime = document.getElementById('popup-time');
    const popupClose = document.getElementById('popup-close');

    // Difficulty settings
    const difficultySettings = {
        easy: { pairs: 6, time: 90 },
        medium: { pairs: 9, time: 90 },
        hard: { pairs: 12, time: 90 },
    };

    // Initialize game
    initGame();

    // Event listeners
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    themeToggle.addEventListener('click', toggleTheme);
    powerupBtn.addEventListener('click', activatePowerUp);

    // Initialize game state
    function initGame() {
        gameContainer.innerHTML = '';
        messageDisplay.textContent = '';
        matchedPairs = 0;
        clickCount = 0;
        flippedCards = [];
        updateStatus();
    }

    // Start a new game
    async function startGame() {
        if (gameActive) return;

        gameActive = true;
        initGame();

        const difficulty = difficultySelect.value;
        totalPairs = difficultySettings[difficulty].pairs;
        timeLeft = difficultySettings[difficulty].time;

        // Clear any existing timer
        if (timer) clearInterval(timer);

        // Start timer
        timer = setInterval(() => {
            timeLeft--;
            updateStatus();

            if (timeLeft <= 0) {
                clearInterval(timer);
                gameOver(false);
            }
        }, 1000);

        // Fetch Pokémon data
        await fetchPokemonData(totalPairs);

        // Create cards
        createCards();

        updateStatus();
    }

    // Reset the current game
    function resetGame() {
        if (!gameActive) return;

        clearInterval(timer);
        gameActive = false;
        startGame();
    }

    // Fetch Pokémon data from API
    async function fetchPokemonData(pairsNeeded) {
        try {
            // First get the list of all Pokémon
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1500');
            const data = await response.json();

            // Get random Pokémon
            const allPokemon = data.results;
            const randomPokemon = [];

            // Ensure we get unique Pokémon
            while (randomPokemon.length < pairsNeeded) {
                const randomIndex = Math.floor(Math.random() * allPokemon.length);
                const pokemon = allPokemon[randomIndex];

                // Check if this Pokémon is already selected
                if (!randomPokemon.some(p => p.name === pokemon.name)) {
                    // Get details for this Pokémon
                    const detailsResponse = await fetch(pokemon.url);
                    const details = await detailsResponse.json();

                    // Get the official artwork image
                    let imageUrl = '';
                    if (details.sprites?.other?.['official-artwork']?.front_default) {
                        imageUrl = details.sprites.other['official-artwork'].front_default;
                    } else if (details.sprites?.front_default) {
                        imageUrl = details.sprites.front_default;
                    }

                    if (imageUrl) {
                        randomPokemon.push({
                            name: pokemon.name,
                            image: imageUrl,
                            id: details.id
                        });
                    }
                }
            }

            // Create pairs
            cards = [];
            randomPokemon.forEach(pokemon => {
                cards.push({ ...pokemon, matched: false });
                cards.push({ ...pokemon, matched: false });
            });

            // Shuffle cards
            shuffleCards();

        } catch (error) {
            console.error('Error fetching Pokémon data:', error);
            messageDisplay.textContent = 'Error loading Pokémon data. Please try again.';
            gameActive = false;
        }
    }

    // Shuffle the cards array
    function shuffleCards() {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    // Create card elements in the DOM
    function createCards() {
        gameContainer.innerHTML = '';

        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;

            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';

            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';

            const pokemonImage = document.createElement('img');
            pokemonImage.src = card.image;
            pokemonImage.alt = card.name;
            pokemonImage.loading = 'lazy'; // Better performance

            // In createCards():
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            // const backImage = document.createElement('img');
            // backImage.src = 'assets/images/pokecard-back.svg';
            // backImage.style.width = '100%';
            // cardBack.appendChild(backImage);

            cardFront.appendChild(pokemonImage);
            cardInner.appendChild(cardBack);
            cardInner.appendChild(cardFront);
            cardElement.appendChild(cardInner);

            cardElement.addEventListener('click', () => handleCardClick(index));
            gameContainer.appendChild(cardElement);
        });
    }

    // Handle card clicks
    function handleCardClick(index) {
        if (!gameActive || flippedCards.length >= 2 || cards[index].matched || flippedCards.includes(index)) {
            return;
        }

        // Flip the card
        flipCard(index);
        flippedCards.push(index);

        // If two cards are flipped, check for a match
        if (flippedCards.length === 2) {
            clickCount++;
            updateStatus();

            if (cards[flippedCards[0]].id === cards[flippedCards[1]].id) {
                // Match found
                cards[flippedCards[0]].matched = true;
                cards[flippedCards[1]].matched = true;
                matchedPairs++;

                // Check for win
                if (matchedPairs === totalPairs) {
                    gameOver(true);
                }

                flippedCards = [];
                updateStatus();
            } else {
                // No match, flip back after delay
                setTimeout(() => {
                    flippedCards.forEach(cardIndex => {
                        flipCard(cardIndex);
                    });
                    flippedCards = [];
                }, 1000);
            }
        }
    }

    // Flip a card
    function flipCard(index) {
        const cardElement = gameContainer.children[index];
        cardElement.classList.toggle('flipped');
    }

    function activatePowerUp() {
        if (!gameActive || !powerUpAvailable) return;

        powerUpAvailable = false;
        powerupBtn.disabled = true;

        // Add power-up class to container
        gameContainer.classList.add('powerup-active');

        // Flip back after 2 seconds
        setTimeout(() => {
            gameContainer.classList.remove('powerup-active');

            // Re-enable power-up after cooldown
            setTimeout(() => {
                powerUpAvailable = true;
                powerupBtn.disabled = false;
            }, 10000);
        }, 2000);
    }

    // Gameover
    function gameOver(win) {
        gameActive = false;
        clearInterval(timer);

        // Set popup content
        popupTitle.textContent = win ? ' You Won! ' : ' Game Over ';
        popupPairs.textContent = `${matchedPairs}/${totalPairs}`;
        popupClicks.textContent = clickCount;
        popupTime.textContent = timeLeft;

        // Style based on win/lose
        if (win) {
            popupTitle.classList.add('text-green-500');
            popupTitle.classList.remove('text-red-500');
        } else {
            popupTitle.classList.add('text-red-500');
            popupTitle.classList.remove('text-green-500');
        }

        // Show popup
        resultPopup.classList.remove('hidden');

        // Remove the old text message (if you had one)
        messageDisplay.textContent = '';
    }

    // Add event listener for the close button
    popupClose.addEventListener('click', () => {
        resultPopup.classList.add('hidden');
        resetGame();
    });

    // Update status display
    function updateStatus() {
        timerDisplay.textContent = timeLeft;
        clicksDisplay.textContent = clickCount;
        matchesDisplay.textContent = `${matchedPairs}/${totalPairs}`;
        pairsLeftDisplay.textContent = totalPairs - matchedPairs;
    }

    // Toggle between light and dark theme
    function toggleTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            themeToggle.textContent = 'Dark Mode';
        } else {
            html.classList.add('dark');
            themeToggle.textContent = 'Light Mode';
        }
    }
});