
    let board = null;
    let game = null;
    let moveHistory = [];
    let currentFenIndex = 0;
    const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    let pendingPromotion = null;
    let playerColor = null;
    let isPlayerTurn = true;
    let selectedBotColor = 'w';
    let selectedBotTime = '5';
    let whiteTime = 0;
    let blackTime = 0;
    let timerInterval = null;
    const JS_MATE_SCORE_BASE = 1000000;
    const JS_MATE_DEPTH_ADJUSTMENT = 500;

document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname-input');
    const chatbotMessages = document.getElementById('chatbot-messages');

    const userDisplaySpan = document.getElementById('user-display');
    const loginButton = document.getElementById('login-button');

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
            loginButton.classList.add('d-none');
        }

        // 3. Chatbot chào mừng
        const welcomeMessage = `Chào bạn, ${nickname}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;
        displayChatbotMessage(welcomeMessage);

        // Cập nhật tên người dùng trong tiêu đề
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
        if (loginButton) {
        loginButton.addEventListener('click', () => {
            alert('Chức năng Đăng nhập đang được phát triển (Sẽ tích hợp Google OAuth tại đây).');
        });
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

            // === THÊM LOGIC MỚI VÀO ĐÂY ===
            if (selectedMode === 'analyze') {
                setAnalyzeMode();
            }
            // (Nút 'Chơi với Bot' đã được xử lý bằng Modal riêng)
            // =============================
        });
    });



    function setAnalyzeMode() {
        // 1. Dừng và reset đồng hồ
        resetTimers(); // Hàm này bạn đã có

        // 2. Reset biến trạng thái Bot
        playerColor = null;
        isPlayerTurn = true;

        // 3. Khởi tạo lại bàn cờ về hướng 'white'
        // Hàm initChessboard đã tự động reset FEN, lịch sử, v.v.
        initChessboard('white');

        // 4. Bỏ xoay (nếu có)
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
        // (Vì moveHistory đã được reset, chúng ta cần gọi hàm này
        // để lấy điểm 0.00 cho FEN ban đầu)
        handleScoreUpdate("0.00");
    }
      // Gắn sự kiện cho nút "Chơi với Bot" trên Navbar
    setupModalBehavior('bot-settings-modal', '#nav-play-bot');



    const timeButtons = document.querySelectorAll('.time-select');

    timeButtons.forEach(button => {
        button.addEventListener('click', function() {
            timeButtons.forEach(btn => btn.classList.remove('selected'));

            this.classList.add('selected');

            selectedBotTime = this.getAttribute('data-time');
        });
    });

    const defaultTimeBtn = document.querySelector(`.time-select[data-time="${selectedBotTime}"]`);
    if (defaultTimeBtn) {
        defaultTimeBtn.classList.add('selected');
    }

    // 3. LOGIC BẮT ĐẦU GAME BOT (Nút "Bắt đầu" trong Modal)
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
        let formattedScore;
        let localGame = null;
        if (fen) {
            localGame = new Chess(fen);
        } else {
            localGame = game; // Dự phòng (fallback)
        }

        // 1. XỬ LÝ ĐIỂM CHIẾU HẾT (MATE SCORE)
        if (typeof score === 'string' && score.startsWith('#')) {

            // Chuyển "#+1" thành "M1" (hoặc bất cứ thứ gì bạn muốn)
            // Logic tính M_in_X của bạn (dòng 225) đã SAI
            // Hãy tin vào điểm #+1 (Mate in 1) hoặc #+5 (Mate in 5) từ engine
            formattedScore = score.replace("#+", "M+").replace("#-", "M-");

            const percentAdvantage = (score.includes('+')) ? 100 : 0;
            evalBar.style.height = `${percentAdvantage}%`;

        }
        // 2. XỬ LÝ ĐIỂM SỐ THÔNG THƯỜNG (PAWN SCORE)
        else if (typeof score === 'number') {

            // GIỚI HẠN HIỂN THỊ LÀ 10 TỐT (thay vì 1000)
            const MAX_EVAL_DISPLAY_PAWNS = 10.0;

            let cappedScore = Math.max(-MAX_EVAL_DISPLAY_PAWNS, Math.min(MAX_EVAL_DISPLAY_PAWNS, score));
            const percentAdvantage = 50 + (cappedScore / (MAX_EVAL_DISPLAY_PAWNS * 2)) * 100;

            evalBar.style.height = `${percentAdvantage}%`;

            const displayScore = score;

            if (displayScore > 0) {
                formattedScore = `+${displayScore.toFixed(2)}`;
            } else {
                // Bao gồm cả 0.00 và số âm
                formattedScore = `${displayScore.toFixed(2)}`;
            }
        }
        // 3. XỬ LÝ CÁC TRƯỜNG HỢP LỖI KHÁC (NaN, v.v.)
        else {
            formattedScore = "0.00";
            evalBar.style.height = '50%';
        }

        evalScoreText.textContent = formattedScore;

        // 3. XỬ LÝ KHI GAME KẾT THÚC (TỶ SỐ)
        if (localGame.game_over()) {
            if (localGame.in_checkmate()) {
                if (localGame.turn() === 'b') {
                    evalScoreText.textContent = "1-0";
                } else {
                    evalScoreText.textContent = "0-1";
                }
            } else if (localGame.in_draw()) {
                evalScoreText.textContent = "1/2-1/2";
            }
        }
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
            onDrop: onDrop, // Hàm xử lý khi thả quân cờ
            onDragStart: onDragStart,
            onSnapEnd: onSnapEnd // Hàm xử lý sau khi di chuyển
        };

        board = Chessboard('myBoard', config);
        // addSquareClickListener();
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

                // Thêm đối tượng mới với FEN
                moveHistory.push({ fen: newFen, score: null });

                currentFenIndex = moveHistory.length - 1;
                game.move(moveUci, { sloppy: true });
                board.position(game.fen());

                return true; // Nước đi thành công

            } else {
                console.error('Lỗi Backend (make_move):', data.error);
                return false;
            }
            } catch (error) {
                console.error('Lỗi mạng/server:', error);
                return false;
            }
        }

    // Xử lý sự kiện kéo thả (onDrop)
    async function onDrop(source, target) {
        let moveUci = source + target;

        // --- BƯỚC 1: KIỂM TRA PHONG CẤP (KHÔNG KIỂM TRA TÍNH HỢP LỆ) ---
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

        // --- BƯỚC 2: MẶC ĐỊNH PHONG HẬU VÀ THỰC HIỆN NƯỚC ĐI ---

        if (isPawnPromotion) {
            // Auto promote Queen
            moveUci += 'q';
        }
        const success = await makeMove(moveUci);

        // --- BƯỚC 3: XỬ LÝ KẾT QUẢ ---
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

    async function handleTurnEnd(newFen) {
        // 1. Kiểm tra kết thúc Game
        updateUI(newFen);
        if (game.game_over()) {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
                updateEvaluationBar(0);
            }
            return;
        }

        // 2. Chuyển đổi Đồng hồ (Chỉ khi có timer)
        if (timerInterval) {
            startTimer(game.turn());
        }

        // 3. TÍNH ĐIỂM SỐ MỚI (Chỉ tính 1 lần sau mỗi lượt)

        // 4. Kiểm tra và gọi Bot
        if (playerColor !== null && game.turn() !== playerColor) {
            // Bot sẽ tự gọi handleTurnEnd() sau khi nó đi xong
            await handleBotTurn();
        } else {
            const scoreText = await fetchDeepEvaluation(newFen);
            if (scoreText && moveHistory[currentFenIndex]) {
                moveHistory[currentFenIndex].score = scoreText;
            }
        }
    }

    function handleScoreUpdate(scoreText, fen) { // Thêm fen
        if (typeof scoreText === 'string' && scoreText.startsWith('#')) {
            updateEvaluationBar(scoreText, fen); // Truyền fen
        } else {
            const evaluationValueCentipawns = parseFloat(scoreText);
            if (!isNaN(evaluationValueCentipawns)) {
                const evaluationValuePawns = evaluationValueCentipawns / 100.0;
                updateEvaluationBar(evaluationValuePawns, fen); // Truyền fen
            } else {
                updateEvaluationBar(0.0, fen); // Truyền fen
            }
        }
    }

    // Hàm xử lý lượt đi của Bot
    async function handleBotTurn() {

        isPlayerTurn = false;
        try {
            const response = await fetch('/api/game/bot_move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: game.fen(), time_limit: selectedBotTime})
            });
            const data = await response.json();

             if (data.success) {
                const botMoveUci = data.move_uci;
                const newFen = data.fen;
                const evalScoreText = data.evaluation;

                // 1. Cập nhật Lịch sử FEN (QUAN TRỌNG)
                if (currentFenIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                }
                // Thêm đối tượng mới VỚI CẢ FEN VÀ ĐIỂM SỐ
                moveHistory.push({ fen: newFen, score: evalScoreText });
                currentFenIndex = moveHistory.length - 1;

                // 2. Thực hiện nước đi trên đối tượng game và board
                game.move(botMoveUci, { sloppy: true });
                board.position(game.fen());

                updateUI(newFen);
                handleScoreUpdate(evalScoreText, newFen);
                console.log(`Điểm tìm kiếm (Bot Move): ${evalScoreText}`);
                if (game.game_over()) {
                    if (timerInterval) clearInterval(timerInterval);
                } else if (timerInterval) {
                    startTimer(game.turn());
                }

            } else {
                 console.error('Bot Error:', data.error);
            }
        } catch (error) {
            console.error('Lỗi kết nối Bot:', error);
        }
        isPlayerTurn = true;
    }

    function onDragStart(source, piece, position, orientation) {
        // 1. CHẶN NẾU KHÔNG PHẢI LƯỢT CỦA NGƯỜI CHƠI
        if (!isPlayerTurn) {
            return false; // Chặn mọi thao tác kéo thả
        }

        // 2. CHẶN NẾU KHÔNG PHẢI QUÂN CỜ CỦA LƯỢT HIỆN TẠI
        // piece[0] là màu ('w' hoặc 'b')
        if (game.turn() !== piece[0]) {
            return false;
        }

        return true;
    }

    function updatePgnHistory() {
        const historyList = document.getElementById('pgn-history-list');
        if (!historyList) {
            return;
        }

        // Lấy lịch sử nước đi từ đối tượng game (Chess.js)
        const tempGame = new Chess();
        tempGame.load_pgn(game.pgn());

        const history = tempGame.history({ verbose: true });

        let pgnHtml = '';

        for (let i = 0; i < history.length; i++) {
            const move = history[i];

            // Nước đi là của Trắng (Bắt đầu lượt mới)
            if (i % 2 === 0) {
                const moveNumber = (i / 2) + 1;
                // Thêm số lượt (ví dụ: 1.)
                pgnHtml += `<span class="move-number me-1">${moveNumber}.</span>`;
            }

            let highlightClass = '';
            if (i+1 === currentFenIndex) {
                highlightClass = 'current-move-highlight';
            }

            // 3. Thêm nước đi với class tương ứng
            pgnHtml += `<span class="move-text me-2 ${highlightClass}" data-index="${i+1}">${move.san}</span>`;
        }

        historyList.innerHTML = pgnHtml;
        // $('.move-text').on('click', function() {
        //     const index = parseInt($(this).data('index'));
        //     loadFen(index); // Tải FEN tại chỉ mục đó
        // });

        // Tự động cuộn đến nước đi cuối cùng
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

                // Lấy điểm Search Score (điểm Minimax) để phản ánh lợi thế thực tế
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

        // game.load(fenToLoad);
        board.position(fenToLoad);

        if (scoreToLoad) {
            handleScoreUpdate(scoreToLoad, fenToLoad);
        } else {
            // Nếu lỡ điểm bị null, hiển thị 0.00 (tránh gọi API)
            updateEvaluationBar(0.0, fenToLoad);
        }

        // 5. Cập nhật PGN và các nút
        updateUI(fenToLoad);
    }

    // Hàm cập nhật giao diện
    async function updateUI(fen) {

        // Cập nhật trạng thái các nút (Prev/Next)
        updateButtonState();
        updatePgnHistory(game.history({ verbose: true }));
    }

    // Các nút điều chỉnh Fen hiện tại
    $(document).ready(function() {

        $('.button-group-container button').on('click', function() {
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
        $('#pgn-history-list').on('click', '.move-text', function() {
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

    // Hàm này thiết lập lại trò chơi về trạng thái ban đầu
    function clearBoard() {
        // 1. Lấy hướng bàn cờ hiện tại
        if (!board) {
            console.error("Lỗi: Board chưa được khởi tạo.");
            return;
        }
        // Lấy hướng bàn cờ trước khi nó bị phá hủy bởi initChessboard
        const currentOrientation = board.orientation();

        // 2. TÁI KHỞI TẠO BÀN CỜ VÀ LỊCH SỬ MỚI
        initChessboard(currentOrientation);

        // 3. ĐỒNG BỘ HÓA THANH ĐIỂM (score bar)
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
        const chatbox = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        if (sender === 'user') {
            messageDiv.classList.add('user-message');
        } else {
            messageDiv.classList.add('alice-message');
        }

        messageDiv.textContent = text;

        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    function createNewMessageElement(sender) {
        const chatbox = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'alice-message');
        // Gán một ID tạm thời
        messageDiv.id = `msg-${Date.now()}`;
        messageDiv.textContent = ''; // Bắt đầu bằng nội dung rỗng
        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
        return messageDiv;
    }

    document.getElementById('chatbot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        if (!message) return;

        appendMessage('user', message);
        input.value = '';
        const aliceMessageElement = createNewMessageElement('Alice');

        // 1. Lấy FEN và lịch sử hiện tại
        const currentFen = game.fen();
        const pgnHistory = game.pgn();

        // 2. Gửi yêu cầu tới Backend (/api/chat_analysis)
        try {
            const response = await fetch('/api/analysis/chat_analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_question: message,
                    fen: currentFen,
                    pgn: pgnHistory
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

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                // Giải mã phần dữ liệu nhận được
                const chunk = decoder.decode(value, { stream: true });

                for (const char of chunk) {
                    aliceMessageElement.textContent += char;
                    fullResponseText += char;

                    await sleep(STREAM_DELAY_MS);

                    const chatbox = document.getElementById('chatbot-messages');
                    chatbox.scrollTop = chatbox.scrollHeight;
                }
            }
            // --- KẾT THÚC XỬ LÝ STREAMING ---
            const finalHtml = convertSimpleMarkdownToHtml(fullResponseText);
            aliceMessageElement.innerHTML = finalHtml;
        } catch (error) {
            aliceMessageElement.textContent += ` [Lỗi: Không thể nhận phản hồi. ${error.message}]`;
            console.error('Lỗi trong Fetch API hoặc JSON:', error);
        }
    });

    // Hàm hỗ trợ chuyển đổi text
    function convertSimpleMarkdownToHtml(text) {
        // 1. Chuyển đổi **bold** sang <strong>
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 2. (Khuyến nghị) Chuyển đổi ký tự xuống dòng (\n) sang thẻ <br>
        //    để AI có thể xuống dòng khi trả lời.
        html = html.replace(/\n/g, '<br>');

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
        document.getElementById('timer-white').textContent = formatTime(whiteTime);
        document.getElementById('timer-black').textContent = formatTime(blackTime);
    }

    // =======================================================
    // HÀM HELPER: RESET/ẨN ĐỒNG HỒ (Được gọi khi chọn "Vô hạn")
    // =======================================================
    function resetTimers() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        whiteTime = 0;
        blackTime = 0;

        // Ẩn/Đưa về trạng thái mặc định trên giao diện
        const timerWhiteEl = document.getElementById('timer-white');
        const timerBlackEl = document.getElementById('timer-black');
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

        // Thời gian ban đầu (giây)
        const initialTimeSeconds = minutes * 60;
        whiteTime = initialTimeSeconds;
        blackTime = initialTimeSeconds;

        // Hiển thị đồng hồ
        document.getElementById('timer-white').style.display = 'block';
        document.getElementById('timer-black').style.display = 'block';

        updateTimerDisplay();

    }

    // =======================================================
    // HÀM BẮT ĐẦU VÀ CHUYỂN ĐỔI ĐỒNG HỒ
    // =======================================================
    function startTimer(colorToMove) {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        const whiteTimerEl = document.getElementById('timer-white');
        const blackTimerEl = document.getElementById('timer-black');

        // Cập nhật trạng thái Active (màu xanh lá cây)
        if (colorToMove === 'w') {
            whiteTimerEl.classList.add('active');
            blackTimerEl.classList.remove('active');
        } else { // chess.BLACK
            whiteTimerEl.classList.remove('active');
            blackTimerEl.classList.add('active');
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

                // Xử lý HẾT GIỜ (Flag the game)
                const winner = isWhiteTurn ? 'Đen' : 'Trắng';
                alert(`Hết giờ! ${winner} thắng cuộc.`);
                // Bạn sẽ cần thêm logic để kết thúc ván đấu
                // chessBoard.setGameOver(); // Giả định
            }
        }, 1000);
    }

    // ====== LOAD DATA ======

    setupModalBehavior('loadDataModal', '#load-pgn-btn');

    document.getElementById('confirm-load-btn').addEventListener('click', () => {

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

        // Tạm thời bỏ qua image-pane cho đến khi có Backend Vision API

        // 3. Xử lý kết quả và cập nhật giao diện
        if (success && fenToLoad) {
            // Cập nhật bàn cờ với vị trí mới
            board.position(fenToLoad);

            updateUI(fenToLoad);


        } else if (activeTabId === 'pgn-pane' || activeTabId === 'fen-pane') {
            alert("Lỗi: Dữ liệu PGN/FEN không hợp lệ. Vui lòng kiểm tra lại.");
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
            button.addEventListener('click', function() {
                // Lấy tất cả các nút trong cùng nhóm
                const group = this.parentElement.querySelectorAll('button');

                // Xóa trạng thái active khỏi tất cả các nút
                group.forEach(btn => btn.classList.remove('active'));

                // Thêm trạng thái active vào nút hiện tại
                this.classList.add('active');

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



});