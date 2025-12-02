
let board = null;
let game = null;
let moveHistory = [];
let currentFenIndex = 0;
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let playerColor = null;
let isPlayerTurn = true;
let selectedBotColor = 'w';
let selectedBotTime = '5';
let whiteTime = 0;
let blackTime = 0;
let timerInterval = null;
let isTimedGame = false;
const JS_MATE_SCORE_BASE = 1000000;
const JS_MATE_DEPTH_ADJUSTMENT = 500;
let gameOverModalInstance = null;
let loadDataModalInstance = null;
let currentWebcamStream = null;
let timerWhiteEl = null;
let timerBlackEl = null;

document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSendButton = document.getElementById('send-chat-button');

    const userDisplaySpan = document.getElementById('user-display');
    const loadDataModalEl = document.getElementById('loadDataModal');
    const videoElement = document.getElementById('webcam-feed');

    timerWhiteEl = document.getElementById('timer-white');
    timerBlackEl = document.getElementById('timer-black');
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

        fetch('/api/game/clear_cache', { method: 'POST' });

        document.title = `WonderChess - Chào mừng ${nickname}`;

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



    const timeButtons = document.querySelectorAll('.time-select');

    timeButtons.forEach(button => {
        button.addEventListener('click', function () {
            timeButtons.forEach(btn => btn.classList.remove('selected'));

            this.classList.add('selected');

            selectedBotTime = this.getAttribute('data-time');
        });
    });

    const defaultTimeBtn = document.querySelector(`.time-select[data-time="${selectedBotTime}"]`);
    if (defaultTimeBtn) {
        defaultTimeBtn.classList.add('selected');
    }
    const defaultColorBtn = document.querySelector(`.color-select[data-color="${selectedBotColor}"]`);
    if (defaultColorBtn) {
        defaultColorBtn.classList.add('selected');
    }
    // 3. LOGIC BẮT ĐẦU GAME BOT
    const startBotGameBtn = document.getElementById('start-bot-game-btn');
    if (startBotGameBtn) {
        startBotGameBtn.addEventListener('click', () => {

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
            fetch('/api/game/clear_cache', { method: 'POST' });

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
        messageElement.classList.add('p-2', 'my-2', 'rounded-3');

        if (isBot) {
            messageElement.classList.add('bg-success', 'text-white', 'me-auto');
        } else {
            messageElement.classList.add('bg-secondary', 'text-white', 'ms-auto', 'text-end');
        }

        messageElement.innerHTML = text;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // ===== THANH ĐIỂM =====

    // Hàm giả lập cập nhật thanh điểm
    function updateEvaluationBar(score, fen) {
        const evalBar = document.getElementById('eval-white-advantage');
        const evalScoreText = document.getElementById('evaluation-score');
        let formattedScore = "0.00"; // Điểm mặc định
        let percentAdvantage = 50;   // Thanh 50% mặc định

        // 1. Tạo bản sao game cục bộ để kiểm tra FEN
        let localGame = null;
        if (fen) {
            localGame = new Chess(fen);
        } else {
            localGame = game;
        }

        // === LOGIC MỚI: KIỂM TRA GAME OVER TRƯỚC ===
        if (localGame.game_over()) {
            if (localGame.in_checkmate()) {
                formattedScore = (localGame.turn() === 'b') ? "1-0" : "0-1";
                percentAdvantage = (localGame.turn() === 'b') ? 100 : 0;
            } else {
                formattedScore = "1/2-1/2";
                percentAdvantage = 50;
            }
            evalBar.style.height = `${percentAdvantage}%`;
            evalScoreText.textContent = formattedScore;
            return;
        }
        // ==========================================

        // 2. XỬ LÝ ĐIỂM SỐ (NẾU GAME CHƯA KẾT THÚC)
        if (typeof score === 'string' && (score.includes('M') || score.includes('#'))) {


            formattedScore = score.replace("#", "M");

            // Xác định ai đang thắng để tô màu thanh bar
            // Nếu chuỗi chứa '+' (VD: +M2) -> Trắng thắng (100%)
            // Nếu chuỗi chứa '-' (VD: -M3) -> Đen thắng (0%)
            if (score.includes('+')) {
                percentAdvantage = 100;
            } else if (score.includes('-')) {
                percentAdvantage = 0;
            } else {
                percentAdvantage = 50;
            }
        } else if (typeof score === 'number') {
            // Xử lý điểm số Centipawn (ví dụ: 48 hoặc 999996)

            // Đặt ngưỡng MATE
            const MATE_THRESHOLD = JS_MATE_SCORE_BASE - JS_MATE_DEPTH_ADJUSTMENT;

            // 2a. XỬ LÝ MATE-IN-X
            if (Math.abs(score) > MATE_THRESHOLD) {
                // Tính số nước đi (ví dụ: 1000000 - 999997 = 3 nước)
                const movesToMate = JS_MATE_SCORE_BASE - Math.abs(score);

                formattedScore = (score > 0) ? `M+${movesToMate}` : `M-${movesToMate}`;
                percentAdvantage = (score > 0) ? 100 : 0;
            }
            // 2b. XỬ LÝ ĐIỂM TỐT THÔNG THƯỜNG
            else {
                const pawnScore = score; // Chuyển 48 thành 0.48
                const MAX_EVAL_DISPLAY_PAWNS = 10.0;

                let cappedScore = Math.max(-MAX_EVAL_DISPLAY_PAWNS, Math.min(MAX_EVAL_DISPLAY_PAWNS, pawnScore));
                percentAdvantage = 50 + (cappedScore / (MAX_EVAL_DISPLAY_PAWNS * 2)) * 100;

                const displayScore = pawnScore;
                if (displayScore > 0) {
                    formattedScore = `+${displayScore.toFixed(2)}`;
                } else {
                    formattedScore = `${displayScore.toFixed(2)}`;
                }
            }
        }
        // 3. XỬ LÝ LỖI (NaN, v.v.)
        else {
            formattedScore = "0.00";
            percentAdvantage = 50;
        }

        // Cập nhật UI
        evalBar.style.height = `${percentAdvantage}%`;
        evalScoreText.textContent = formattedScore;
    }


    // Hàm khởi tạo bàn cờ (Chỉ gọi khi vào màn hình chính)
    function initChessboard(orientation = 'white') {
        if (board) {
            board.destroy();
        }
        game = new Chess(STARTING_FEN);
        moveHistory = [];
        currentFenIndex = 0;
        moveHistory.push({ fen: STARTING_FEN, score: "0.00" });
        const config = {

            draggable: true,
            position: STARTING_FEN,
            pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png',
            orientation: orientation,
            onDrop: onDrop,
            onDragStart: onDragStart,
            onSnapEnd: onSnapEnd
        };

        board = Chessboard('myBoard', config);
        window.addEventListener('resize', () => {
            board.resize();
            syncBoardAndEvalHeight();
        });
        syncBoardAndEvalHeight();

        // Giả lập điểm ban đầu
        updateEvaluationBar(0.0, STARTING_FEN);
        // updateUI(STARTING_FEN);

        // Đảm bảo bàn cờ điều chỉnh kích thước khi cửa sổ thay đổi
        window.addEventListener('resize', board.resize);
    }

    // Hàm khớp chiều cao thanh điểm và bàn cờ
    function syncBoardAndEvalHeight() {
        const boardContainer = document.getElementById('chessboard-main-container');
        const scoreBarContainer = document.querySelector('.score-bar-container');
        const evalScore = document.getElementById('evaluation-score');
        const wrapper = document.querySelector('.score-alignment-wrapper');

        if (!boardContainer || !scoreBarContainer || !wrapper) return;

        const totalBoardAreaHeight = boardContainer.offsetHeight; // Chiều cao tổng của bàn cờ
        wrapper.style.height = `${totalBoardAreaHeight}px`;

        const scoreHeight = evalScore ? evalScore.offsetHeight : 0;
        const verticalSpacing = 20; // Khoảng margin/padding giữa bar và điểm số

        const targetBarContainerHeight = totalBoardAreaHeight - scoreHeight - verticalSpacing;

        scoreBarContainer.style.height = `${targetBarContainerHeight}px`;
    }


    // Hàm kiểm soát nước đi
    async function makeMove(moveUci) {
        const currentFen = game.fen();
        const move = game.move(moveUci, { sloppy: true });
        if (move === null) {
            return false;
        }
        game.undo();
        try {
            const response = await fetch('/api/game/make_move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move: moveUci, fen: currentFen })
            });
            const data = await response.json();

            if (data.success) {
                const newFen = data.fen;

                if (currentFenIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                }

                moveHistory.push({ fen: newFen, score: null });

                currentFenIndex = moveHistory.length - 1;
                game.move(moveUci, { sloppy: true });
                board.position(game.fen());

                return true;

            } else {
                console.error('Lỗi Backend (make_move):', data.error);
                return false;
            }
        } catch (error) {
            console.error('Lỗi mạng/server:', error);
            return false;
        }
    }

    // Xử lý sự kiện kéo thả
    async function onDrop(source, target) {
        let moveUci = source + target;

        // --- 1: KIỂM TRA PHONG CẤP (KHÔNG KIỂM TRA TÍNH HỢP LỆ) ---
        const pieceObj = game.get(source);
        let isPawnPromotion = false;

        // Chỉ kiểm tra nếu quân đang được kéo là Tốt ('p')
        if (pieceObj && pieceObj.type === 'p') {

            // Kiểm tra Tốt Trắng phong cấp ở hàng 8
            if (pieceObj.color === 'w' && target[1] === '8') {
                isPawnPromotion = true;
            }
            // Kiểm tra Tốt Đen phong cấp ở hàng 1
            else if (pieceObj.color === 'b' && target[1] === '1') {
                isPawnPromotion = true;
            }
        }

        // --- 2: MẶC ĐỊNH PHONG HẬU VÀ THỰC HIỆN NƯỚC ĐI ---

        if (isPawnPromotion) {
            // Auto promote Queen
            moveUci += 'q';
        }
        const success = await makeMove(moveUci);

        // --- 3: XỬ LÝ KẾT QUẢ ---
        if (success) {
            await handleTurnEnd(game.fen());
        }

        if (!success) {
            return 'snapback';
        }
    }


    function onSnapEnd() {
        if (board.fen() !== game.fen()) {
            board.position(game.fen());
        }
    }

    function updateAllHighlights() {
        // 1. Xóa tất cả highlight cũ
        document.querySelectorAll('#myBoard .square-55d63').forEach(square => {
            square.classList.remove('square-selected'); // Vàng
            square.classList.remove('highlight-move');  // Chấm xanh
            square.classList.remove('highlight-check'); // Đỏ
        });

        // 2. Highlight Vua bị chiếu (Ô Đỏ)
        if (game.in_check()) {
            const kingSquare = findKingSquare(game.turn());
            if (kingSquare) {
                document.querySelector(`#myBoard .square-${kingSquare}`).classList.add('highlight-check');
            }
        }

        // 3. Highlight Nước đi Cuối cùng (Ô Vàng)
        const history = game.history({ verbose: true });
        if (history.length > 0) {
            const lastMove = history[history.length - 1];
            // Chỉ highlight nếu FEN hiện tại là FEN cuối cùng
            if (currentFenIndex === moveHistory.length - 1) {
                document.querySelector(`#myBoard .square-${lastMove.from}`).classList.add('square-selected');
                document.querySelector(`#myBoard .square-${lastMove.to}`).classList.add('square-selected');
            }
        }
    }

    /**
 * Tìm Vua (Helper function, cần 'game' toàn cục)
 * @param {string} color Màu 'w' hoặc 'b'
 */
    function findKingSquare(color) {

        const squares = [
            'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
            'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
            'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
            'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
        ];
        for (const square of squares) {
            const piece = game.get(square); // game.get() là hàm đúng
            if (piece && piece.type === 'k' && piece.color === color) {
                return square;
            }
        }
        return null;
    }


    /**
     * Tiền xử lý  điểm số thô từ engine trước khi gửi đến thanh điểm.
     * Hàm này đóng vai trò "điều phối":
     * - Nếu là chuỗi Mate ("#+1"), nó sẽ gửi thẳng chuỗi đó.
     * - Nếu là chuỗi số ("98"), nó chuyển sang số (98) và gửi đi.
     * - Nếu lỗi, nó gửi 0.0.
     *
     * @param {string} scoreText Điểm số thô dạng chuỗi (centipawn hoặc mate) nhận từ engine.
     * @param {string} fen FEN của thế cờ, dùng để truyền xuống updateEvaluationBar.
     */
    function handleScoreUpdate(scoreText, fen) {
        if (typeof scoreText === 'string' && (scoreText.includes('M') || scoreText.includes('#'))) {
            updateEvaluationBar(scoreText, fen);
        } else {
            const scoreInCentipawns = parseFloat(scoreText);

            if (!isNaN(scoreInCentipawns)) {
                updateEvaluationBar(scoreInCentipawns, fen);
            } else {
                updateEvaluationBar(0.0, fen);
            }
        }
    }


    async function handleTurnEnd(newFen) {

        updateAllHighlights();
        updateUI(newFen);

        // 1. Dừng đồng hồ của Người chơi
        if (isTimedGame) {
            clearInterval(timerInterval);
        }

        // 2. KIỂM TRA GAME OVER (Do Người chơi gây ra)
        // (Phải kiểm tra trước khi fetch hoặc bật timer mới)
        if (game.game_over()) {
            if (isTimedGame) clearInterval(timerInterval); // Đảm bảo tắt hẳn
            updateEvaluationBar(0, newFen);

            let title = "Ván đấu kết thúc";
            let body = "Ván cờ hòa!";
            if (game.in_checkmate()) {
                const winner = (game.turn() === 'b') ? 'Trắng' : 'Đen';
                body = `Chiếu hết! ${winner} thắng cuộc.`;
            }

            setTimeout(() => { showGameOverModal(title, body); }, 200);
            isPlayerTurn = true;
            return; // Dừng mọi thứ
        }

        // 3. Lấy điểm của User (Chạy ngầm, không 'await')
        // Bằng cách dùng .then(), chúng ta cho phép code chạy tiếp
        // mà không cần chờ 4 giây.
        fetchDeepEvaluation(newFen).then(scoreText => {
            if (scoreText && moveHistory[currentFenIndex]) {
                moveHistory[currentFenIndex].score = scoreText;
            }
        });

        // 4. Quyết định lượt đi tiếp theo
        if (playerColor !== null && game.turn() !== playerColor) {
            // === ĐẾN LƯỢT BOT ===
            // Bật đồng hồ cho Bot NGAY LẬP TỨC
            if (isTimedGame) {
                startTimer(game.turn());
            }
            await handleBotTurn(); // Chờ Bot đi (Bot sẽ tự bật đồng hồ User)
        } else {
            // === CHẾ ĐỘ PHÂN TÍCH ===
            if (isTimedGame) {
                startTimer(game.turn());
            }
            isPlayerTurn = true;
        }
    }

    async function handleBotTurn() {
        isPlayerTurn = false;
        try {
            const response = await fetch('/api/game/bot_move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: game.fen(), time_limit: selectedBotTime })
            });

            const data = await response.json();

            // Dừng đồng hồ của Bot NGAY KHI có kết quả
            if (isTimedGame) clearInterval(timerInterval);

            if (data.success && data.move_uci) {
                const botMoveUci = data.move_uci;
                const newFen = data.fen;
                const evalScoreText = data.evaluation;

                // --- XỬ LÝ NƯỚC ĐI CỦA BOT ---
                // (Cập nhật cache, game.move, board.position, updateUI, handleScoreUpdate...)
                if (currentFenIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                }
                moveHistory.push({ fen: newFen, score: evalScoreText });
                currentFenIndex = moveHistory.length - 1;

                game.move(botMoveUci, { sloppy: true });
                board.position(game.fen());
                updateAllHighlights();

                updateUI(newFen);
                handleScoreUpdate(evalScoreText, newFen);
                console.log(`Điểm tìm kiếm (Bot Move): ${evalScoreText}`);
                // ---------------------------

                if (game.game_over()) {
                    if (isTimedGame) clearInterval(timerInterval);
                    updateEvaluationBar(0, newFen);

                    let title = "Ván đấu kết thúc";
                    let body = "Ván cờ hòa!";
                    if (game.in_checkmate()) {
                        const winner = (game.turn() === 'b') ? 'Trắng' : 'Đen';
                        body = `Chiếu hết! ${winner} thắng cuộc.`;
                    }
                    setTimeout(() => {
                        showGameOverModal(title, body);
                    }, 200);

                } else {
                    // Nếu game chưa kết thúc -> BẬT ĐỒNG HỒ CHO NGƯỜI CHƠI
                    if (isTimedGame) {
                        startTimer(game.turn());
                    }
                }

            } else {
                console.error('Bot Error:', data.error);
                // Nếu lỗi, trả lại lượt cho người chơi
                if (isTimedGame) startTimer(game.turn());
            }
        } catch (error) {
            console.error('Lỗi kết nối Bot:', error);
            if (isTimedGame) startTimer(game.turn());
        }
        isPlayerTurn = true; // Mở khóa bàn cờ cho người chơi
    }


    function onDragStart(source, piece, position, orientation) {

        if (!isPlayerTurn) {
            return false;
        }

        if (game.turn() !== piece[0]) {
            return false;
        }

        updateAllHighlights();

        const moves = game.moves({
            square: source,
            verbose: true
        });


        if (moves.length === 0) {
            return false;
        }


        for (const move of moves) {
            document.querySelector(`#myBoard .square-${move.to}`).classList.add('highlight-move');
        }


        return true;
    }

    /**
     *  Hàm cập nhật lịch sử pgn
     *
     */
    function updatePgnHistory() {
        const historyList = document.getElementById('pgn-history-list');
        if (!historyList) {
            return;
        }

        // Lấy lịch sử nước đi từ đối tượng game (Chess.js)
        const history = game.history({ verbose: true });

        let pgnHtml = '';

        for (let i = 0; i < history.length; i++) {
            const move = history[i];

            // Nước đi là của Trắng
            if (i % 2 === 0) {
                const moveNumber = (i / 2) + 1;
                // Thêm số lượt (ví dụ: 1.)
                pgnHtml += `<span class="move-number me-1">${moveNumber}.</span>`;
            }

            let highlightClass = '';
            if (i + 1 === currentFenIndex) {
                highlightClass = 'current-move-highlight';
            }

            // Thêm nước đi với class tương ứng
            pgnHtml += `<span class="move-text me-2 ${highlightClass}" data-index="${i + 1}">${move.san}</span>`;
        }

        historyList.innerHTML = pgnHtml;

        historyList.parentElement.scrollLeft = historyList.scrollWidth;
    }


    // Hàm truyền điểm số vào thanh điểm
    async function fetchDeepEvaluation(fen) {
        try {
            const response = await fetch('/api/game/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: fen })
            });
            const data = await response.json();

            if (data.success && data.engine_results && data.engine_results.search_score !== undefined) {

                // Lấy điểm Search Score để phản ánh lợi thế thực tế
                const searchScoreText = data.engine_results.search_score;

                handleScoreUpdate(searchScoreText, fen); // Thêm fen

                console.log(`Điểm tìm kiếm (Search Score) mới: ${searchScoreText}`);
                return searchScoreText;

            } else if (data.success && data.engine_results && data.engine_results.search_score === 'Game Over') {
                // Xử lý trường hợp Game Over (ví dụ: đặt thanh điểm về 0 hoặc hiển thị trạng thái hòa/thắng)
                console.log('Ván đấu đã kết thúc. Không cập nhật thanh điểm.');
                updateEvaluationBar(0, fen);

            } else {
                console.error('Lỗi tính toán điểm số hoặc dữ liệu không hợp lệ:', data.error || data);
                return null;
            }
        } catch (error) {
            console.error('Lỗi mạng/server khi tính điểm số:', error);
        }
    }

    // ==== Các button điều hướng nước đi =====

    /**
     * Tải trạng thái bàn cờ từ lịch sử dựa trên chỉ số (index).
     * Đồng bộ hóa cả giao diện (board), logic game (chess.js) và điểm số.
     *
     * @param {number} index - Chỉ số của nước đi trong mảng moveHistory cần tải.
     * @returns {void}
     */
    function loadFen(index) {
        if (index < 0 || index >= moveHistory.length) {
            return;
        }
        // 1. Cập nhật chỉ mục hiện tại
        currentFenIndex = index;
        const historyItem = moveHistory[currentFenIndex];

        // 2. Tải FEN lên bàn cờ và đối tượng game
        const fenToLoad = historyItem.fen;
        const scoreToLoad = historyItem.score;

        board.position(fenToLoad);
        updateAllHighlights();

        if (scoreToLoad) {
            handleScoreUpdate(scoreToLoad, fenToLoad);
        }
        // 5. Cập nhật PGN và các nút
        updateUI(fenToLoad);
    }

    // Hàm cập nhật giao diện
    function updateUI(fen) {
        updateButtonState();
        updatePgnHistory();
    }

    // Các nút điều chỉnh Fen hiện tại
    $(document).ready(function () {

        $('.button-group-container button').on('click', function () {
            const action = $(this).data('action');

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
                    $('#loadDataModal').modal('show');
                    break;
                default:
                    break;
            }

            updateButtonState();
        });

        // Xử lý click vào danh sách PGN (Event Delegation)
        $('#pgn-history-list').on('click', '.move-text', function () {
            const index = parseInt($(this).data('index'));
            if (!isNaN(index)) {
                loadFen(index);
            }
        });
        updateButtonState();
    });

    function updateButtonState() {
        const isFirstMove = currentFenIndex <= 0;
        const isLastMove = currentFenIndex >= moveHistory.length - 1;

        $('[data-action="first"]').prop('disabled', isFirstMove);
        $('[data-action="prev"]').prop('disabled', isFirstMove);
        $('[data-action="next"]').prop('disabled', isLastMove);
        $('[data-action="last"]').prop('disabled', isLastMove);
    }

    // Hàm thiết lập lại trò chơi về trạng thái ban đầu
    function clearBoard() {
        // 1. Lấy hướng bàn cờ hiện tại
        if (!board) {
            console.error("Lỗi: Board chưa được khởi tạo.");
            return;
        }
        // Lấy hướng bàn cờ trước khi nó bị phá hủy bởi initChessboard
        const currentOrientation = board.orientation();
        fetch('/api/game/clear_cache', { method: 'POST' });

        // 2. TÁI KHỞI TẠO BÀN CỜ VÀ LỊCH SỬ MỚI
        initChessboard(currentOrientation);

        // 3. ĐỒNG BỘ HÓA THANH ĐIỂM
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        if (scoreWrapper) {
            if (playerColor === 'b') {
                scoreWrapper.classList.add('rotated-score');
            } else {
                scoreWrapper.classList.remove('rotated-score');
            }
        }

        // 4. Kích hoạt Bot nếu nó là quân Trắng (người chơi là Đen)
        if (playerColor === 'b') {
            handleBotTurn();
        }
    }



    // ===== TÍCH HỢP AI GEMINI =====

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
                    <span></span>
                    <span></span>
                    <span></span>
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
        const history = game.history({ verbose: true });
        let lastMoveSan = 'N/A';
        if (history.length > 0) {
            lastMoveSan = history[history.length - 1]?.san;
        }

        // 6. Gửi yêu cầu
        try {
            const response = await fetch('/api/analysis/chat_analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: true });

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

    // ====== LOAD DATA ======

    document.getElementById('confirm-load-btn').addEventListener('click', async () => {

        let success = false;
        let fenToLoad = null;

        // 1. Lấy tab đang hoạt động
        const activeTab = document.querySelector('.tab-pane.fade.show.active');
        const activeTabId = activeTab ? activeTab.id : null;

        // 2. Xử lý theo từng loại dữ liệu

        if (activeTabId === 'pgn-pane') {
            const pgnText = document.getElementById('pgn-input').value.trim();
            if (pgnText) {
                success = game.load_pgn(pgnText);
                if (success) {
                    fenToLoad = game.fen(); // Lấy FEN của vị trí cuối cùng
                }
            }
        }

        else if (activeTabId === 'fen-pane') {
            const fenText = document.getElementById('fen-input').value.trim();
            if (fenText) {
                success = game.load(fenText);
                if (success) {
                    fenToLoad = fenText;
                }
            }
        }

        else if (activeTabId === 'image-pane') {
            const imageInput = document.getElementById('image-upload-input');
            const statusEl = document.getElementById('image-upload-status');

            if (imageInput.files.length === 0) {
                statusEl.textContent = 'Lỗi: Vui lòng chọn một file ảnh.';
                return;
            }

            const file = imageInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            statusEl.textContent = 'Đang tải lên và phân tích...';

            // Gọi API Backend
            const response = await fetch('/api/image/analyze_image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                success = true;
                fenToLoad = data.fen;
                statusEl.textContent = 'Thành công! FEN: ' + fenToLoad;
            } else {
                statusEl.textContent = `Lỗi: ${data.error} `;
                return;
            }
        }
        else if (activeTabId === 'live-scan-pane') {
            const statusEl = document.getElementById('scan-status');

            if (!currentWebcamStream) {
                statusEl.textContent = 'Lỗi: Camera chưa được bật.';
                return;
            }

            statusEl.textContent = 'Đang chụp và phân tích...';

            // 1. Tạo một canvas ẩn để "chụp ảnh"
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // 2. Chuyển ảnh từ canvas sang file (Blob)
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

            // 3. Gửi file (Blob) đến API
            const formData = new FormData();
            formData.append('file', blob, 'webcam-scan.jpg');

            const response = await fetch('/api/image/analyze_image', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                success = true;
                fenToLoad = data.fen;
                statusEl.textContent = 'Thành công! FEN: ' + fenToLoad;
                stopWebcam(); // Tắt camera sau khi thành công
            } else {
                statusEl.textContent = `Lỗi: ${data.error} `;
                return;
            }
        }

        // 3. Xử lý kết quả và cập nhật giao diện
        if (success && fenToLoad) {
            // Cập nhật bàn cờ với vị trí mới
            game.load(fenToLoad);
            board.position(fenToLoad);
            fetch('/api/game/clear_cache', { method: 'POST' });
            moveHistory = [{ fen: fenToLoad, score: null }]; // Tạo cache mới
            currentFenIndex = 0;

            await fetchDeepEvaluation(fenToLoad);
            updateUI(fenToLoad);
            if (loadDataModalInstance) {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                loadDataModalInstance.hide();
            }

        } else if (activeTabId === 'pgn-pane' || activeTabId === 'fen-pane') {
            alert("Lỗi: Dữ liệu PGN/FEN không hợp lệ. Vui lòng kiểm tra lại.");
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

        // 2. Logic Đóng Modal (Nút đóng bên trong Modal)
        // Giả định nút đóng có class 'close-btn' hoặc tương tự bên trong Modal
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

    // Hàm xử lý modal game over
    const gameOverModalEl = document.getElementById('gameOverModal');
    if (gameOverModalEl) {
        gameOverModalInstance = new bootstrap.Modal(gameOverModalEl, {
            keyboard: false,
            backdrop: 'static'
        });
    }

    function showGameOverModal(title, body) {
        const titleEl = document.getElementById('gameOverModalTitle');
        const bodyEl = document.getElementById('gameOverModalBody');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;

        if (gameOverModalInstance) {
            gameOverModalInstance.show();
        }
    }

    /**
     * Bật camera của người dùng và hiển thị lên thẻ <video>
     */
    async function startWebcam() {
        if (currentWebcamStream) {
            stopWebcam();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment'
                }
            });
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
    const AUTO_SCAN_DELAY = 5000; // 5 giây quét 1 lần (để kịp API trả về)

    const autoScanToggle = document.getElementById('auto-scan-toggle');
    const captureBtn = document.getElementById('capture-btn');

    // Hàm thực hiện quy trình chụp và gửi
    async function performScan() {
        const statusEl = document.getElementById('scan-status');

        if (!currentWebcamStream) {
            statusEl.textContent = '⚠️ Camera chưa bật!';
            if(autoScanToggle) autoScanToggle.checked = false;
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

            const response = await fetch('/api/image/analyze_image', {
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
                        fetchDeepEvaluation(newFen); // Gọi Alice/Engine đánh giá luôn

                        // Phát âm thanh nhẹ nhàng báo hiệu đã nhận
                        // (Optional) new Audio('/static/sounds/move.mp3').play();
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
        autoScanToggle.addEventListener('change', function() {
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
            if(autoScanToggle) autoScanToggle.checked = false;
            clearTimeout(autoScanInterval);
            await performScan();
        });
    }

});
