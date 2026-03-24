// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyCpRMA0vz4vco5MJejPSqcCoethkgloacY",
    authDomain: "capsuletype-18fb2.firebaseapp.com",
    projectId: "capsuletype-18fb2",
    storageBucket: "capsuletype-18fb2.firebasestorage.app",
    messagingSenderId: "989240930919",
    appId: "1:989240930919:web:58842f6c3deb8159995ac2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = '';
let currentUserId = '';
let highScore = 0;

// --- USER AUTHENTICATION LOGIC ---
let authMode = 'signup';

// Listen for Login/Logout state changes automatically
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is logged in
        currentUser = user.displayName;
        currentUserId = user.uid;
        document.getElementById('user-greeting').innerText = `Hey, ${currentUser}`;
        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('logout-btn').style.display = 'inline-block';
        
        // Load their personal best from local storage (or default to 0)
        highScore = parseInt(localStorage.getItem(`pb_${currentUserId}`)) || 0;
        document.getElementById('pb-wpm').innerText = highScore;
    } else {
        // User is logged out
        currentUser = '';
        currentUserId = '';
        document.getElementById('auth-modal').classList.add('active');
        document.getElementById('user-greeting').innerText = '';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('pb-wpm').innerText = '0';
    }
});

function switchAuthTab(mode) {
    authMode = mode;
    document.getElementById('auth-error').style.display = 'none';
    
    const signupTab = document.getElementById('tab-signup');
    const loginTab = document.getElementById('tab-login');
    const title = document.getElementById('auth-title');
    const actionBtn = document.getElementById('auth-action-btn');

    if (mode === 'signup') {
        signupTab.style.borderColor = 'var(--primary-accent)';
        signupTab.style.background = 'var(--btn-hover)';
        loginTab.style.borderColor = 'transparent';
        loginTab.style.background = 'var(--btn-bg)';
        title.innerText = 'Create Account';
        actionBtn.innerText = 'Sign Up';
    } else {
        loginTab.style.borderColor = 'var(--primary-accent)';
        loginTab.style.background = 'var(--btn-hover)';
        signupTab.style.borderColor = 'transparent';
        signupTab.style.background = 'var(--btn-bg)';
        title.innerText = 'Welcome Back';
        actionBtn.innerText = 'Log In';
    }
}

function handleAuth() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error');

    if (!username || !password) {
        errorEl.innerText = "Username and password are required!";
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.innerText = "Password must be at least 6 characters.";
        errorEl.style.display = 'block';
        return;
    }

    const dummyEmail = `${username.toLowerCase()}@capsuletype.game`;
    errorEl.style.display = 'none';
    document.getElementById('auth-action-btn').innerText = 'Loading...';

    if (authMode === 'signup') {
        auth.createUserWithEmailAndPassword(dummyEmail, password)
            .then(async (userCredential) => {
                // Wait for Firebase to securely attach the Username
                await userCredential.user.updateProfile({ displayName: username });
                
                // Manually lock in the user data so it's ready for the leaderboard
                currentUser = username;
                currentUserId = userCredential.user.uid;
                document.getElementById('user-greeting').innerText = `Hey, ${currentUser}`;
                document.getElementById('auth-action-btn').innerText = 'Sign Up';
                document.getElementById('auth-modal').classList.remove('active');
            })
            .catch((error) => {
                document.getElementById('auth-action-btn').innerText = 'Sign Up';
                if (error.code === 'auth/email-already-in-use') {
                    errorEl.innerText = "Username already taken! Try another or Log In.";
                } else {
                    errorEl.innerText = error.message;
                }
                errorEl.style.display = 'block';
            });
    } else {
        auth.signInWithEmailAndPassword(dummyEmail, password)
            .then(() => {
                document.getElementById('auth-action-btn').innerText = 'Log In';
                document.getElementById('auth-modal').classList.remove('active');
            })
            .catch((error) => {
                document.getElementById('auth-action-btn').innerText = 'Log In';
                errorEl.innerText = "Incorrect Username or Password.";
                errorEl.style.display = 'block';
            });
    }
}

function logoutUser() {
    auth.signOut();
}

// --- FIREBASE LEADERBOARD LOGIC ---
async function saveScoreToFirebase(wpm) {
    if (!currentUser || !currentUserId) return;
    try {
        // We use their unique secure UID as the document ID now!
        await db.collection("leaderboard").doc(currentUserId).set({
            name: currentUser,
            wpm: wpm,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Error saving to leaderboard: ", e);
    }
}

async function openLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('active');
    const lbList = document.getElementById('leaderboard-list');
    lbList.innerHTML = '<div style="text-align: center; color: var(--text-faded); padding: 20px;">Fetching global scores...</div>';

    try {
        const querySnapshot = await db.collection("leaderboard").orderBy("wpm", "desc").limit(10).get();
        lbList.innerHTML = '';
        let rank = 1;
        
        if(querySnapshot.empty) {
            lbList.innerHTML = '<div style="text-align: center; color: var(--text-faded); padding: 20px;">No scores yet. Be the first!</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            lbList.innerHTML += `
                <div class="lb-item">
                    <span class="lb-rank">#${rank}</span>
                    <span class="lb-name">${data.name}</span>
                    <span class="lb-score">${data.wpm} WPM</span>
                </div>
            `;
            rank++;
        });
    } catch (e) {
        lbList.innerHTML = '<div style="text-align: center; color: var(--text-wrong); padding: 20px;">Failed to load leaderboard.</div>';
    }
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.remove('active');
}

// --- ON LOAD (THEMES) ---
window.onload = () => {
    if (localStorage.getItem('capsule_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerText = '☀️';
    }
};

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('capsule_theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
}

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTypeSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + Math.random() * 100, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}

function playTicSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.02);
}

// --- Roller Logic ---
const roller = document.getElementById('time-roller');
const customTimes = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300];
let currentRollerValue = 15;
let lastScrollIndex = 0;

if (roller) {
    customTimes.forEach(t => {
        let el = document.createElement('div');
        el.className = 'roller-item';
        el.innerText = t + 's';
        roller.appendChild(el);
    });

    roller.addEventListener('scroll', () => {
        const index = Math.round(roller.scrollTop / 40);
        if (index !== lastScrollIndex && index >= 0 && index < customTimes.length) {
            lastScrollIndex = index;
            currentRollerValue = customTimes[index];
            playTicSound();
            
            document.querySelectorAll('.roller-item').forEach((el, i) => {
                el.style.opacity = i === index ? '1' : '0.3';
                el.style.transform = i === index ? 'scale(1.2)' : 'scale(1)';
                el.style.color = i === index ? 'var(--text-main)' : 'var(--text-faded)';
            });
        }
    });
}

function openRoller() {
    document.getElementById('roller-modal').classList.add('active');
    roller.scrollTop = 0;
    setTimeout(() => { roller.dispatchEvent(new Event('scroll')); }, 50);
}

function confirmCustomTime() {
    document.getElementById('roller-modal').classList.remove('active');
    handleTimeClick(currentRollerValue, currentRollerValue + 's');
}

// --- UI Flow & Animation ---
function handleTimeClick(time, label) {
    selectedTime = time;
    document.getElementById('initial-time-buttons').style.display = 'none';
    document.getElementById('selected-time-badge').innerText = label;
    
    const sideContainer = document.getElementById('other-times-container');
    sideContainer.innerHTML = '';
    const options = [{t: 30, l: '30s'}, {t: 60, l: '1m'}, {t: 120, l: '2m'}, {t: 0, l: 'Custom'}];
    
    options.forEach(opt => {
        if (opt.t !== time) {
            let btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerText = opt.l;
            btn.onclick = () => opt.t === 0 ? openRoller() : handleTimeClick(opt.t, opt.l);
            sideContainer.appendChild(btn);
        }
    });

    document.getElementById('expanded-setup').style.display = 'flex';
}

function startSetup(difficulty) {
    selectedDiff = difficulty;
    initTest();
}

// --- Core Engine & Caret Math ---
const words = {
    easy: ["cat", "dog", "run", "sun", "fun", "day", "red", "big", "box", "car", "fly", "sky", "pen", "cup", "tea"],
    normal: ["about", "would", "these", "other", "words", "could", "write", "first", "water", "after", "where", "right", "think", "three", "years", "place", "sound", "great", "again", "still"],
    hard: ["acknowledgment", "breathtaking", "characteristic", "development", "extraordinary", "fundamental", "generation", "hypothesis", "intelligence", "jurisdiction", "knowledgeable", "magnificent", "nevertheless", "opportunity", "philosophical"]
};

let selectedTime = 60, selectedDiff = 'normal', timeLeft = 60;
let timer = null, isTyping = false, currentWordIndex = 0, currentLetterIndex = 0;
let totalTypedChars = 0, correctChars = 0, wordElements = [];

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function generateText() {
    const container = document.getElementById('text-display');
    container.innerHTML = '';
    container.style.transform = 'translateY(0px)';
    wordElements = [];
    
    const dict = words[selectedDiff];
    for (let i = 0; i < 100; i++) {
        const randomWord = dict[Math.floor(Math.random() * dict.length)];
        const wordEl = document.createElement('div');
        wordEl.className = 'word';
        
        for (let char of randomWord) {
            const letterEl = document.createElement('span');
            letterEl.className = 'letter';
            letterEl.innerText = char;
            wordEl.appendChild(letterEl);
        }
        
        container.appendChild(wordEl);
        wordElements.push(wordEl);
    }
    if (wordElements.length > 0) wordElements[0].classList.add('active');
}

function updateCaret() {
    const caret = document.getElementById('caret');
    const activeWord = wordElements[currentWordIndex];
    if (!activeWord) return;
    
    caret.style.opacity = '1';
    const containerRect = document.querySelector('.typing-box').getBoundingClientRect();
    let targetRect;

    if (currentLetterIndex === 0) {
        targetRect = activeWord.children[0].getBoundingClientRect();
        caret.style.transform = `translate(${targetRect.left - containerRect.left - 1}px, ${targetRect.top - containerRect.top + 5}px)`;
    } else {
        targetRect = activeWord.children[currentLetterIndex - 1].getBoundingClientRect();
        caret.style.transform = `translate(${targetRect.right - containerRect.left + 1}px, ${targetRect.top - containerRect.top + 5}px)`;
    }

    const textDisplay = document.getElementById('text-display');
    const wordTop = activeWord.offsetTop;
    if (wordTop > 40) { textDisplay.style.transform = `translateY(-${wordTop}px)`; }
}

function initTest() {
    switchScreen('test-screen');
    timeLeft = selectedTime;
    isTyping = false;
    currentWordIndex = 0;
    currentLetterIndex = 0;
    totalTypedChars = 0;
    correctChars = 0;
    
    document.getElementById('time-display').innerText = timeLeft;
    document.getElementById('wpm-display').innerText = '0';
    document.getElementById('acc-display').innerText = '100';
    document.getElementById('caret').style.opacity = '0';

    generateText();
    setTimeout(updateCaret, 50); 
    document.addEventListener('keydown', handleTyping);
}

function startTimer() {
    if (isTyping) return;
    isTyping = true;
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('time-display').innerText = timeLeft;
        const timeElapsed = selectedTime - timeLeft;
        if (timeElapsed > 0) {
            const wpm = Math.round((correctChars / 5) / (timeElapsed / 60));
            document.getElementById('wpm-display').innerText = wpm;
        }
        if (timeLeft <= 0) endTest();
    }, 1000);
}

function handleTyping(e) {
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key)) return;
    if (e.key === ' ') e.preventDefault();
    if (timeLeft <= 0) return;
    
    startTimer();
    playTypeSound(); 

    const activeWord = wordElements[currentWordIndex];
    if (!activeWord) return;
    const letters = activeWord.children;

    if (e.key === 'Backspace') {
        if (currentLetterIndex > 0) {
            currentLetterIndex--;
            letters[currentLetterIndex].classList.remove('correct', 'wrong');
        }
    } else if (e.key === ' ') {
        if (currentLetterIndex > 0) {
            activeWord.classList.remove('active');
            currentWordIndex++;
            currentLetterIndex = 0;
            if (wordElements[currentWordIndex]) {
                wordElements[currentWordIndex].classList.add('active');
            }
        }
    } else {
        if (currentLetterIndex < letters.length) {
            const expectedChar = letters[currentLetterIndex].innerText;
            totalTypedChars++;
            if (e.key === expectedChar) {
                letters[currentLetterIndex].classList.add('correct');
                correctChars++;
            } else {
                letters[currentLetterIndex].classList.add('wrong');
            }
            currentLetterIndex++;
        }
    }

    const acc = totalTypedChars === 0 ? 100 : Math.round((correctChars / totalTypedChars) * 100);
    document.getElementById('acc-display').innerText = acc;
    updateCaret();
}

function endTest() {
    clearInterval(timer);
    document.removeEventListener('keydown', handleTyping);
    
    const timeElapsed = selectedTime;
    const finalWpm = Math.round((correctChars / 5) / (timeElapsed / 60));
    const finalAcc = totalTypedChars === 0 ? 0 : Math.round((correctChars / totalTypedChars) * 100);

    document.getElementById('final-wpm').innerText = finalWpm;
    document.getElementById('final-acc').innerText = finalAcc + '%';
    document.getElementById('final-time').innerText = selectedTime + 's';

    const badge = document.getElementById('new-hs-badge');
    
    if (finalWpm > highScore) {
        highScore = finalWpm;
        
        // Save PB securely linked to the User's UID
        localStorage.setItem(`pb_${currentUserId}`, highScore);
        
        const pbElement = document.getElementById('pb-wpm');
        if (pbElement) pbElement.innerText = highScore;
        
        if (badge) badge.style.display = 'block';
        
        if (typeof saveScoreToFirebase === 'function') {
            saveScoreToFirebase(highScore);
        }
    } else {
        if (badge) badge.style.display = 'none';
    }

    switchScreen('result-screen');
}

function resetApp() {
    document.getElementById('initial-time-buttons').style.display = 'flex';
    document.getElementById('expanded-setup').style.display = 'none';
    document.getElementById('roller-modal').classList.remove('active');
    switchScreen('landing-screen');
}

function restartSameSettings() {
    initTest();
}