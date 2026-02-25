// State management
let currentWord = '';
let currentTopic = '';
let isListeningWord = false;
let isListeningTopic = false;
let isFetching = false;

// Speech Recognition setup (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}

// DOM Elements
const wordDisplay = document.getElementById('wordDisplay');
const topicDisplay = document.getElementById('topicDisplay');
const micBtn = document.getElementById('micBtn');
const topicBtn = document.getElementById('topicBtn');
const rhymeBtn = document.getElementById('rhymeBtn');
const resetBtn = document.getElementById('resetBtn');
const rhymeIcon = document.getElementById('rhymeIcon');
const loadingRing = document.getElementById('loadingRing');
const resultsSection = document.getElementById('resultsSection');
const resultsList = document.getElementById('resultsList');
const resultsTitle = document.getElementById('resultsTitle');

// Update UI based on state
function updateUI() {
    const hasWord = currentWord.trim().length > 0 && currentWord !== 'Listening...';

    if (currentWord === '') {
        wordDisplay.textContent = 'Tap Mic to speak';
        wordDisplay.style.color = 'var(--text-main)';
        wordDisplay.classList.remove('listening');
    } else {
        wordDisplay.textContent = currentWord;
        if (isListeningWord) {
            wordDisplay.classList.add('listening');
            wordDisplay.style.color = 'var(--text-muted)';
        } else {
            wordDisplay.classList.remove('listening');
            wordDisplay.style.color = 'var(--text-main)';
        }
    }

    if (currentTopic) {
        topicDisplay.classList.remove('hidden');
        topicDisplay.textContent = `Topic: \${currentTopic}`;
        if (isListeningTopic) {
            topicDisplay.classList.add('listening');
            topicDisplay.style.color = 'var(--text-muted)';
        } else {
            topicDisplay.classList.remove('listening');
            topicDisplay.style.color = 'var(--secondary)';
        }
    } else {
        topicDisplay.classList.add('hidden');
    }

    if (isListeningWord || isListeningTopic) {
        micBtn.classList.add('recording');
    } else {
        micBtn.classList.remove('recording');
    }

    if (hasWord && !isFetching) {
        resetBtn.classList.remove('hidden');
        topicBtn.disabled = false;
        rhymeBtn.disabled = false;
    } else {
        if (!hasWord) resetBtn.classList.add('hidden');
        topicBtn.disabled = true;
        rhymeBtn.disabled = true;
    }

    if (isFetching) {
        rhymeIcon.classList.add('hidden');
        loadingRing.classList.remove('hidden');
        resetBtn.classList.add('hidden');
    } else {
        rhymeIcon.classList.remove('hidden');
        loadingRing.classList.add('hidden');
    }
}

function stopAllListening() {
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
    isListeningWord = false;
    isListeningTopic = false;
}

// Event handlers
function startListeningWord() {
    if (!recognition) {
        alert("Your browser does not support the Web Speech API. Try Chrome.");
        return;
    }

    stopAllListening();
    isListeningWord = true;
    currentWord = 'Listening...';
    updateUI();

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }

        if (isListeningWord) currentWord = transcript;
        updateUI();

        // If user pauses, native API often flags isFinal on the iteration
        if (event.results[0].isFinal) {
            stopAllListening();
            updateUI();
        }
    };

    recognition.onend = () => {
        isListeningWord = false;
        if (currentWord === 'Listening...') currentWord = '';
        updateUI();
    };

    try { recognition.start(); } catch (e) {}
}

function startListeningTopic() {
    if (!recognition) return;

    stopAllListening();
    isListeningTopic = true;
    currentTopic = 'Listening...';
    updateUI();

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }

        if (isListeningTopic) currentTopic = transcript;
        updateUI();

        if (event.results[0].isFinal) {
            stopAllListening();
            updateUI();
        }
    };

    recognition.onend = () => {
        isListeningTopic = false;
        if (currentTopic === 'Listening...') currentTopic = '';
        updateUI();
    };

    try { recognition.start(); } catch (e) {}
}

function resetApp() {
    stopAllListening();
    currentWord = '';
    currentTopic = '';
    resultsSection.classList.add('hidden');
    resultsList.innerHTML = '';
    updateUI();
}

async function fetchRhymes() {
    if (!currentWord || isFetching) return;

    stopAllListening();
    isFetching = true;
    updateUI();

    resultsSection.classList.add('hidden');
    resultsList.innerHTML = '';

    const wordParam = encodeURIComponent(currentWord.trim());
    let url = `https://api.datamuse.com/words?rel_rhy=\${wordParam}`;

    if (currentTopic && currentTopic !== 'Listening...') {
        const topParam = encodeURIComponent(currentTopic.trim());
        url += `&topics=\${topParam}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        isFetching = false;
        updateUI();

        resultsTitle.textContent = `Rhymes for "\${currentWord}"`;
        resultsSection.classList.remove('hidden');

        if (data.length === 0) {
            resultsList.innerHTML = '<p style="color:var(--text-muted)">No rhymes found.</p>';
        } else {
            // Take up to 100 results so we don't blow up the DOM
            const limitedData = data.slice(0, 100);
            limitedData.forEach(item => {
                const chip = document.createElement('div');
                chip.classList.add('rhyme-chip');
                chip.textContent = item.word;
                resultsList.appendChild(chip);
            });
        }
    } catch (error) {
        isFetching = false;
        updateUI();
        alert('Network Error fetching rhymes.');
    }
}

// Bind listeners
micBtn.addEventListener('click', startListeningWord);
wordDisplay.addEventListener('click', startListeningWord);
topicBtn.addEventListener('click', startListeningTopic);
resetBtn.addEventListener('click', resetApp);
rhymeBtn.addEventListener('click', fetchRhymes);

// Initial state
updateUI();
