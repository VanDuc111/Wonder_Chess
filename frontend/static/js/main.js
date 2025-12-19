let board = null;
let game = null;
let moveHistory = [];
let currentFenIndex = 0;
const STARTING_FEN = (window.APP_CONST && window.APP_CONST.STARTING_FEN) ? window.APP_CONST.STARTING_FEN : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let playerColor = null;
let isPlayerTurn = true;
let selectedBotColor = 'r';
let selectedBotEngine = 'stockfish';
let selectedBotLevel = 10;
let selectedBotTime = '0';
let selectedBotIncrement = 0;
let whiteTime = 0;
let blackTime = 0;
let timerInterval = null;
let isTimedGame = false;

const JS_MATE_SCORE_BASE = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_SCORE_BASE) ? window.APP_CONST.ENGINE.MATE_SCORE_BASE : 1000000;
const JS_MATE_DEPTH_ADJUSTMENT = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT) ? window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT : 500;
let gameOverModalInstance = null;
let loadDataModalInstance = null;
let currentWebcamStream = null;
let timerWhiteEl = null;
let timerBlackEl = null;

// Auto scan delay (ms)
const AUTO_SCAN_DELAY = (window.APP_CONST && window.APP_CONST.AUTO_SCAN && window.APP_CONST.AUTO_SCAN.DELAY_MS) ? window.APP_CONST.AUTO_SCAN.DELAY_MS : 5000;


document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.WELCOME_SCREEN) ? window.APP_CONST.IDS.WELCOME_SCREEN : 'welcome-screen');
    const mainAppScreen = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.MAIN_APP_SCREEN) ? window.APP_CONST.IDS.MAIN_APP_SCREEN : 'main-app-screen');
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname-input');
    const chatbotMessages = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.CHATBOT_MESSAGES) ? window.APP_CONST.IDS.CHATBOT_MESSAGES : 'chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSendButton = document.getElementById('send-chat-button');

    const userDisplaySpan = document.getElementById('user-display');
    const loadDataModalEl = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.LOAD_DATA_MODAL) ? window.APP_CONST.IDS.LOAD_DATA_MODAL : 'loadDataModal');
    const videoElement = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.WEBCAM_VIDEO) ? window.APP_CONST.IDS.WEBCAM_VIDEO : 'webcam-feed');

    timerWhiteEl = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.TIMER_WHITE) ? window.APP_CONST.IDS.TIMER_WHITE : 'timer-white');
    timerBlackEl = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.TIMER_BLACK) ? window.APP_CONST.IDS.TIMER_BLACK : 'timer-black');
    if (loadDataModalEl) {
        loadDataModalInstance = new bootstrap.Modal(loadDataModalEl);
        loadDataModalEl.addEventListener('hidden.bs.modal', stopWebcam);
    }

    // Hàm chào mừng và chuyển hướng
    function startApp(nickname) {
        // 1. Lưu Nickname
        localStorage.setItem('userNickname', nickname);

        // 2. Ẩn/Hiện màn hình
        welcomeScreen.classList.add('d-none');
        mainAppScreen.classList.remove('d-none');
        mainAppScreen.style.minHeight = '100vh';

        if (userDisplaySpan) {
            userDisplaySpan.textContent = `Chào, ${nickname}!`;
            userDisplaySpan.classList.remove('d-none');
        }

        // 3. Chatbot chào mừng
        const welcomeMessage = `Chào bạn, ${nickname}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;
        displayChatbotMessage(welcomeMessage);

        fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});

        document.title = `WonderChess - Intelligent Chess Assistant System`;

        initChessboard();
    }

    // Xử lý Form Nickname
    nicknameForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Ngăn form gửi đi và tải lại trang
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            startApp(nickname);
        }
    });

    const storedNickname = localStorage.getItem('userNickname');
    if (storedNickname) {
        startApp(storedNickname);
    }

    // ===== QUẢN LÝ CÁC CHẾ ĐỘ TRÊN NAVBAR =====

    const modeLinks = document.querySelectorAll('.nav-mode-link');

    modeLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const href = event.currentTarget.getAttribute('href');
            // Nếu người dùng đang ở trang chủ (pathname là '/' hoặc '') và click vào link trang chủ, 
            // chúng ta ngăn load lại trang để JS xử lý modal/mode.
            const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '';
            const isToHome = href === '/' || href === './' || href.endsWith('index.html');

            if (href && href !== '#' && !href.startsWith('javascript:') && !(isHomePage && isToHome)) {
                // Let the browser navigate to the new page
                return;
            }

            event.preventDefault();

            // 1. Xóa class 'active' khỏi tất cả các liên kết
            modeLinks.forEach(item => item.classList.remove('active'));

            // 2. Thêm class 'active' vào liên kết vừa được nhấn
            event.currentTarget.classList.add('active');

            // Lấy chế độ (mode)
            const selectedMode = event.currentTarget.getAttribute('data-mode');
            console.log(`Chế độ đã chọn: ${selectedMode}`);
            // 3. Xử lý chuyển đổi chế độ
            if (selectedMode === 'analyze') {
                setAnalyzeMode();
            }
            // =============================
        });
    });


    function setAnalyzeMode() {

        // 1. Dừng và reset đồng hồ
        resetTimers();

        // 2. Reset biến trạng thái Bot
        playerColor = null;
        isPlayerTurn = true;

        // 3. Khởi tạo lại bàn cờ về hướng 'white'
        initChessboard('white');

        // 4. Bỏ xoay
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        if (scoreWrapper) {
            scoreWrapper.classList.remove('rotated-score');
        }
        const boardContainer = document.querySelector('.chess-board-area');
        if (boardContainer) {
            boardContainer.classList.remove('rotated-board');
        }

        // 5. Cập nhật UI lần cuối để lấy điểm 0.00
        updateUI(STARTING_FEN);
        handleScoreUpdate("0.00");
    }

    // Gắn sự kiện cho nút "Chơi với Bot" trên Navbar
    setupModalBehavior('bot-settings-modal', '#nav-play-bot');


    // === BOT SETTINGS UI LOGIC ===
    const botEngineSelect = document.getElementById('bot-engine-select');
    const botLevelSlider = document.getElementById('bot-level-slider');
    const botLevelSelect = document.getElementById('bot-level-select');
    const botSideSelect = document.getElementById('bot-side-select');
    const botTimeSelect = document.getElementById('bot-time-select');
    const botIncrementSelect = document.getElementById('bot-increment-select');
    const levelDisplay = document.getElementById('level-value-display');

    // Sync Slider and Level Display/Select
    if (botLevelSlider) {
        botLevelSlider.addEventListener('input', function() {
            const val = parseInt(this.value);
            selectedBotLevel = val;
            
            // Map 0-20 to ELO-like display (850 + Level * 50)
            const elo = 850 + (val * 50); 
            if (levelDisplay) levelDisplay.textContent = elo;

            // Update Select
            if (val <= 4) botLevelSelect.value = "0";
            else if (val <= 8) botLevelSelect.value = "5";
            else if (val <= 12) botLevelSelect.value = "10";
            else if (val <= 16) botLevelSelect.value = "15";
            else botLevelSelect.value = "20";
        });
    }

    if (botLevelSelect) {
        botLevelSelect.addEventListener('change', function() {
            const val = parseInt(this.value);
            botLevelSlider.value = val;
            selectedBotLevel = val;
            const elo = 850 + (val * 50);
            if (levelDisplay) levelDisplay.textContent = elo;
        });
    }

    // Initialize Level Display
    if (botLevelSlider && levelDisplay) {
        levelDisplay.textContent = 850 + (parseInt(botLevelSlider.value) * 50);
    }
    // 3. LOGIC BẮT ĐẦU GAME BOT
    const startBotGameBtn = document.getElementById('start-bot-game-btn');
    if (startBotGameBtn) {
        startBotGameBtn.addEventListener('click', () => {
            // Read all settings
            selectedBotEngine = botEngineSelect.value;
            selectedBotLevel = parseInt(botLevelSlider.value);
            selectedBotColor = botSideSelect.value;
            selectedBotTime = botTimeSelect.value;
            selectedBotIncrement = parseInt(botIncrementSelect.value);

            // Ẩn Modal
            document.getElementById('bot-settings-modal').style.display = 'none';
            // Xử lý lựa chọn màu
            let finalPlayerColor = selectedBotColor;
            let boardOrientation;

            if (selectedBotColor === 'r') {
                finalPlayerColor = (Math.random() < 0.5) ? 'w' : 'b';
            }

            playerColor = finalPlayerColor;
            const scoreWrapper = document.querySelector('.score-alignment-wrapper');
            if (finalPlayerColor === 'b') {
                boardOrientation = 'black';

                // 1. Thêm class xoay cho thanh điểm
                if (scoreWrapper) {
                    scoreWrapper.classList.add('rotated-score');
                }
            } else {
                boardOrientation = 'white';

                // 2. Xóa class xoay
                if (scoreWrapper) {
                    scoreWrapper.classList.remove('rotated-score');
                }
            }
            //create new chessboard
            initChessboard(boardOrientation);
            try {
                updateUI(game.fen());
            } catch (e) {
            }
            fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});

            const boardContainer = document.querySelector('.chess-board-area');

            // Đồng hồ thời gian
            const timeLimitMinutes = parseInt(selectedBotTime);

            // Nếu timeLimitMinutes là 0, nghĩa là "Vô hạn" (Không cần đồng hồ)
            if (timeLimitMinutes > 0) {
                initTimers(timeLimitMinutes);
                startTimer(game.turn());
            } else {
                // Đảm bảo đồng hồ không hiển thị hoặc bị reset
                resetTimers();
            }
            if (playerColor === 'b') {
                // Nếu người chơi chọn Đen, Bot (Trắng) đi trước
                boardContainer.classList.add('rotated-board');
                handleBotTurn();
            } else {
                boardContainer.classList.remove('rotated-board');
            }
        });
    }

    // Hàm hiển thị tin nhắn Chatbot
    function displayChatbotMessage(text, isBot = true) {
        const messageElement = document.createElement('div');

        if (isBot) {
            messageElement.classList.add('alice-message');
        } else {
            messageElement.classList.add('user-message');
        }

        messageElement.innerHTML = text;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // ===== THANH ĐIỂM =====

    function updateEvaluationBar(score, fen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updateEvaluationBar === 'function') {
            return window.LOGIC_GAME.updateEvaluationBar(score, fen);
        }
    }


    // Hàm khởi tạo bàn cờ (Chỉ gọi khi vào màn hình chính)
    function initChessboard(orientation = 'white') {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.initChessboard === 'function') {
            return window.LOGIC_GAME.initChessboard(orientation);
        }
    }

    // Hàm khớp chiều cao thanh điểm và bàn cờ
    function syncBoardAndEvalHeight() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.syncBoardAndEvalHeight === 'function') {
            return window.LOGIC_GAME.syncBoardAndEvalHeight();
        }
    }


    // Hàm kiểm soát nước đi
    async function makeMove(moveUci) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.makeMove === 'function') {
            return await window.LOGIC_GAME.makeMove(moveUci);
        }
        return false;
    }

    // Xử lý sự kiện kéo thả
    async function onDrop(source, target) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.onDrop === 'function') {
            return await window.LOGIC_GAME.onDrop(source, target);
        }
        return 'snapback';
    }


    function onSnapEnd() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.onSnapEnd === 'function') {
            return window.LOGIC_GAME.onSnapEnd();
        }
    }

    function updateAllHighlights() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updateAllHighlights === 'function') {
            return window.LOGIC_GAME.updateAllHighlights();
        }
    }

    function findKingSquare(color) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.findKingSquare === 'function') {
            return window.LOGIC_GAME.findKingSquare(color);
        }
        return null;
    }


    function handleScoreUpdate(scoreText, fen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.handleScoreUpdate === 'function') {
            return window.LOGIC_GAME.handleScoreUpdate(scoreText, fen);
        }
    }


    async function handleTurnEnd(newFen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.handleTurnEnd === 'function') {
            return await window.LOGIC_GAME.handleTurnEnd(newFen);
        }
    }

    async function handleBotTurn() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.handleBotTurn === 'function') {
            return await window.LOGIC_GAME.handleBotTurn();
        }
    }


    function onDragStart(source, piece, position, orientation) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.onDragStart === 'function') {
            return window.LOGIC_GAME.onDragStart(source, piece, position, orientation);
        }
        return true;
    }

    function updatePgnHistory() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updatePgnHistory === 'function') {
            return window.LOGIC_GAME.updatePgnHistory();
        }
    }


    // Hàm truyền điểm số vào thanh điểm
    async function fetchDeepEvaluation(fen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.fetchDeepEvaluation === 'function') {
            return await window.LOGIC_GAME.fetchDeepEvaluation(fen);
        }
    }

    function loadFen(index) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.loadFen === 'function') {
            return window.LOGIC_GAME.loadFen(index);
        }
    }

    // Hàm cập nhật giao diện
    function updateUI(fen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updateUI === 'function') {
            return window.LOGIC_GAME.updateUI(fen);
        } else {
            updateButtonState();
            updatePgnHistory();
        }
    }

    function updateButtonState() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updateButtonState === 'function') {
            return window.LOGIC_GAME.updateButtonState();
        }
        const isFirstMove = currentFenIndex <= 0;
        const isLastMove = currentFenIndex >= moveHistory.length - 1;

        $('[data-action="first"]').prop('disabled', isFirstMove);
        $('[data-action="prev"]').prop('disabled', isFirstMove);
        $('[data-action="next"]').prop('disabled', isLastMove);
        $('[data-action="last"]').prop('disabled', isLastMove);
    }

    // Hàm thiết lập lại trò chơi về trạng thái ban đầu
    function clearBoard() {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.clearBoard === 'function') {
            const res = window.LOGIC_GAME.clearBoard();
            try {
                updateUI(game.fen());
            } catch (e) {
            }
            return res;
        }
        if (!board) {
            console.error("Lỗi: Board chưa được khởi tạo.");
            return;
        }
        const currentOrientation = board.orientation();
        fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});

        initChessboard(currentOrientation);
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        if (scoreWrapper) {
            if (playerColor === 'b') {
                scoreWrapper.classList.add('rotated-score');
            } else {
                scoreWrapper.classList.remove('rotated-score');
            }
        }
    }

    // ===== TÍCH HỢP AI GEMINI =====

    // Hàm thêm tin nhắn vào khung chat
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        if (sender === 'user') {
            messageDiv.classList.add('user-message');
        } else {
            messageDiv.classList.add('alice-message');
        }

        messageDiv.textContent = text;

        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    /**
     * Tạo một bong bóng chat MỚI (thường là để chờ Alice trả lời).
     *
     * @param {string} sender "user" hoặc "Alice"
     * @returns {HTMLElement} Trả về 'messageDiv' để hàm streaming có thể điền text vào.
     */
    function createNewMessageElement(sender) {

        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'alice-message');

        if (sender === 'Alice') {
            messageDiv.innerHTML = `
                <div class="typing-indicator">
                    <img src="static/img/alice-loading.svg" alt="Alice is thinking..." class="alice-loading-svg">
                </div>
            `;
        } else {
            messageDiv.textContent = '';
        }

        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return messageDiv;
    }

    document.getElementById('chatbot-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = chatbotInput.value.trim();

        // 2. Kiểm tra khóa
        if (!message || chatbotInput.disabled) {
            return;
        }

        // 3. Khóa input
        chatbotInput.disabled = true;
        chatbotSendButton.disabled = true;

        // 4. Kiểm tra tin nhắn đầu tiên
        const isFirstUserMessage = (chatbotMessages.children.length === 1);

        appendMessage('user', message);
        chatbotInput.value = ''; //
        const aliceMessageElement = createNewMessageElement('Alice');

        // 5. Lấy FEN và lịch sử
        const currentFen = game.fen();
        const pgnHistory = game.pgn();
        const history = game.history({verbose: true});
        let lastMoveSan = 'N/A';
        if (history.length > 0) {
            lastMoveSan = history[history.length - 1]?.san;
        }

        // 6. Gửi yêu cầu
        try {
            const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CHAT_ANALYSIS) ? window.APP_CONST.API.CHAT_ANALYSIS : '/api/analysis/chat_analysis', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    user_question: message,
                    fen: currentFen,
                    pgn: pgnHistory,
                    last_move_san: lastMoveSan,
                    is_first_message: isFirstUserMessage
                })
            });
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}. Không thể kết nối với Alice.`);
            }

            // --- XỬ LÝ STREAMING ---
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const STREAM_DELAY_MS = 5;
            let fullResponseText = "";
            let isFirstChunk = true;

            while (!done) {
                const {value, done: readerDone} = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, {stream: true});

                for (const char of chunk) {
                    if (isFirstChunk) {
                        aliceMessageElement.innerHTML = '';
                        isFirstChunk = false;
                    }
                    aliceMessageElement.textContent += char;
                    fullResponseText += char;
                    await sleep(STREAM_DELAY_MS);
                    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
                }
            }

            const finalHtml = convertSimpleMarkdownToHtml(fullResponseText);
            aliceMessageElement.innerHTML = finalHtml;

        } catch (error) {
            aliceMessageElement.textContent += ` [Lỗi: Không thể nhận phản hồi. ${error.message}]`;
            console.error('Lỗi trong Fetch API hoặc JSON:', error);
        } finally {
            // 8. Mở khóa
            chatbotInput.disabled = false;
            chatbotSendButton.disabled = false;
            chatbotInput.focus();
        }
    });

    /**
     * Hàm hỗ trợ chuyển đổi text Markdown đơn giản sang HTML.
     */
    function convertSimpleMarkdownToHtml(text) {
        let html = text;

        // 1. Chuyển đổi **Bold** (kể cả khi có dấu : ! ? bên trong)
        // [^\s] = Bất kỳ ký tự nào KHÔNG phải khoảng trắng
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 2. Chuyển đổi * Bullet Points *
        // (^ = đầu dòng, \s* = 0 hoặc nhiều khoảng trắng, \* = dấu sao, (.*) = nội dung)
        // (gm flags = global và multiline, để nó tìm ở mọi đầu dòng)
        html = html.replace(/^(\s*)\* (.*?)$/gm, '<li style="margin-left: 20px;">$2</li>');

        // 3. Chuyển đổi \n (xuống dòng) sang <br>

        html = html.replace(/\n/g, '<br>');

        // 4. Sửa lỗi <br> thừa nếu nó đứng ngay trước <li>
        html = html.replace(/<br><li/g, '<li');

        return html;
    }

    // ===== ĐỒNG HỒ THỜI GIAN ======

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        // Đảm bảo giây luôn có 2 chữ số (ví dụ: 05)
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // =======================================================
    // HÀM HELPER: CẬP NHẬT GIAO DIỆN ĐỒNG HỒ
    // =======================================================
    function updateTimerDisplay() {
        if (timerWhiteEl) timerWhiteEl.textContent = formatTime(whiteTime);
        if (timerBlackEl) timerBlackEl.textContent = formatTime(blackTime);
    }

    // =======================================================
    // HÀM HELPER: RESET/ẨN ĐỒNG HỒ
    // =======================================================
    function resetTimers() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        whiteTime = 0;
        blackTime = 0;
        isTimedGame = false;

        if (timerWhiteEl) {
            timerWhiteEl.style.display = 'none';
            timerWhiteEl.classList.remove('active');
            timerWhiteEl.textContent = '0:00';
        }
        if (timerBlackEl) {
            timerBlackEl.style.display = 'none';
            timerBlackEl.classList.remove('active');
            timerBlackEl.textContent = '0:00';
        }
    }

    // =======================================================
    // HÀM CHÍNH: KHỞI TẠO ĐỒNG HỒ ĐẾM NGƯỢC
    // =======================================================
    function initTimers(minutes) {
        resetTimers();

        const initialTimeSeconds = minutes * 60;
        whiteTime = initialTimeSeconds;
        blackTime = initialTimeSeconds;
        isTimedGame = true;

        if (timerWhiteEl) timerWhiteEl.style.display = 'block';
        if (timerBlackEl) timerBlackEl.style.display = 'block';

        updateTimerDisplay();
    }

    // =======================================================
    // HÀM BẮT ĐẦU VÀ CHUYỂN ĐỔI ĐỒNG HỒ
    // =======================================================
    function startTimer(colorToMove) {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // CỘNG GIÂY TĂNG THÊM (INCREMENT)
        // Người vừa đi xong nước (đối phương của người sắp đi) sẽ được cộng giây
        if (isTimedGame && selectedBotIncrement > 0 && typeof game !== 'undefined' && game) {
            const history = game.history();
            if (history.length > 0) {
                if (colorToMove === 'w') {
                    blackTime += selectedBotIncrement;
                } else {
                    whiteTime += selectedBotIncrement;
                }
                updateTimerDisplay();
            }
        }

        if (colorToMove === 'w') {
            if (timerWhiteEl) timerWhiteEl.classList.add('active');
            if (timerBlackEl) timerBlackEl.classList.remove('active');
        } else { // chess.BLACK
            if (timerWhiteEl) timerWhiteEl.classList.remove('active');
            if (timerBlackEl) timerBlackEl.classList.add('active');
        }

        // Thiết lập bộ đếm 1 giây
        timerInterval = setInterval(() => {
            let currentTime;
            let isWhiteTurn = (colorToMove === 'w');

            if (isWhiteTurn) {
                whiteTime--;
                currentTime = whiteTime;
            } else {
                blackTime--;
                currentTime = blackTime;
            }

            updateTimerDisplay();

            // KIỂM TRA HẾT GIỜ (Flag)
            if (currentTime <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                isTimedGame = false; // Game đã kết thúc

                const winner = isWhiteTurn ? 'Đen' : 'Trắng';
                const body = `Hết giờ! ${winner} thắng cuộc.`;
                showGameOverModal("Hết giờ", body);
            }
        }, 1000);
    }

    // hỗ trợ hàm toàn cục
    window.startTimer = startTimer;
    window.resetTimers = resetTimers;
    window.initTimers = initTimers;
    window.showGameOverModal = showGameOverModal;
    window.startWebcam = startWebcam;
    window.stopWebcam = stopWebcam;

    // ====== LOAD DATA ======

    document.getElementById('confirm-load-btn').addEventListener('click', async () => {
        let success = false;
        let fenToLoad = null;

        const activeTab = document.querySelector('.tab-pane.fade.show.active');
        const activeTabId = activeTab ? activeTab.id : null;
        const loader = document.getElementById('modal-loader-overlay');

        // Hiện loader nếu là tab xử lý ảnh
        if (activeTabId === 'image-pane' || activeTabId === 'live-scan-pane') {
            if (loader) loader.classList.remove('d-none');
        }

        try {
            if (activeTabId === 'pgn-pane') {
                const pgnText = document.getElementById('pgn-input').value.trim();
                if (pgnText) {
                    success = game.load_pgn(pgnText);
                    if (success) fenToLoad = game.fen();
                }
            } else if (activeTabId === 'fen-pane') {
                const fenText = document.getElementById('fen-input').value.trim();
                if (fenText) {
                    success = game.load(fenText);
                    if (success) fenToLoad = fenText;
                }
            } else if (activeTabId === 'image-pane') {
                const imageInput = document.getElementById('image-upload-input');
                const statusEl = document.getElementById('image-upload-status');

                if (imageInput.files.length === 0) {
                    if (loader) loader.classList.add('d-none');
                    statusEl.textContent = 'Lỗi: Vui lòng chọn một file ảnh.';
                    return;
                }

                const file = imageInput.files[0];
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.IMAGE_ANALYZE) ? window.APP_CONST.API.IMAGE_ANALYZE : '/api/image/analyze_image', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    success = true;
                    fenToLoad = data.fen;
                } else {
                    if (loader) loader.classList.add('d-none');
                    statusEl.textContent = `Lỗi: ${data.error} `;
                    return;
                }
            } else if (activeTabId === 'live-scan-pane') {
                const statusEl = document.getElementById('scan-status');
                if (!currentWebcamStream) {
                    if (loader) loader.classList.add('d-none');
                    statusEl.textContent = 'Lỗi: Camera chưa được bật.';
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
                const formData = new FormData();
                formData.append('file', blob, 'webcam-scan.jpg');

                const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.IMAGE_ANALYZE) ? window.APP_CONST.API.IMAGE_ANALYZE : '/api/image/analyze_image', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    success = true;
                    fenToLoad = data.fen;
                    stopWebcam();
                } else {
                    if (loader) loader.classList.add('d-none');
                    statusEl.textContent = `Lỗi: ${data.error} `;
                    return;
                }
            }

            // Xử lý nạp FEN
            if (success && fenToLoad) {
                if (!isValidFen(fenToLoad)) {
                    if (loader) loader.classList.add('d-none');
                    const statusEl = document.getElementById('scan-status') || document.getElementById('image-upload-status');
                    if (statusEl) statusEl.textContent = '⚠️ FEN không hợp lệ hoặc thiếu quân Vua.';
                } else {
                    game.load(fenToLoad);
                    board.position(fenToLoad);
                    fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});
                    moveHistory = [{fen: fenToLoad, score: null}];
                    currentFenIndex = 0;

                    await fetchDeepEvaluation(fenToLoad);
                    updateUI(fenToLoad);
                    if (loader) loader.classList.add('d-none');
                    if (loadDataModalInstance) loadDataModalInstance.hide();
                }
            } else if (activeTabId === 'pgn-pane' || activeTabId === 'fen-pane') {
                alert("Lỗi: Dữ liệu PGN/FEN không hợp lệ.");
            }

        } catch (err) {
            console.error("Lỗi confirm-load:", err);
            if (loader) loader.classList.add('d-none');
        } finally {
            // Đảm bảo ẩn loader nếu chưa ẩn
            if (loader) loader.classList.add('d-none');
        }
    });

    // =======================================================
    // LOGIC UPLOAD ẢNH (Drag & Drop + Preview)
    // =======================================================
    const uploadArea = document.getElementById('upload-area');
    const imageInput = document.getElementById('image-upload-input');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    if (uploadArea && imageInput) {
        // 1. Click để mở file dialog
        uploadArea.addEventListener('click', () => {
            imageInput.click();
        });

        // 2. Xử lý Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        // Ngăn hành vi mặc định
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            uploadArea.classList.add('dragover');
        }

        function unhighlight(e) {
            uploadArea.classList.remove('dragover');
        }

        uploadArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                imageInput.files = files;
                handleFiles(files);
            }
        }

        // 3. Xử lý khi chọn file qua dialog
        imageInput.addEventListener('change', function () {
            handleFiles(this.files);
        });

        function handleFiles(files) {
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        previewImage.src = e.target.result;
                        previewContainer.classList.remove('d-none');
                        uploadArea.classList.add('d-none'); // Ẩn vùng upload
                    }
                    reader.readAsDataURL(file);
                } else {
                    alert("Vui lòng chọn file ảnh hợp lệ.");
                }
            }
        }

        // 4. Xử lý nút Xóa ảnh
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                imageInput.value = ''; // Reset input
                previewImage.src = '';
                previewContainer.classList.add('d-none');
                uploadArea.classList.remove('d-none'); // Hiện lại vùng upload
            });
        }
    }


    /**
     * Thiết lập hành vi hiển thị và đóng (bao gồm cả click ra ngoài) cho Modal tùy chỉnh (không dùng Bootstrap JS).
     * @param {string} modalId - ID của Modal (ví dụ: 'bot-settings-modal').
     * @param {string} triggerSelector - Selector của nút kích hoạt Modal (ví dụ: '#play-bot-link').
     */
    function setupModalBehavior(modalId, triggerSelector) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;

        // 1. Logic Hiển thị (Khi click nút kích hoạt)
        const triggerElement = document.querySelector(triggerSelector);
        if (triggerElement) {
            triggerElement.addEventListener('click', (e) => {
                e.preventDefault();
                modalElement.style.display = 'block'; // Hiển thị Modal
            });
        }

        // 2. Logic Đóng Modal
        const closeModalBtn = modalElement.querySelector('.close-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modalElement.style.display = 'none';
            });
        }

        // 3. Logic Đóng Modal khi Click Ra Ngoài (Backdrop Click)
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                modalElement.style.display = 'none';
            }
        });
    }

    // Hàm chung để xử lý việc chọn nút trong Modal
    function setupModalButtonSelection(selector) {
        document.querySelectorAll(selector).forEach(button => {
            button.addEventListener('click', function () {
                const group = this.parentElement.querySelectorAll('button');

                group.forEach(btn => btn.classList.remove('selected'));

                this.classList.add('selected');

                // Màu quân và thời gian
                const color = this.getAttribute('data-color');
                const time = this.getAttribute('data-time');

                if (color) {
                    selectedBotColor = color;
                    console.log("Đã chọn màu:", selectedBotColor);
                }
                if (time) {
                    selectedBotTime = time;
                    console.log("Đã chọn thời gian:", selectedBotTime);
                }
            });
        });
    }

    // Áp dụng cho lựa chọn màu
    setupModalButtonSelection('.setting-group button[data-color]');

    // Áp dụng cho lựa chọn thời gian
    setupModalButtonSelection('.setting-group button[data-time]');

    const gameOverModalEl = document.getElementById('gameOverModal');
    if (gameOverModalEl) {
        gameOverModalInstance = new bootstrap.Modal(gameOverModalEl, {
            keyboard: false,
            backdrop: 'static'
        });
    }

    // Hiển thị modal game over với tiêu đề và nội dung tùy chỉnh
    function showGameOverModal(title, body) {
        const titleEl = document.getElementById('gameOverModalTitle');
        const bodyEl = document.getElementById('gameOverModalBody');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;

        if (gameOverModalInstance) {
            gameOverModalInstance.show();
        }
    }

    const btnNewGameModal = document.getElementById('modalNewGameBtn');
    if (btnNewGameModal) {
        btnNewGameModal.addEventListener('click', function () {
            if (gameOverModalInstance) {
                gameOverModalInstance.hide();
            }

            clearBoard();
            try {
                updateUI(game.fen());
            } catch (e) {
            }

            // Nếu đang chơi với Bot (playerColor != null) thì tái khởi động đồng hồ
            const timeLimitMinutes = parseInt(selectedBotTime);
            if (playerColor !== null && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0) {
                // Thiết lập lại đồng hồ theo thời gian đã chọn và bật đồng hồ cho bên đang đi
                initTimers(timeLimitMinutes);
                startTimer(game.turn());
            } else {
                resetTimers();
            }

            // Đồng bộ trạng thái hiển thị board (xoay nếu người chơi chọn Đen)
            const boardContainer = document.querySelector('.chess-board-area');
            if (playerColor === 'b') {
                if (boardContainer) boardContainer.classList.add('rotated-board');
                handleBotTurn();
            } else {
                if (boardContainer) boardContainer.classList.remove('rotated-board');
            }
        });
    }

    /**
     * Bật camera của người dùng và hiển thị lên thẻ <video>
     */
    async function startWebcam() {
        if (currentWebcamStream) {
            stopWebcam();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia((window.APP_CONST && window.APP_CONST.VIDEO_CONSTRAINTS) ? window.APP_CONST.VIDEO_CONSTRAINTS : {video: {facingMode: 'environment'}});
            videoElement.srcObject = stream;
            currentWebcamStream = stream;

        } catch (err) {
            console.error("Lỗi bật webcam:", err);
            document.getElementById('scan-status').textContent = 'Lỗi: Không thể truy cập camera.';
        }
    }

    /**
     * Tắt camera
     */
    function stopWebcam() {
        if (currentWebcamStream) {
            currentWebcamStream.getTracks().forEach(track => {
                track.stop();
            });
            currentWebcamStream = null;
        }
    }

    const liveScanTab = document.getElementById('live-scan-tab');
    if (liveScanTab) {
        liveScanTab.addEventListener('shown.bs.tab', function () {
            startWebcam(); // Bật camera khi tab được chọn
        });
    }

    // Tắt camera khi người dùng chọn các tab khác
    document.getElementById('pgn-tab').addEventListener('shown.bs.tab', stopWebcam);
    document.getElementById('fen-tab').addEventListener('shown.bs.tab', stopWebcam);
    document.getElementById('image-tab').addEventListener('shown.bs.tab', stopWebcam);

    // --- LOGIC AUTO SCAN ---
    let autoScanInterval = null;
    // const AUTO_SCAN_DELAY = 5000; // moved to top using APP_CONST

    const autoScanToggle = document.getElementById('auto-scan-toggle');
    const captureBtn = document.getElementById('capture-btn');

    // Hàm thực hiện quy trình chụp và gửi
    async function performScan() {
        const statusEl = document.getElementById('scan-status');

        if (!currentWebcamStream) {
            statusEl.textContent = '⚠️ Camera chưa bật!';
            if (autoScanToggle) autoScanToggle.checked = false;
            return;
        }

        statusEl.textContent = '🔄 Đang tự động quét...';

        try {
            // 1. Chụp từ video ra canvas
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // 2. Chuyển sang Blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

            // 3. Gửi lên Server
            const formData = new FormData();
            formData.append('file', blob, 'autocapture.jpg');

            const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.IMAGE_ANALYZE) ? window.APP_CONST.API.IMAGE_ANALYZE : '/api/image/analyze_image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                statusEl.textContent = '✅ Đã cập nhật thế cờ!';
                statusEl.style.color = 'green';
                const debugOverlay = document.getElementById('debug-overlay');
                if (data.debug_image && debugOverlay) {
                    debugOverlay.src = 'data:image/jpeg;base64,' + data.debug_image;
                    debugOverlay.style.display = 'block';

                    // Hiện ảnh debug trong 1.5 giây rồi ẩn đi để tiếp tục soi camera
                    setTimeout(() => {
                        debugOverlay.style.display = 'none';
                    }, 1500);
                }

                // Cập nhật bàn cờ
                const newFen = data.fen;
                try {
                    if (game.fen().split(' ')[0] !== newFen.split(' ')[0]) {
                        game.load(newFen);
                        board.position(newFen);
                        // Reset lịch sử nước đi để xóa pgn-history của ván trước
                        moveHistory = [{fen: newFen, score: null}];
                        currentFenIndex = 0;

                        // Lấy điểm sâu và cập nhật UI
                        await fetchDeepEvaluation(newFen);
                        updateUI(newFen);
                    }
                } catch (e) {
                    console.warn("Bỏ qua FEN lỗi từ Camera:", e.message);
                    statusEl.textContent = '⚠️ Ảnh mờ hoặc thiếu quân Vua.';
                }
            } else {
                console.warn("Scan lỗi:", data.error);
                statusEl.textContent = '⚠️ Không nhận diện được quân cờ.';
            }

        } catch (err) {
            console.error("Lỗi Auto Scan:", err);
        }

        // Nếu vẫn đang bật Auto, gọi lần quét tiếp theo sau delay
        // Dùng setTimeout thay vì setInterval để tránh chồng chéo request
        if (autoScanToggle.checked) {
            autoScanInterval = setTimeout(performScan, AUTO_SCAN_DELAY);
        }
    }

    // Sự kiện bật/tắt công tắc
    if (autoScanToggle) {
        autoScanToggle.addEventListener('change', function () {
            if (this.checked) {
                // Bắt đầu quét
                document.getElementById('scan-status').textContent = '🟢 Chế độ rảnh tay đã bật.';
                performScan();
            } else {
                // Tắt quét
                clearTimeout(autoScanInterval);
                document.getElementById('scan-status').textContent = '🔴 Đã dừng quét tự động.';
            }
        });
    }

    // Gắn sự kiện cho nút chụp thủ công
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            // Tắt auto nếu đang bật để tránh xung đột
            if (autoScanToggle) autoScanToggle.checked = false;
            clearTimeout(autoScanInterval);
            await performScan();
        });
    }

    // === Button group controls (first/prev/load/next/last/clear) ===
    const buttonGroup = document.querySelector('.button-group-container');
    if (buttonGroup) {
        buttonGroup.addEventListener('click', function (e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            switch (action) {
                case 'first':
                    loadFen(0);
                    break;
                case 'prev':
                    loadFen(currentFenIndex - 1);
                    break;
                case 'next':
                    loadFen(currentFenIndex + 1);
                    break;
                case 'last':
                    loadFen(moveHistory.length - 1);
                    break;
                case 'clear':
                    clearBoard();
                    break;
                case 'load':
                    if (typeof loadDataModalInstance !== 'undefined' && loadDataModalInstance) {
                        loadDataModalInstance.show();
                    } else {
                        const el = document.getElementById('loadDataModal');
                        if (el) el.style.display = 'block';
                    }
                    break;
                default:
                    break;
            }
            updateButtonState();
        });

        // Keyboard navigation (Left/Right Arrows)
        document.addEventListener('keydown', function (e) {
            // Ignore if user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowLeft') {
                loadFen(currentFenIndex - 1);
                updateButtonState();
            } else if (e.key === 'ArrowRight') {
                loadFen(currentFenIndex + 1);
                updateButtonState();
            }
        });
    }

    const pgnHistoryEl = document.getElementById('pgn-history-list-vertical');
    if (pgnHistoryEl) {
        pgnHistoryEl.addEventListener('click', function (e) {
            const mv = e.target.closest('.move-cell');
            if (!mv) return;
            const idx = parseInt(mv.getAttribute('data-index'));
            if (!isNaN(idx)) {
                loadFen(idx);
                updateButtonState();
            }
        });
    }

    // Chức năng: Kiểm tra tính hợp lệ của FEN
    function isValidFen(fen) {
        if (!fen || typeof fen !== 'string') return false;
        try {
            const testGame = new Chess(fen);
            // Đảm bảo có cả hai quân Vua trên bàn cờ
            const boardArr = testGame.board ? testGame.board() : null;
            if (Array.isArray(boardArr)) {
                let hasWhiteKing = false;
                let hasBlackKing = false;
                for (const row of boardArr) {
                    for (const cell of row) {
                        if (cell && cell.type === 'k') {
                            if (cell.color === 'w') hasWhiteKing = true;
                            if (cell.color === 'b') hasBlackKing = true;
                        }
                    }
                }
                return hasWhiteKing && hasBlackKing;
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    // Kiểm tra và khởi tạo Modal FEN không hợp lệ từ template có sẵn
    (function initInvalidFenModalFromTemplate() {
        const modalEl = document.getElementById('invalidFenModal');
        if (!modalEl) {
            // fallback: nếu không tìm thấy modal, tạo hàm rỗng
            window.showInvalidFenModal = function (msg) {
                alert(msg || 'FEN không hợp lệ');
            };
            return;
        }

        const modalInstance = new bootstrap.Modal(modalEl);
        const retryBtn = modalEl.querySelector('#invalidFenModalRetry');
        if (retryBtn) retryBtn.addEventListener('click', () => {
            modalInstance.hide();
            if (typeof performScan === 'function') performScan();
        });

        window.showInvalidFenModal = function (message) {
            const body = modalEl.querySelector('#invalidFenModalBody');
            if (body && message) body.textContent = message;
            modalInstance.show();
        };
    })();


});
