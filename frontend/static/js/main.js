let board = null;
const STARTING_FEN = (window.APP_CONST && window.APP_CONST.STARTING_FEN) ? window.APP_CONST.STARTING_FEN : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let playerColor = null;
let isPlayerTurn = true;
let selectedBotColor = 'r';
let selectedBotEngine = 'stockfish';
let selectedBotLevel = 10;
let selectedBotTime = '0';
let selectedBotIncrement = 0;

const JS_MATE_SCORE_BASE = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_SCORE_BASE) ? window.APP_CONST.ENGINE.MATE_SCORE_BASE : 1000000;
const JS_MATE_DEPTH_ADJUSTMENT = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT) ? window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT : 500;
let gameOverModalInstance = null;
let loadDataModalInstance = null;



document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.WELCOME_SCREEN) ? window.APP_CONST.IDS.WELCOME_SCREEN : 'welcome-screen');
    const mainAppScreen = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.MAIN_APP_SCREEN) ? window.APP_CONST.IDS.MAIN_APP_SCREEN : 'main-app-screen');
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname-input');
    const userDisplaySpan = document.getElementById('user-display');
    if (window.ALICE_CHAT) window.ALICE_CHAT.init();
    const loadDataModalEl = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.LOAD_DATA_MODAL) ? window.APP_CONST.IDS.LOAD_DATA_MODAL : 'loadDataModal');
    const videoElement = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.WEBCAM_VIDEO) ? window.APP_CONST.IDS.WEBCAM_VIDEO : 'webcam-feed');
    if (loadDataModalEl) {
        loadDataModalInstance = new bootstrap.Modal(loadDataModalEl);
        loadDataModalEl.addEventListener('hidden.bs.modal', () => window.VISION_MANAGER?.stopWebcam());
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
            } else if (selectedMode === 'play') {
                // Chế độ 'play' được xử lý bởi setupModalBehavior để hiện Modal
                collapseNavbar();
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

        // 6. Đóng Navbar (Nếu đang ở Mobile/Tablet)
        collapseNavbar();
    }

    /**
     * Tự động đóng Navbar khi nhấn vào Menu trên Mobile/Tablet
     */
    function collapseNavbar() {
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if (bsCollapse) {
                bsCollapse.hide();
            } else {
                // Fallback nếu instance chưa tồn tại
                new bootstrap.Collapse(navbarCollapse).hide();
            }
        }
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
            boardOrientation = (finalPlayerColor === 'b') ? 'black' : 'white';

            // Cập nhật công tắc xoay bàn cờ trên UI
            const flipSwitch = document.getElementById('flip-board-switch');
            if (flipSwitch) flipSwitch.checked = (boardOrientation === 'black');

            // 1. Khởi tạo đồng hồ TRƯỚC khi tạo bàn cờ để onTurnEnd nhận diện được biến isTimedGame
            const timeLimitMinutes = parseInt(selectedBotTime);
            if (timeLimitMinutes > 0) {
                if (window.initTimers) window.initTimers(timeLimitMinutes);
            } else {
                if (window.resetTimers) window.resetTimers();
            }

            // 2. Clear cache
            fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});

            // 3. Khởi tạo bàn cờ
            initChessboard(boardOrientation);
            updateUI();
        });
    }


    // ===== THANH ĐIỂM =====

    function updateEvaluationBar(score, fen) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.updateEvaluationBar === 'function') {
            return window.LOGIC_GAME.updateEvaluationBar(score, fen);
        }
    }


    // Hàm khởi tạo bàn cờ (Chỉ gọi khi vào màn hình chính)
    function initChessboard(orientation = 'white', fen = null) {
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.initChessboard === 'function') {
            return window.LOGIC_GAME.initChessboard(orientation, fen);
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
        const hist = window.LOGIC_GAME?.getHistory() || [];
        const idx = window.LOGIC_GAME?.getIndex() || 0;
        const isFirstMove = idx <= 0;
        const isLastMove = idx >= hist.length - 1;

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
                updateUI();
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


    // hỗ trợ hàm toàn cục
    window.showGameOverModal = showGameOverModal;
    window.initChessboard = initChessboard;
    window.updateUI = updateUI;
    window.loadFen = loadFen;
    window.clearBoard = clearBoard;
    window.handleBotTurn = handleBotTurn;

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
                    const tempGame = new Chess();
                    success = tempGame.load_pgn(pgnText);
                    if (success) fenToLoad = tempGame.fen();
                }
            } else if (activeTabId === 'fen-pane') {
                const fenText = document.getElementById('fen-input').value.trim();
                if (fenText) {
                    const tempGame = new Chess();
                    success = tempGame.load(fenText);
                    if (success) fenToLoad = fenText;
                }
            } else if (activeTabId === 'image-pane') {
                const imageInput = document.getElementById('image-upload-input');
                const statusEl = document.getElementById('image-upload-status');

                if (!imageInput || imageInput.files.length === 0) {
                    if (loader) loader.classList.add('d-none');
                    if (statusEl) statusEl.textContent = 'Lỗi: Vui lòng chọn một file ảnh.';
                    return;
                }

                const data = await window.VISION_MANAGER.analyzeUpload(imageInput.files[0]);
                if (data.success) {
                    success = true;
                    fenToLoad = data.fen;
                } else {
                    if (loader) loader.classList.add('d-none');
                    window.VISION_MANAGER.showFriendlyError(statusEl, data.error);
                    return;
                }
            } else if (activeTabId === 'live-scan-pane') {
                // Live scan is now handled automatically by auto-scan or performScan in VisionManager.
                // But if user clicks 'Confirm' in the modal while on this tab, we trigger one scan.
                const statusEl = document.getElementById('scan-status');
                await window.VISION_MANAGER.performScan();
                // Check if scan updated successfully (this is a bit tricky with async, 
                // but let's assume we close modal manually if successful or wait for auto).
                if (loader) loader.classList.add('d-none');
                return; 
            }

            // Xử lý nạp FEN
            if (success && fenToLoad) {
                if (!window.VISION_MANAGER.isValidFen(fenToLoad)) {
                    if (loader) loader.classList.add('d-none');
                    const statusEl = document.getElementById('scan-status') || document.getElementById('image-upload-status');
                    if (statusEl) statusEl.textContent = '⚠️ FEN không hợp lệ hoặc thiếu quân Vua.';
                } else {
                    fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});
                    
                    // Sử dụng interface mới để khởi tạo board từ FEN
                    initChessboard(board?.orientation() || 'white', fenToLoad);
                    
                    updateUI(); // Cập nhật UI ngay lập tức
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
            const gameInst = window.LOGIC_GAME?.getGame();
            try {
                if (gameInst) updateUI(gameInst.fen());
            } catch (e) {
            }

            // Nếu đang chơi với Bot (playerColor != null) thì tái khởi động đồng hồ
            const timeLimitMinutes = parseInt(selectedBotTime);
            if (playerColor !== null && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0 && gameInst) {
                // Thiết lập lại đồng hồ theo thời gian đã chọn và bật đồng hồ cho bên đang đi
                initTimers(timeLimitMinutes);
                startTimer(gameInst.turn());
            } else {
                resetTimers();
            }

            if (playerColor === 'b') {
                handleBotTurn();
            }
        });
    }

    // === Button group controls (first/prev/load/next/last/clear) ===
    const buttonGroup = document.querySelector('.button-group-container');
    if (buttonGroup) {
        buttonGroup.addEventListener('click', function (e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const idx = window.LOGIC_GAME?.getIndex() || 0;
            const hist = window.LOGIC_GAME?.getHistory() || [];

            switch (action) {
                case 'first': loadFen(0); break;
                case 'prev': loadFen(idx - 1); break;
                case 'next': loadFen(idx + 1); break;
                case 'last': loadFen(hist.length - 1); break;
                case 'clear': clearBoard(); break;
                case 'load':
                    if (loadDataModalInstance) loadDataModalInstance.show();
                    else {
                        const el = document.getElementById('loadDataModal');
                        if (el) el.style.display = 'block';
                    }
                    break;
            }
        });

        // Keyboard navigation (Left/Right Arrows)
        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowLeft') {
                const idx = window.LOGIC_GAME?.getIndex() || 0;
                loadFen(idx - 1);
            } else if (e.key === 'ArrowRight') {
                const idx = window.LOGIC_GAME?.getIndex() || 0;
                loadFen(idx + 1);
            }
        });
    }

    const pgnHistoryEl = document.getElementById('pgn-history-list-vertical');
    if (pgnHistoryEl) {
        pgnHistoryEl.addEventListener('click', function (e) {
            const mv = e.target.closest('.move-cell');
            if (!mv) return;
            const idx = parseInt(mv.getAttribute('data-index'));
            if (!isNaN(idx)) loadFen(idx);
        });
    }

});
