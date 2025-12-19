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
        
        // Nếu có container arrow, resize nó
        const arrowContainer = document.getElementById('arrow-container');
        if (arrowContainer) {
            const container = document.getElementById('myBoard');
            arrowContainer.setAttribute("viewBox", `0 0 ${container.offsetWidth} ${container.offsetHeight}`);
        }

        // Khởi tạo resizer và đồng bộ chiều cao
        L.syncBoardAndEvalHeight();
        L.updateEvaluationBar(0.0, game.fen());

        // Lắng nghe resize chỉ 1 lần duy nhất
        if (!window._boardResizeHandler) {
            window._boardResizeHandler = () => {
                if (board) board.resize();
                L.syncBoardAndEvalHeight();
                // Resize arrow container
                const arrowCont = document.getElementById('arrow-container');
                const boardCont = document.getElementById('myBoard');
                if (arrowCont && boardCont) {
                    arrowCont.setAttribute("viewBox", `0 0 ${boardCont.offsetWidth} ${boardCont.offsetHeight}`);
                    // Re-render arrow if needed
                    if (moveHistory[currentFenIndex] && moveHistory[currentFenIndex].bestMove) {
                        L.renderBestMoveArrow(moveHistory[currentFenIndex].bestMove);
                    }
                }
            };
            window.addEventListener('resize', window._boardResizeHandler);
        }

        // Đỏ hướng dựa trên switch nếu cần
        const flipSwitch = document.getElementById('flip-board-switch');
        if (flipSwitch && flipSwitch.checked) {
            board.orientation('black');
        }

        // Thiết lập listeners cho switches (chỉ thực hiện khi page load lần đầu hoặc init)
        if (!window._analysisListenersAttached) {
            L.attachAnalysisListeners();
            window._analysisListenersAttached = true;
        }
    };

    L.syncBoardAndEvalHeight = function () {
        const myBoard = document.getElementById('myBoard');
        const scoreBarContainer = document.querySelector('.score-bar-container');
        const evalScore = document.getElementById((window.APP_CONST && window.APP_CONST.IDS && window.APP_CONST.IDS.EVAL_SCORE) ? window.APP_CONST.IDS.EVAL_SCORE : 'evaluation-score');
        const wrapper = document.querySelector('.score-alignment-wrapper');

        if (!myBoard || !scoreBarContainer || !wrapper) return;

        // Lấy chiều cao thực tế của bàn cờ
        const boardHeight = myBoard.clientHeight;
        
        // Đồng bộ wrapper theo đúng chiều cao bàn cờ
        wrapper.style.height = `${boardHeight}px`;

        const scoreHeight = evalScore ? evalScore.offsetHeight : 0;
        const verticalGap = 8;
        const targetBarContainerHeight = boardHeight - scoreHeight - verticalGap;
        
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

                const openingInfo = L.detectOpening(true); 
                moveHistory.push({
                    fen: newFen, 
                    score: null, 
                    san: move.san, 
                    uci: moveUci, 
                    opening: openingInfo.name, 
                    isBookMove: openingInfo.isBookMove
                });

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
        const h = game.history();
        const openingInfo = L.detectOpening(true); 
        moveHistory.push({ 
            fen: game.fen(), 
            score: null, 
            san: h[h.length - 1], 
            uci: moveUci, 
            opening: openingInfo.name, 
            isBookMove: openingInfo.isBookMove 
        });
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
        const engineType = typeof selectedBotEngine !== 'undefined' ? selectedBotEngine : 'stockfish';
        const level = typeof selectedBotLevel !== 'undefined' ? selectedBotLevel : 10;
        
        try {
            let botMoveUci = null;
            let evalScoreText = "0.00";
            let newFen = "";

            if (engineType === 'stockfish' && window.SF_MANAGER) {
                // --- CHẠY STOCKFISH TẠI FRONTEND (WASM) ---
                console.log("Using Frontend Stockfish WASM...");
                const result = await window.SF_MANAGER.getBestMove(game.fen(), level, 500); 
                botMoveUci = result.move;
                evalScoreText = result.score;
                game.move(botMoveUci, {sloppy: true});
                newFen = game.fen();
            } else {
                // --- CHẠY WONDER ENGINE TẠI BACKEND ---
                console.log("Using Backend Wonder Engine...");
                const response = await fetch((window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.BOT_MOVE) ? window.APP_CONST.API.BOT_MOVE : '/api/game/bot_move', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        fen: game.fen(),
                        engine: engineType,
                        skill_level: level,
                        time_limit: selectedBotTime,
                        increment: typeof selectedBotIncrement !== 'undefined' ? selectedBotIncrement : 0
                    })
                });
                const data = await response.json();
                if (data.success) {
                    botMoveUci = data.move_uci;
                    newFen = data.fen;
                    evalScoreText = data.evaluation;
                    game.move(botMoveUci, {sloppy: true});
                }
            }

            if (isTimedGame) clearInterval(timerInterval);

            if (botMoveUci) {
                if (currentFenIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentFenIndex + 1);
                }
                const h = game.history();
                const openingInfo = L.detectOpening(true);
                moveHistory.push({
                    fen: newFen, 
                    score: evalScoreText, 
                    san: h[h.length - 1], 
                    uci: botMoveUci, 
                    opening: openingInfo.name, 
                    isBookMove: openingInfo.isBookMove
                });
                currentFenIndex = moveHistory.length - 1;

                board.position(game.fen());
                L.updateAllHighlights();

                L.updateUI(newFen);
                L.handleScoreUpdate(evalScoreText, newFen);

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
        
        // i bắt đầu từ 1 vì moveHistory[0] là vị trí khởi đầu
        for (let i = 1; i < moveHistory.length; i += 2) {
            const moveNumber = Math.floor((i - 1) / 2) + 1;
            const whiteMove = moveHistory[i];
            const blackMove = moveHistory[i + 1];
            
            const whiteHighlight = (i === currentFenIndex) ? 'current-move-highlight' : '';
            const blackHighlight = (blackMove && (i + 1) === currentFenIndex) ? 'current-move-highlight' : '';
            
            const whiteAnnot = L.renderAnnotationHtml(whiteMove, i);
            const blackAnnot = blackMove ? L.renderAnnotationHtml(blackMove, i + 1) : '';

            pgnHtml += `
                <tr>
                    <td class="move-number-cell">${moveNumber}.</td>
                    <td class="move-cell ${whiteHighlight}" data-index="${i}">${whiteMove.san || ''} ${whiteAnnot}</td>
                    <td class="move-cell ${blackHighlight}" data-index="${i+1}">${blackMove ? (blackMove.san || '') : ''} ${blackAnnot}</td>
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

                // Lưu bestmove để vẽ arrow
                const bestMove = data.engine_results.best_move;
                if (bestMove && moveHistory[currentFenIndex]) {
                    moveHistory[currentFenIndex].bestMove = bestMove;
                    L.renderBestMoveArrow(bestMove);
                }

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

    L.detectOpening = function (forceRecalculate = false) {
        const openingDisplay = document.getElementById('opening-name');
        if (!openingDisplay) return { name: "", isBookMove: false };

        if (!forceRecalculate && moveHistory[currentFenIndex] && moveHistory[currentFenIndex].opening) {
            openingDisplay.textContent = moveHistory[currentFenIndex].opening;
            return { name: moveHistory[currentFenIndex].opening, isBookMove: moveHistory[currentFenIndex].isBookMove };
        }

        const history = game.history();
        if (history.length === 0) {
            openingDisplay.textContent = "Chưa bắt đầu";
            return { name: "Chưa bắt đầu", isBookMove: false };
        }

        let bestMatch = null;
        let maxLen = -1;

        if (typeof OPENINGS_DATA !== 'undefined') {
            for (const op of OPENINGS_DATA) {
                const opMoves = op.moves.replace(/\d+\.\s+/g, '').split(/\s+/).filter(m => m.length > 0);
                
                let isMatch = true;
                if (opMoves.length > history.length) {
                    isMatch = false; 
                } else {
                    for (let i = 0; i < opMoves.length; i++) {
                        if (opMoves[i] !== history[i]) {
                            isMatch = false;
                            break;
                        }
                    }
                }

                if (isMatch && opMoves.length > maxLen) {
                    maxLen = opMoves.length;
                    bestMatch = op;
                }
            }
        }

        let resultName = "";
        let isBookMove = (bestMatch && maxLen === history.length); // Chỉ là Book Move nếu nó trùng khớp hoàn toàn số nước đi

        if (bestMatch) {
            resultName = bestMatch.name;
        } else {
            if (history.length <= 2) {
                resultName = "Đang khai triển...";
            } else {
                resultName = "Khai cuộc không xác định";
            }
        }
        
        openingDisplay.textContent = resultName;
        return { name: resultName, isBookMove: isBookMove };
    };

    L.loadFen = function (index) {
        if (index >= 0 && index < moveHistory.length) {
            currentFenIndex = index;
            const state = moveHistory[index];
            game.load(state.fen);
            board.position(state.fen);
            L.updateAllHighlights();
            L.updateUI(state.fen);
            L.handleScoreUpdate(state.score, state.fen);
            
            // Vẽ lại arrow nếu có dữ liệu
            if (state.bestMove) {
                L.renderBestMoveArrow(state.bestMove);
            } else {
                L.renderBestMoveArrow(null); // clear
            }
        }
    };

    L.renderBestMoveArrow = function(moveUci) {
        const container = document.getElementById('myBoard');
        if (!container) return;

        let arrowContainer = document.getElementById('arrow-container');
        if (!arrowContainer) {
            arrowContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            arrowContainer.id = "arrow-container";
            container.appendChild(arrowContainer);
        } else {
            arrowContainer.innerHTML = '';
        }

        const switchEl = document.getElementById('best-move-switch');
        if (!switchEl || !switchEl.checked) return;
        if (!moveUci || moveUci.length < 4) return;

        arrowContainer.setAttribute("viewBox", `0 0 ${container.offsetWidth} ${container.offsetHeight}`);
        arrowContainer.style.width = '100%';
        arrowContainer.style.height = '100%';

        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);

        const fromEl = container.querySelector(`.square-${from}`);
        const toEl = container.querySelector(`.square-${to}`);

        if (!fromEl || !toEl) return;

        const getCenter = (el) => {
            return {
                x: el.offsetLeft + el.offsetWidth / 2,
                y: el.offsetTop + el.offsetHeight / 2
            };
        };

        const start = getCenter(fromEl);
        const end = getCenter(toEl);

        // Tính toán để thu ngắn đường line lại, tránh bị lòi ra khỏi đầu mũi tên
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const offset = 10; // Khoảng cách thu hồi (pixel)
        const ratio = (length - offset) / length;
        const shortEndX = start.x + dx * ratio;
        const shortEndY = start.y + dy * ratio;

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        // Tăng marker size một chút để che phủ tốt hơn
        marker.setAttribute("markerWidth", "6");
        marker.setAttribute("markerHeight", "5");
        marker.setAttribute("refX", "5");
        marker.setAttribute("refY", "2.5");
        marker.setAttribute("orient", "auto");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 6 2.5, 0 5");
        polygon.setAttribute("fill", "rgba(76, 175, 80, 0.9)");
        marker.appendChild(polygon);
        defs.appendChild(marker);
        arrowContainer.appendChild(defs);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", shortEndX);
        line.setAttribute("y2", shortEndY);
        line.setAttribute("stroke", "rgba(76, 175, 80, 0.6)");
        line.setAttribute("stroke-width", "6");
        line.setAttribute("marker-end", "url(#arrowhead)");

        arrowContainer.appendChild(line);
    };

    L.renderAnnotationHtml = function(moveObj, index) {
        const switchNotate = document.getElementById('move-notate-switch');
        if (!switchNotate || !switchNotate.checked) return '';
        
        if (moveObj.isBookMove) {
             return `<span class="move-annotation" title="Book Move"><img src="static/img/icon/book.svg" alt="Book"></span>`;
        }
        
        const scoreStr = moveObj.score;
        if (!scoreStr) return '';

        // Phân tích tương quan điểm số với nước đi trước đó
        if (index > 0 && moveHistory[index-1] && moveHistory[index-1].score) {
            const currentScore = L.parseScore(moveObj.score);
            const prevScore = L.parseScore(moveHistory[index-1].score);
            const isWhiteMove = (index % 2 !== 0); 
            const diff = currentScore - prevScore;
            
            // Lấy nước đi tốt nhất do máy gợi ý ở thế cờ TRƯỚC ĐÓ
            const engineBestMove = moveHistory[index-1].bestMove;
            const isBestMove = (engineBestMove && moveObj.uci === engineBestMove);

            // Chỉnh lại diff theo góc nhìn của phe vừa đi
            const moveDiff = isWhiteMove ? diff : -diff;

            // 1. Nhóm nước đi tốt (Dương hoặc khớp máy)
            if (moveDiff > 1.2) return `<span class="move-annotation" title="Brilliant Move"><img src="static/img/icon/brilliant.svg" alt="!!"></span>`;
            if (moveDiff > 0.5) return `<span class="move-annotation" title="Great Move"><img src="static/img/icon/great.svg" alt="!"></span>`;
            if (isBestMove) return `<span class="move-annotation" title="Best Move"><img src="static/img/icon/best.svg" alt="Best"></span>`;
            if (moveDiff > -0.1) return `<span class="move-annotation" title="Good Move"><img src="static/img/icon/good.svg" alt="Good"></span>`;
            
            // 2. Nhóm nước đi ổn định
            if (moveDiff > -0.2) return `<span class="move-annotation" title="Solid"><img src="static/img/icon/solid.svg" alt="Solid"></span>`;
            
            // 3. Nhóm nước đi sai lầm
            // Kiểm tra "Miss" (Bỏ lỡ cơ hội thắng)
            const wasWinning = isWhiteMove ? (prevScore > 2.0) : (prevScore < -2.0);
            const nowNeutral = isWhiteMove ? (currentScore < 0.5 && currentScore > -0.5) : (currentScore > -0.5 && currentScore < 0.5);
            if (wasWinning && nowNeutral) return `<span class="move-annotation" title="Missed Win"><img src="static/img/icon/miss.svg" alt="Miss"></span>`;

            if (moveDiff < -1.2) return `<span class="move-annotation" title="Blunder"><img src="static/img/icon/blunder.svg" alt="??"></span>`;
            if (moveDiff < -0.5) return `<span class="move-annotation" title="Mistake"><img src="static/img/icon/mistake.svg" alt="?"></span>`;
            if (moveDiff < -0.2) return `<span class="move-annotation" title="Inaccurate"><img src="static/img/icon/inacc.svg" alt="?!"></span>`;
        }
        
        if (scoreStr.includes('M')) return `<span class="move-annotation" title="Brilliant Move"><img src="static/img/icon/brilliant.svg" alt="!!"></span>`;
        
        return '';
    };

    L.parseScore = function(scoreStr) {
        if (!scoreStr || typeof scoreStr !== 'string') return 0;
        if (scoreStr.includes('M')) {
            return scoreStr.includes('+') ? 100 : -100;
        }
        const val = parseFloat(scoreStr);
        return isNaN(val) ? 0 : val;
    };

    L.attachAnalysisListeners = function() {
        const flipSwitch = document.getElementById('flip-board-switch');
        if (flipSwitch) {
            flipSwitch.addEventListener('change', function() {
                if (board) {
                    board.flip();
                    // Re-render arrow after flip (với delay nhỏ để board cập nhật DOM)
                    setTimeout(() => {
                        if (moveHistory[currentFenIndex] && moveHistory[currentFenIndex].bestMove) {
                            L.renderBestMoveArrow(moveHistory[currentFenIndex].bestMove);
                        }
                    }, 50);
                }
            });
        }

        const bestMoveSwitch = document.getElementById('best-move-switch');
        if (bestMoveSwitch) {
            bestMoveSwitch.addEventListener('change', function() {
                if (moveHistory[currentFenIndex] && moveHistory[currentFenIndex].bestMove) {
                    L.renderBestMoveArrow(moveHistory[currentFenIndex].bestMove);
                } else {
                    L.renderBestMoveArrow(null);
                }
            });
        }

        const notateSwitch = document.getElementById('move-notate-switch');
        if (notateSwitch) {
            notateSwitch.addEventListener('change', function() {
                L.updatePgnHistory();
            });
        }

        const evalBarSwitch = document.getElementById('eval-bar-switch');
        if (evalBarSwitch) {
            evalBarSwitch.addEventListener('change', function() {
                const scoreWrapper = document.querySelector('.score-alignment-wrapper');
                if (scoreWrapper) {
                    scoreWrapper.style.display = this.checked ? 'flex' : 'none';
                    if (board) board.resize(); // Resize chessboard to fit remaining space
                    if (this.checked) {
                        setTimeout(() => L.syncBoardAndEvalHeight(), 50); // Re-sync height
                    }
                }
            });
        }

        // Shortcut Keys
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key.toLowerCase() === 'f') {
                if (flipSwitch) flipSwitch.click();
            }
        });
    };

    L.updateUI = function (fen) {
        L.updateButtonState();
        L.updatePgnHistory();
        L.detectOpening();
        
        if (moveHistory[currentFenIndex] && moveHistory[currentFenIndex].bestMove) {
            L.renderBestMoveArrow(moveHistory[currentFenIndex].bestMove);
        } else {
            L.renderBestMoveArrow(null);
        }
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
        L.renderBestMoveArrow(null);
    };

    // Gắn vào window
    window.LOGIC_GAME = L;
})();
