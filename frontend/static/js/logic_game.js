// File: frontend/static/js/logic_game.js
// Tập hợp các hàm xử lý logic bàn cờ và nước đi.
// Các hàm sử dụng các biến toàn cục được khai báo trong main.js (board, game, moveHistory, ...)

(function () {
    if (typeof window === 'undefined') return;

    const L = {};

    L.updateEvaluationBar = function (score, fen) {
        try {
            const evalBar = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_BAR) ? window.APP_CONST.IDS.EVAL_BAR : 'eval-white-advantage');
            const evalScoreText = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_SCORE) ? window.APP_CONST.IDS.EVAL_SCORE : 'evaluation-score');
            
            if (!evalBar && !evalScoreText) return;

            let formattedScore = "0.00";
            let percentAdvantage = 50;

            // Sử dụng global game nếu không có FEN hoặc FEN khớp với game hiện tại
            let localGame = (typeof game !== 'undefined' && game) ? game : null;
            
            // Nếu FEN khác với state hiện tại, chỉ load nếu thực sự cần (ví dụ khi load ảnh)
            if (fen && localGame && fen !== localGame.fen()) {
                try {
                    localGame = new Chess(fen);
                } catch (e) {
                    localGame = game; 
                }
            }

            if (!localGame) return;

            if (!localGame) {
                // fallback tới global game nếu có thể
                if (typeof game !== 'undefined' && game && typeof game.game_over === 'function') {
                    localGame = game;
                } else {
                    // không có game hợp lệ, hiển thị trung lập
                    if (evalBar) evalBar.style.height = `${percentAdvantage}%`;
                    if (evalScoreText) evalScoreText.textContent = formattedScore;
                    return;
                }
            }

            // Kiểm tra trạng thái kết thúc ván đấu
            try {
                if (localGame.game_over && localGame.game_over()) {
                    if (localGame.in_checkmate && localGame.in_checkmate()) {
                        formattedScore = (localGame.turn() === 'b') ? "1-0" : "0-1";
                        percentAdvantage = (localGame.turn() === 'b') ? 100 : 0;
                    } else {
                        formattedScore = "1/2-1/2";
                        percentAdvantage = 50;
                    }
                    if (evalBar) evalBar.style.height = `${percentAdvantage}%`;
                    if (evalScoreText) evalScoreText.textContent = formattedScore;
                    return;
                }
            } catch (err) {
                console.warn('Error while checking game_over for eval bar:', err);
                // nếu có fen không hợp lệ và có modal, hiển thị modal không quá thường xuyên
                try {
                    if (fen && window.showInvalidFenModal && (nowTs - window._lastInvalidFenModalAt > 2000)) {
                        window._lastInvalidFenModalAt = nowTs;
                        window.showInvalidFenModal('Hệ thống nhận diện thế cờ từ ảnh chưa chính xác. Vui lòng thử chụp lại toàn bộ bàn cờ (cả hai Vua phải hiển thị).');
                    }
                } catch (inner) {
                    // lờ đi
                }
                // fallback tới trạng thái trung lập
                if (evalBar) evalBar.style.height = `${percentAdvantage}%`;
                if (evalScoreText) evalScoreText.textContent = formattedScore;
                return;
            }

            if (typeof score === 'string' && (score.includes('M') || score.includes('#'))) {
                formattedScore = score.replace("#", "M");
                if (score.includes('+')) {
                    percentAdvantage = 100;
                } else if (score.includes('-')) {
                    percentAdvantage = 0;
                } else {
                    percentAdvantage = 50;
                }
            } else if (typeof score === 'number') {
                const MATE_THRESHOLD = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_SCORE_BASE ? window.APP_CONST.ENGINE.MATE_SCORE_BASE : 1000000) - (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT ? window.APP_CONST.ENGINE.MATE_DEPTH_ADJUSTMENT : 500);

                if (Math.abs(score) > MATE_THRESHOLD) {
                    const movesToMate = (window.APP_CONST && window.APP_CONST.ENGINE && window.APP_CONST.ENGINE.MATE_SCORE_BASE ? window.APP_CONST.ENGINE.MATE_SCORE_BASE : 1000000) - Math.abs(score);
                    formattedScore = (score > 0) ? `M+${movesToMate}` : `M-${movesToMate}`;
                    percentAdvantage = (score > 0) ? 100 : 0;
                } else {
                    const pawnScore = score;
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
            } else {
                formattedScore = "0.00";
                percentAdvantage = 50;
            }

            if (evalBar) evalBar.style.height = `${percentAdvantage}%`;
            if (evalScoreText) evalScoreText.textContent = formattedScore;
        } catch (err) {
            console.warn('Error in updateEvaluationBar:', err);
            try {
                const evalBar = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_BAR) ? window.APP_CONST.IDS.EVAL_BAR : 'eval-white-advantage');
                const evalScoreText = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_SCORE) ? window.APP_CONST.IDS.EVAL_SCORE : 'evaluation-score');
                if (evalBar) evalBar.style.height = `50%`;
                if (evalScoreText) evalScoreText.textContent = '0.00';
            } catch (noop) {
            }
        }
    };

    L.initChessboard = function (orientation = 'white') {
        if (board) {
            try {
                board.destroy();
            } catch (e) {
            }
        }
        game = new Chess((window.APP_CONST && window.APP_CONST.STARTING_FEN) ? window.APP_CONST.STARTING_FEN : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        moveHistory = [];
        currentFenIndex = 0;
        moveHistory.push({fen: game.fen(), score: "0.00"});

        const config = {
            draggable: true,
            position: game.fen(),
            pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png',
            orientation: orientation,
            moveSpeed: 150,    // Nhanh hơn 200ms mặc định
            snapSpeed: 25,     // Nhanh hơn 30ms mặc định
            snapbackSpeed: 50,
            onDrop: L.onDrop,
            onDragStart: L.onDragStart,
            onSnapEnd: L.onSnapEnd
        };

        board = Chessboard('myBoard', config);

        // Khởi tạo resizer và đồng bộ chiều cao
        L.syncBoardAndEvalHeight();
        L.updateEvaluationBar(0.0, game.fen());

        // Lắng nghe resize chỉ 1 lần duy nhất
        if (!window._boardResizeHandler) {
            window._boardResizeHandler = () => {
                if (board) board.resize();
                L.syncBoardAndEvalHeight();
            };
            window.addEventListener('resize', window._boardResizeHandler);
        }
    };

    L.syncBoardAndEvalHeight = function () {
        const boardContainer = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.BOARD_CONTAINER) ? window.APP_CONST.IDS.BOARD_CONTAINER : 'chessboard-main-container');
        const scoreBarContainer = document.querySelector('.score-bar-container');
        const evalScore = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_SCORE) ? window.APP_CONST.IDS.EVAL_SCORE : 'evaluation-score');
        const wrapper = document.querySelector('.score-alignment-wrapper');

        if (!boardContainer || !scoreBarContainer || !wrapper) return;

        // Reset chiều cao trước khi đo để tránh bị kẹt ở kích thước cũ (gây overflow khi thu nhỏ)
        wrapper.style.height = '100%';
        if (scoreBarContainer) scoreBarContainer.style.height = 'auto';

        // Lấy chiều cao thực tế của vùng chứa bàn cờ sau khi reset
        const totalBoardAreaHeight = boardContainer.offsetHeight;
        
        // Đồng bộ wrapper theo px để khớp hoàn hảo
        wrapper.style.height = `${totalBoardAreaHeight}px`;

        const scoreHeight = evalScore ? evalScore.offsetHeight : 0;
        const verticalSpacing = 20; // Khoảng cách đệm
        const targetBarContainerHeight = totalBoardAreaHeight - scoreHeight - verticalSpacing;
        
        if (scoreBarContainer) {
            scoreBarContainer.style.height = `${targetBarContainerHeight}px`;
        }
    };

    L.makeMove = async function (moveUci) {
        const currentFen = game.fen();
        const move = game.move(moveUci, {sloppy: true});
        if (move === null) {
            return false;
        }
        game.undo();
        try {
            const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.MAKE_MOVE) ? window.APP_CONST.API.MAKE_MOVE : '/api/game/make_move', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({move: moveUci, fen: currentFen})
            });
            const data = await response.json();

            if (data.success) {
                const newFen = data.fen;

                if (currentFenIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                }

                moveHistory.push({fen: newFen, score: null});

                currentFenIndex = moveHistory.length - 1;
                game.move(moveUci, {sloppy: true});
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
    };

    L.onDrop = function (source, target) {
        // 1. Kiểm tra lượt đi (nếu đang ở chế độ đấu Bot)
        if (playerColor !== null && game.turn() !== playerColor) return 'snapback';

        let moveUci = source + target;
        const pieceObj = game.get(source);
        let isPromotion = false;

        // Tạm thời phong Hậu nếu là nước cờ phong cấp
        if (pieceObj && pieceObj.type === 'p') {
            if ((pieceObj.color === 'w' && target[1] === '8') || (pieceObj.color === 'b' && target[1] === '1')) {
                isPromotion = true;
                moveUci += 'q';
            }
        }

        // 2. Thử đi thử cục bộ (Instant feedback)
        const move = game.move({
            from: source,
            to: target,
            promotion: isPromotion ? 'q' : undefined
        });

        // Nếu nước đi lỗi, snapback ngay
        if (move === null) return 'snapback';

        // 3. Nếu là Nhập thành hoặc Bắt tốt qua đường, cần board.position() để cập nhật quân phụ
        // Ta gọi ở SnapEnd cho mượt
        
        // 4. Xử lý logic hậu kỳ (Async)
        L.handleLocalMove(moveUci);
    };

    L.handleLocalMove = async function (moveUci) {
        // Cập nhật lịch sử cục bộ
        if (currentFenIndex < moveHistory.length - 1) {
            moveHistory = moveHistory.slice(0, currentFenIndex + 1);
        }
        moveHistory.push({ fen: game.fen(), score: null });
        currentFenIndex = moveHistory.length - 1;

        // Cập nhật UI ngay lập tức
        L.updateAllHighlights();
        L.updateUI(game.fen());

        // Đồng bộ với backend và kích hoạt Bot
        await L.handleTurnEnd(game.fen());
    };

    L.onSnapEnd = function () {
        try {
            // Chỉ cập nhật lại position nếu thực sự cần thiết (nhập thành, bắt tốt qua đường)
            // Dùng animate = false để tránh giật lag khi đồng bộ
            if (board.fen() !== game.fen()) {
                board.position(game.fen(), false);
            }
        } catch (e) {
        }
    };

    L.updateAllHighlights = function () {
        document.querySelectorAll('#myBoard .square-55d63').forEach(square => {
            square.classList.remove('square-selected');
            square.classList.remove('highlight-move');
            square.classList.remove('highlight-check');
        });

        if (game.in_check()) {
            const kingSquare = L.findKingSquare(game.turn());
            if (kingSquare) {
                const el = document.querySelector(`#myBoard .square-${kingSquare}`);
                if (el) el.classList.add('highlight-check');
            }
        }

        const history = game.history({verbose: true});
        if (history.length > 0) {
            const lastMove = history[history.length - 1];
            if (currentFenIndex === moveHistory.length - 1) {
                const elFrom = document.querySelector(`#myBoard .square-${lastMove.from}`);
                const elTo = document.querySelector(`#myBoard .square-${lastMove.to}`);
                if (elFrom) elFrom.classList.add('square-selected');
                if (elTo) elTo.classList.add('square-selected');
            }
        }
    };

    L.findKingSquare = function (color) {
        const squares = [
            'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
            'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
            'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
            'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
        ];
        for (const square of squares) {
            const piece = game.get(square);
            if (piece && piece.type === 'k' && piece.color === color) return square;
        }
        return null;
    };

    L.handleScoreUpdate = function (scoreText, fen) {
        if (typeof scoreText === 'string' && (scoreText.includes('M') || scoreText.includes('#'))) {
            L.updateEvaluationBar(scoreText, fen);
        } else {
            const scoreInCentipawns = parseFloat(scoreText);
            if (!isNaN(scoreInCentipawns)) {
                L.updateEvaluationBar(scoreInCentipawns, fen);
            } else {
                L.updateEvaluationBar(0.0, fen);
            }
        }
    };

    L.handleTurnEnd = async function (newFen) {
        L.updateAllHighlights();
        L.updateUI(newFen);

        if (isTimedGame) {
            clearInterval(timerInterval);
        }

        // protect global game.game_over calls
        try {
            if (game && typeof game.game_over === 'function' && game.game_over()) {
                if (isTimedGame) clearInterval(timerInterval);
                L.updateEvaluationBar(0, newFen);
                let title = "Ván đấu kết thúc";
                let body = "Ván cờ hòa!";
                if (game.in_checkmate()) {
                    const winner = (game.turn() === 'b') ? 'Trắng' : 'Đen';
                    body = `Chiếu hết! ${winner} thắng cuộc.`;
                }
                setTimeout(() => {
                    if (window.showGameOverModal) window.showGameOverModal(title, body);
                }, 200);
                isPlayerTurn = true;
                return;
            }
        } catch (err) {
            console.warn('handleTurnEnd: error checking game_over - possible invalid game state:', err);
            try {
                if (window.showInvalidFenModal) window.showInvalidFenModal('Trạng thái bàn cờ hiện tại không hợp lệ. Vui lòng tải lại hoặc thử chụp lại ảnh.');
            } catch (e) {
            }
            // fallback: reset to safe state
            isPlayerTurn = true;
            return;
        }

        L.fetchDeepEvaluation(newFen).then(scoreText => {
            if (scoreText && moveHistory[currentFenIndex]) moveHistory[currentFenIndex].score = scoreText;
        });

        if (playerColor !== null && game.turn() !== playerColor) {
            if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            await L.handleBotTurn();
        } else {
            if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            isPlayerTurn = true;
        }
    };

    L.handleBotTurn = async function () {
        isPlayerTurn = false;
        try {
            const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.BOT_MOVE) ? window.APP_CONST.API.BOT_MOVE : '/api/game/bot_move', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fen: game.fen(), time_limit: selectedBotTime})
            });
            const data = await response.json();

            if (isTimedGame) clearInterval(timerInterval);

            if (data.success && data.move_uci) {
                const botMoveUci = data.move_uci;
                const newFen = data.fen;
                const evalScoreText = data.evaluation;

                if (currentFenIndex < moveHistory.length - 1) moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                moveHistory.push({fen: newFen, score: evalScoreText});
                currentFenIndex = moveHistory.length - 1;

                game.move(botMoveUci, {sloppy: true});
                board.position(game.fen());
                L.updateAllHighlights();

                L.updateUI(newFen);
                L.handleScoreUpdate(evalScoreText, newFen);
                console.log(`Điểm tìm kiếm (Bot Move): ${evalScoreText}`);

                if (game.game_over()) {
                    if (isTimedGame) clearInterval(timerInterval);
                    L.updateEvaluationBar(0, newFen);
                    let title = "Ván đấu kết thúc";
                    let body = "Ván cờ hòa!";
                    if (game.in_checkmate()) {
                        const winner = (game.turn() === 'b') ? 'Trắng' : 'Đen';
                        body = `Chiếu hết! ${winner} thắng cuộc.`;
                    }
                    setTimeout(() => {
                        if (window.showGameOverModal) window.showGameOverModal(title, body);
                    }, 200);
                } else {
                    if (isTimedGame && window.startTimer) window.startTimer(game.turn());
                }

            } else {
                console.error('Bot Error:', data.error);
                if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            }
        } catch (error) {
            console.error('Lỗi kết nối Bot:', error);
            if (isTimedGame && window.startTimer) window.startTimer(game.turn());
        }
        isPlayerTurn = true;
    };

    L.onDragStart = function (source, piece, position, orientation) {
        if (!isPlayerTurn) return false;
        if (game.turn() !== piece[0]) return false;
        L.updateAllHighlights();
        const moves = game.moves({square: source, verbose: true});
        if (moves.length === 0) return false;
        for (const move of moves) {
            const el = document.querySelector(`#myBoard .square-${move.to}`);
            if (el) el.classList.add('highlight-move');
        }
        return true;
    };

    L.updatePgnHistory = function () {
        const historyListVertical = document.getElementById('pgn-history-list-vertical');
        if (!historyListVertical) return;
        
        const history = game.history({verbose: true});
        let pgnHtml = '';
        
        for (let i = 0; i < history.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = history[i];
            const blackMove = history[i + 1];
            
            const whiteIdx = i + 1;
            const blackIdx = i + 2;
            
            const whiteHighlight = (whiteIdx === currentFenIndex) ? 'current-move-highlight' : '';
            const blackHighlight = (blackMove && blackIdx === currentFenIndex) ? 'current-move-highlight' : '';
            
            pgnHtml += `
                <tr>
                    <td class="move-number-cell">${moveNumber}.</td>
                    <td class="move-cell ${whiteHighlight}" data-index="${whiteIdx}">${whiteMove.san}</td>
                    <td class="move-cell ${blackHighlight}" data-index="${blackIdx}">${blackMove ? blackMove.san : ''}</td>
                </tr>
            `;
        }
        
        historyListVertical.innerHTML = pgnHtml;
        
        // Auto scroll to bottom
        const container = document.getElementById('pgn-history-vertical');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }

        // Logic cập nhật tên khai cuộc (Placeholder - có thể mở rộng với API thực tế)
        const openingNameEl = document.getElementById('opening-name');
        if (openingNameEl && history.length === 0) {
            openingNameEl.textContent = "Chưa bắt đầu";
        }
    };

    L.fetchDeepEvaluation = async function (fen) {
        try {
            const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.EVALUATE) ? window.APP_CONST.API.EVALUATE : '/api/game/evaluate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fen: fen})
            });
            const data = await response.json();

            if (data.success && data.engine_results && data.engine_results.search_score !== undefined) {
                const searchScoreText = data.engine_results.search_score;
                // validate fen before updating score UI
                let fenValid = true;
                try {
                    const test = new Chess(fen);
                    // basic internal board check
                    const boardArr = (typeof test.board === 'function') ? test.board() : null;
                    if (Array.isArray(boardArr)) {
                        let ok = true;
                        for (const row of boardArr) {
                            if (!Array.isArray(row)) {
                                ok = false;
                                break;
                            }
                            for (const cell of row) {
                                if (cell !== null && (typeof cell !== 'object' || typeof cell.type !== 'string')) {
                                    ok = false;
                                    break;
                                }
                            }
                            if (!ok) break;
                        }
                        if (!ok) fenValid = false;
                    }
                } catch (err) {
                    fenValid = false;
                }

                if (!fenValid) {
                    console.warn('fetchDeepEvaluation: received invalid FEN, skipping score update', fen);
                    try {
                        if (window.showInvalidFenModal) window.showInvalidFenModal('Hệ thống nhận diện thế cờ từ ảnh chưa chính xác. Vui lòng thử chụp lại.');
                    } catch (e) {
                    }
                    return null;
                }

                L.handleScoreUpdate(searchScoreText, fen);
                console.log(`Điểm tìm kiếm (Search Score) mới: ${searchScoreText}`);
                return searchScoreText;
            } else if (data.success && data.engine_results && data.engine_results.search_score === 'Game Over') {
                console.log('Ván đấu đã kết thúc. Không cập nhật thanh điểm.');
                L.updateEvaluationBar(0, fen);
            } else {
                console.error('Lỗi tính toán điểm số hoặc dữ liệu không hợp lệ:', data.error || data);
                return null;
            }
        } catch (error) {
            console.error('Lỗi mạng/server khi tính điểm số:', error);
        }
    };

    L.loadFen = function (index) {
        if (index < 0 || index >= moveHistory.length) return;
        currentFenIndex = index;
        const historyItem = moveHistory[currentFenIndex];
        const fenToLoad = historyItem.fen;
        const scoreToLoad = historyItem.score;
        board.position(fenToLoad);
        L.updateAllHighlights();
        if (scoreToLoad) L.handleScoreUpdate(scoreToLoad, fenToLoad);
        L.updateUI(fenToLoad);
    };

    L.updateUI = function (fen) {
        L.updateButtonState();
        L.updatePgnHistory();
    };

    L.updateButtonState = function () {
        const isFirstMove = currentFenIndex <= 0;
        const isLastMove = currentFenIndex >= moveHistory.length - 1;
        try {
            $('[data-action="first"]').prop('disabled', isFirstMove);
            $('[data-action="prev"]').prop('disabled', isFirstMove);
            $('[data-action="next"]').prop('disabled', isLastMove);
            $('[data-action="last"]').prop('disabled', isLastMove);
        } catch (e) {
        }
    };

    L.clearBoard = function () {
        if (!board) {
            console.error("Lỗi: Board chưa được khởi tạo.");
            return;
        }
        const currentOrientation = board.orientation();
        fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache', {method: 'POST'});
        L.initChessboard(currentOrientation);
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        if (scoreWrapper) {
            if (playerColor === 'b') scoreWrapper.classList.add('rotated-score'); else scoreWrapper.classList.remove('rotated-score');
        }
    };

    // Gắn vào window
    window.LOGIC_GAME = L;
})();
