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
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
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
    const gameControlBtn = document.getElementById('game-control-btn');

    // Difficulty settings

    // Track current difficulty
    let currentDifficulty = 'easy'; // Default to easy

    // Initialize difficulty buttons
    function initDifficultyButtons() {
        // Set initial active button
        updateDifficultyButtons();

        // Add event listeners
        easyBtn.addEventListener('click', () => setDifficulty('easy'));
        mediumBtn.addEventListener('click', () => setDifficulty('medium'));
        hardBtn.addEventListener('click', () => setDifficulty('hard'));
    }

    function setDifficulty(difficulty) {
        currentDifficulty = difficulty;
        updateDifficultyButtons();

        // If game is active, reset with new difficulty
        if (gameActive) {
            resetGame();
        }
    }

    function updateDifficultyButtons() {
        // Reset all buttons
        easyBtn.classList.remove('ring-2', 'ring-white', 'ring-offset-2');
        mediumBtn.classList.remove('ring-2', 'ring-white', 'ring-offset-2');
        hardBtn.classList.remove('ring-2', 'ring-white', 'ring-offset-2');
        
        // Highlight active button
        switch(currentDifficulty) {
            case 'easy':
                easyBtn.classList.add('ring-2', 'ring-white', 'ring-offset-2');
                break;
            case 'medium':
                mediumBtn.classList.add('ring-2', 'ring-white', 'ring-offset-2');
                break;
            case 'hard':
                hardBtn.classList.add('ring-2', 'ring-white', 'ring-offset-2');
                break;
        }
    }

    const difficultySettings = {
        easy: { 
            pairs: 6, 
            time: 90,
            color: 'green-500' 
        },
        medium: { 
            pairs: 9, 
            time: 90,
            color: 'yellow-500'
        },
        hard: { 
            pairs: 12, 
            time: 90,
            color: 'red-500'
        }
    };

    // Initialize theme
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggle.textContent = 'Light Mode';
        } else {
            document.documentElement.classList.remove('dark');
            themeToggle.textContent = 'Dark Mode';
        }
    }

    // Initialize game state
    function initGame() {
        gameContainer.innerHTML = '';
        messageDisplay.textContent = '';
        matchedPairs = 0;
        clickCount = 0;
        flippedCards = [];
        updateStatus();
        updateButtonState(); // Update button on init
    }

    function updateButtonState() {
        if (gameActive) {
            gameControlBtn.textContent = 'Reset';
            gameControlBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            gameControlBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        } else {
            gameControlBtn.textContent = 'Start Game';
            gameControlBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            gameControlBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        }
    }


    // Start a new game
    async function startGame() {
        if (gameActive) return;

        gameActive = true;
        updateButtonState();
        initGame();

        totalPairs = difficultySettings[currentDifficulty].pairs;
        timeLeft = difficultySettings[currentDifficulty].time;

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
        updateButtonState();
        initGame(); // Just reset, don't auto-start
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
            console.error('Error:', error);
            messageDisplay.textContent = 'Failed to load Pokémon. Retrying...';
            // Auto-retry after delay
            setTimeout(() => fetchPokemonData(pairsNeeded), 2000);
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

            pokemonImage.onerror = () => { 
                // Fallback if image fails to load
                pokemonImage.src = 'assets/images/fallback.png';
            }

            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';


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

    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');

        themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Add this initialization function
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggle.textContent = 'Light Mode';
        } else {
            document.documentElement.classList.remove('dark');
            themeToggle.textContent = 'Dark Mode';
        }
    }

    // Event listeners
    themeToggle.addEventListener('click', toggleTheme);
    powerupBtn.addEventListener('click', activatePowerUp);
    gameControlBtn.addEventListener('click', () => {
        gameActive ? resetGame() : startGame();
    });
    popupClose.addEventListener('click', () => {
        resultPopup.classList.add('hidden');
        resetGame();
    });

    // Initialization
    initTheme();
    initDifficultyButtons();
    initGame();

});