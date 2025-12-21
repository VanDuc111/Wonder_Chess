/**
 * @fileoverview Logic core for WonderChess application.
 * Handles chessboard initialization, move validation, AI interaction, and UI updates.
 * Built with an Object-Oriented approach for maintainability and performance.
 */

/**
 * Class representing the User Interface components of the chess game.
 * Manages evaluation bars, highlights, and visual arrows.
 */
class ChessUI {
    /**
     * Create a ChessUI instance and initialize internal DOM cache.
     */
    constructor() {
        /** @type {number} Timestamp of the last invalid FEN modal shown */
        this._lastInvalidFenModalAt = 0;
        /** @type {Object<string, HTMLElement|null>} Internal DOM element cache */
        this.dom = {
            evalBar: null,
            evalScore: null,
            boardCont: null,
            arrowCont: null,
            openingName: null
        };
    }

    /**
     * Ensures mandatory DOM elements are cached for performance.
     * @private
     */
    _ensureDom() {
        // Kiểm tra tính hợp lệ của Cache (tránh trỏ vào các Element đã bị xóa khỏi DOM)
        for (let key in this.dom) {
            if (this.dom[key] && !document.contains(this.dom[key])) {
                this.dom[key] = null;
            }
        }

        if (!this.dom.evalBar) this.dom.evalBar = document.getElementById(window.APP_CONST?.IDS?.EVAL_BAR || 'eval-white-advantage');
        if (!this.dom.evalScore) this.dom.evalScore = document.getElementById(window.APP_CONST?.IDS?.EVAL_SCORE || 'evaluation-score');
        if (!this.dom.boardCont) this.dom.boardCont = document.getElementById('myBoard');
        if (!this.dom.openingName) this.dom.openingName = document.getElementById('opening-name');
    }

    /**
     * Updates the visual evaluation bar based on the current engine score.
     * @param {number|string} score - The numerical evaluation or mate string (e.g., "+0.5", "M2").
     * @param {string} fen - Current FEN string.
     * @param {Object} gameInstance - The chess.js instance.
     */
    updateEvaluationBar(score, fen, gameInstance) {
        try {
            this._ensureDom();
            if (!this.dom.evalBar && !this.dom.evalScore) return;

            let formattedScore = "0.00";
            let percentAdvantage = 50;

            // Check for game over states first
            if (gameInstance && typeof gameInstance.game_over === 'function' && gameInstance.game_over()) {
                if (gameInstance.in_checkmate()) {
                    formattedScore = (gameInstance.turn() === 'b') ? "1-0" : "0-1";
                    percentAdvantage = (gameInstance.turn() === 'b') ? 100 : 0;
                } else {
                    formattedScore = "1/2-1/2";
                    percentAdvantage = 50;
                }
                this._applyEvalUI(percentAdvantage, formattedScore);
                return;
            }

            const scoreStr = String(score || "0.00");
            if (scoreStr.includes('M') || scoreStr.includes('#')) {
                formattedScore = scoreStr.replace("#", "M");
                percentAdvantage = scoreStr.includes('-') ? 0 : 100;
            } else {
                const numScore = parseFloat(scoreStr);
                if (!isNaN(numScore)) {
                    const MATE_VAL = (window.APP_CONST?.ENGINE?.MATE_SCORE_BASE || 1000000) - 500;
                    if (Math.abs(numScore) > MATE_VAL) {
                        const moves = (window.APP_CONST?.ENGINE?.MATE_SCORE_BASE || 1000000) - Math.abs(numScore);
                        formattedScore = (numScore > 0) ? `M+${moves}` : `M-${moves}`;
                        percentAdvantage = (numScore > 0) ? 100 : 0;
                    } else {
                        const MAX_PAWNS = 10.0;
                        let capped = Math.max(-MAX_PAWNS, Math.min(MAX_PAWNS, numScore));
                        percentAdvantage = 50 + (capped / (MAX_PAWNS * 2)) * 100;
                        formattedScore = numScore > 0 ? `+${numScore.toFixed(2)}` : numScore.toFixed(2);
                    }
                }
            }
            this._applyEvalUI(percentAdvantage, formattedScore);
        } catch (err) {
            console.warn('UI Eval Error:', err);
        }
    }

    /**
     * Applies the calculated evaluation to the DOM.
     * @param {number} percent - Height percentage for the white advantage bar.
     * @param {string} score - Formatted score text.
     * @private
     */
    _applyEvalUI(percent, score) {
        if (this.dom.evalBar) this.dom.evalBar.style.height = `${percent}%`;
        if (this.dom.evalScore) this.dom.evalScore.textContent = score;
    }

    /**
     * Synchronizes the evaluation bar height with the chessboard's dynamic height.
     */
    syncBoardAndEvalHeight() {
        this._ensureDom();
        const barCont = document.querySelector('.score-bar-container');
        const wrapper = document.querySelector('.score-alignment-wrapper');
        const scoreEl = this.dom.evalScore;
        const boardArea = document.querySelector('.chess-board-area');
        if (!boardArea || !barCont || !wrapper) return;

        wrapper.style.height = 'auto';
        
        setTimeout(() => {
            const h = boardArea.clientHeight;
            if (h > 0) {
                const isMobile = window.innerWidth < 768;
                // Thu hẹp extraH để căn giữa đối xứng tốt hơn
                const extraH = isMobile ? 15 : 0; 
                
                wrapper.style.height = `${h + extraH}px`;
                const scoreH = scoreEl ? scoreEl.offsetHeight : 0;
                // Thu hẹp lề dưới của thanh bar để nó không bị "đụng trần đụng sàn" quá sát
                if (barCont) barCont.style.height = `${h + extraH - scoreH - 15}px`;
            }
        }, 0);
    }

    /**
     * Renders a SVG arrow on the board indicating the best move.
     * @param {string|null} moveUci - Move in UCI format (e.g., "e2e4").
     */
    renderBestMoveArrow(moveUci) {
        this._ensureDom();
        if (!this.dom.boardCont) return;
        
        // Kiểm tra xem mũi tên cũ có còn trong DOM không (tránh trường hợp bị Chessboard() xóa mất)
        if (this.dom.arrowCont && !document.contains(this.dom.arrowCont)) {
            this.dom.arrowCont = null;
        }

        if (!this.dom.arrowCont) this.dom.arrowCont = document.getElementById('arrow-container');
        
        if (!this.dom.arrowCont) {
            this.dom.arrowCont = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.dom.arrowCont.id = "arrow-container";
            
            Object.assign(this.dom.arrowCont.style, {
                position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: '100'
            });
            this.dom.boardCont.appendChild(this.dom.arrowCont);
        } else {
            this.dom.arrowCont.innerHTML = '';
        }

        const enabled = document.getElementById('best-move-switch')?.checked;
        if (!enabled || !moveUci || moveUci.length < 4) return;

        const boardRect = this.dom.boardCont.getBoundingClientRect();
        this.dom.arrowCont.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
        
        const fromSq = moveUci.substring(0, 2), toSq = moveUci.substring(2, 4);
        const fromEl = this.dom.boardCont.querySelector(`.square-${fromSq}`), toEl = this.dom.boardCont.querySelector(`.square-${toSq}`);
        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Tọa độ tương đối so với container của bàn cờ
        const start = { 
            x: fromRect.left - boardRect.left + fromRect.width / 2, 
            y: fromRect.top - boardRect.top + fromRect.height / 2 
        };
        const end = { 
            x: toRect.left - boardRect.left + toRect.width / 2, 
            y: toRect.top - boardRect.top + toRect.height / 2 
        };

        const dx = end.x - start.x, dy = end.y - start.y, len = Math.sqrt(dx * dx + dy * dy);
        const ratio = (len - 12) / len;

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        marker.setAttribute("markerWidth", "4"); marker.setAttribute("markerHeight", "4");
        marker.setAttribute("refX", "3.5"); marker.setAttribute("refY", "2");
        marker.setAttribute("orient", "auto");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", "0 0, 4 2, 0 4");
        poly.setAttribute("fill", "rgba(76, 175, 80, 0.9)");
        marker.appendChild(poly); defs.appendChild(marker); this.dom.arrowCont.appendChild(defs);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
        line.setAttribute("x2", start.x + dx * ratio); line.setAttribute("y2", start.y + dy * ratio);
        line.setAttribute("stroke", "rgba(76, 175, 80, 0.6)"); 
        line.setAttribute("stroke-width", "6"); 
        line.setAttribute("marker-end", "url(#arrowhead)");
        this.dom.arrowCont.appendChild(line);
    }

    /**
     * Updates all square highlights (checks, last moves, selections).
     * @param {Object} gameInstance - The chess.js instance.
     * @param {Array} history - The app's moveHistory array.
     * @param {number} curIdx - Current index in the moveHistory.
     */
    updateAllHighlights(gameInstance, history, curIdx) {
        this._ensureDom();
        if (!this.dom.boardCont) return;

        this.dom.boardCont.querySelectorAll('.square-55d63').forEach(sq => {
            sq.classList.remove('square-selected', 'highlight-move', 'highlight-check');
        });

        if (gameInstance.in_check()) {
            const king = this._findKing(gameInstance.turn(), gameInstance);
            this.dom.boardCont.querySelector(`.square-${king}`)?.classList.add('highlight-check');
        }

        const moveEntry = history[curIdx];
        if (moveEntry && moveEntry.uci) {
            const from = moveEntry.uci.substring(0, 2);
            const to = moveEntry.uci.substring(2, 4);
            this.dom.boardCont.querySelector(`.square-${from}`)?.classList.add('square-selected');
            this.dom.boardCont.querySelector(`.square-${to}`)?.classList.add('square-selected');
        }
    }

    /**
     * Utility to find the king's square on the board.
     * @param {'w'|'b'} color - Color of the king to find.
     * @param {Object} game - The chess.js instance.
     * @returns {string|null} The square identifier (e.g., "e1") or null.
     * @private
     */
    _findKing(color, game) {
        const cols = ['a','b','c','d','e','f','g','h'], rows = ['1','2','3','4','5','6','7','8'];
        for (const c of cols) for (const r of rows) {
            const p = game.get(c + r);
            if (p?.type === 'k' && p?.color === color) return c + r;
        }
        return null;
    }
}

/**
 * Class for detecting and managing chess openings.
 */
class ChessOpening {
    /**
     * Create a ChessOpening instance.
     */
    constructor() {
        /** @type {Array|null} Pre-processed opening dictionary */
        this.preparedData = null;
    }

    /**
     * Pre-processes opening data for high-performance matching.
     * @returns {Array} List of processed opening objects.
     * @private
     */
    _prepareDictionary() {
        if (this.preparedData) return this.preparedData;
        
        let raw = null;
        try {
            if (typeof OPENINGS_DATA !== 'undefined') raw = OPENINGS_DATA;
        } catch(e) {}

        if (!raw) return [];
        
        this.preparedData = raw.map(op => ({
            ...op,
            moveArray: op.moves.replace(/\s+/g, ' ').trim().replace(/\d+\.\s+/g, '').replace(/\d+\.\.\.\s+/g, '').split(' ')
        }));
        return this.preparedData;
    }

    /**
     * Detects opening from move history and updates the history metadata.
     * @param {Array} history - The app's moveHistory array.
     * @param {number} curIdx - Index to detect for.
     * @returns {Object} Result containing opening name and book status.
     */
    detectAndUpdate(history, curIdx) {
        if (!history[curIdx]) return { name: "Chưa bắt đầu", isBookMove: false };

        const dictionary = this._prepareDictionary();
        const currentMoves = history.slice(1, curIdx + 1).map(h => h.san);
        
        if (currentMoves.length === 0) {
            history[curIdx].opening = "Chưa bắt đầu";
            history[curIdx].isBookMove = false;
            return { name: "Chưa bắt đầu", isBookMove: false };
        }

        let best = null, maxLen = -1;
        for (const op of dictionary) {
            const opMoves = op.moveArray;
            if (opMoves.length > currentMoves.length) continue;
            
            let match = true;
            for (let i = 0; i < opMoves.length; i++) {
                if (opMoves[i] !== currentMoves[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match && opMoves.length > maxLen) {
                maxLen = opMoves.length;
                best = op;
            }
        }

        const isKnownBook = (best && maxLen === currentMoves.length);
        const name = best ? best.name : (currentMoves.length <= 2 ? "Đang khai triển..." : "Khai cuộc không xác định");

        history[curIdx].opening = name;
        history[curIdx].isBookMove = !!isKnownBook;

        return { name, isBookMove: !!isKnownBook };
    }
}

/**
 * Class for interacting with Chess Engines (Stockfish WASM / API).
 */
class ChessEngine {
    /**
     * Create a ChessEngine instance.
     */
    constructor() {
        /** @type {Map<string|number, number>} Cache for parsed scores */
        this.scoreCache = new Map();
    }

    /**
     * Requests the best move for a given FEN.
     * @param {string} fen - Current board FEN.
     * @param {number} level - Bot skill level (1-20).
     * @param {number} time - Calculation time limit.
     * @returns {Promise<Object|null>} Best move data or null.
     * @async
     */
    async getBestMove(fen, level, time) {
        const type = typeof selectedBotEngine !== 'undefined' ? selectedBotEngine : 'stockfish';
        if (type === 'stockfish' && window.SF_MANAGER) return await window.SF_MANAGER.getBestMove(fen, level, 500);
        const resp = await fetch(window.APP_CONST?.API?.BOT_MOVE || '/api/game/bot_move', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fen, engine: type, skill_level: level, time_limit: time })
        });
        const d = await resp.json();
        return d.success ? { move: d.move_uci, score: d.evaluation, fen: d.fen } : null;
    }

    /**
     * Requests a deep position evaluation from the server.
     * @param {string} fen - FEN to evaluate.
     * @returns {Promise<Object>} API response JSON.
     * @async
     */
    async getDeepEval(fen) {
        const resp = await fetch(window.APP_CONST?.API?.EVALUATE || '/api/game/evaluate', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fen })
        });
        return await resp.json();
    }

    /**
     * Safely parses engine score strings into numeric values.
     * @param {string|number} s - Input score.
     * @returns {number} Parsed numerical value.
     */
    parseScore(s) {
        if (s === null || s === undefined) return 0;
        if (this.scoreCache.has(s)) return this.scoreCache.get(s);

        const scoreStr = String(s);
        let val = 0;
        if (scoreStr.includes('M')) val = scoreStr.includes('+') ? 100 : -100;
        else val = parseFloat(scoreStr) || 0;

        this.scoreCache.set(s, val);
        return val;
    }
}

/**
 * Main Orchestrator Class for WonderChess.
 * Connects UI, Opening, and Engine components.
 */
class ChessCore {
    /**
     * Initialize ChessCore and attach to global game state.
     */
    constructor() {
        this.ui = new ChessUI();
        this.engine = new ChessEngine();
        this.opening = new ChessOpening();
        this.sourceSquare = null;
        this._initGlobalListeners();
        this.dom = {
            pgnList: null,
            pgnCont: null,
            notateSwitch: null
        };
    }

    /**
     * Ensures mandatory DOM elements for the core loop are cached.
     * @private
     */
    _ensureDom() {
        if (!this.dom.pgnList) this.dom.pgnList = document.getElementById('pgn-history-list-vertical');
        if (!this.dom.pgnCont) this.dom.pgnCont = document.getElementById('pgn-history-vertical');
        if (!this.dom.notateSwitch) this.dom.notateSwitch = document.getElementById('move-notate-switch');
    }

    /**
     * Initializes a new chessboard or resets current one.
     * @param {'white'|'black'} [orientation='white'] - Board orientation.
     */
    initBoard(orientation = 'white') {
        if (typeof board !== 'undefined' && board) try { board.destroy(); } catch(e){}
        game = new Chess(window.APP_CONST?.STARTING_FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        moveHistory = [{ fen: game.fen(), score: "0.00" }];
        currentFenIndex = 0;
        board = Chessboard('myBoard', {
            draggable: true, position: game.fen(), pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png',
            orientation, moveSpeed: 150, snapSpeed: 25,
            onDrop: this.onDrop.bind(this), onDragStart: this.onDragStart.bind(this), onSnapEnd: this.onSnapEnd.bind(this)
        });
        this.ui.syncBoardAndEvalHeight();
        this.ui.updateEvaluationBar(0.0, game.fen(), game);
        this._setupResize();
        this.updateUI();
        if (document.getElementById('flip-board-switch')?.checked) board.orientation('black');
        
        // Kích hoạt phân tích cho nước đi đầu tiên
        this.onTurnEnd();

        // Gắn sự kiện click vào các ô cờ (Dùng Event Delegation để hiệu quả)
        const boardEl = $('#myBoard');
        boardEl.off('click', '.square-55d63'); // Xóa event cũ nếu có
        boardEl.on('click', '.square-55d63', (e) => {
            const square = $(e.currentTarget).attr('data-square');
            if (square) this.handleSquareClick(square);
        });
    }

    /**
     * Handles clicking on a square for "Click-to-Move" logic.
     * @param {string} square - Square clicked (e.g., "e2").
     */
    handleSquareClick(square) {
        if (!isPlayerTurn) return;

        // 1. Nếu click vào quân cờ của phe mình -> CHỌN hoặc ĐỔI QUÂN
        const piece = game.get(square);
        const isMyPiece = piece && piece.color === game.turn() && (playerColor === null || piece.color === playerColor);

        if (isMyPiece) {
            // Nếu click lại đúng quân đang chọn -> Giữ nguyên (tránh nháy)
            if (this.sourceSquare === square) return;

            // Đổi sang quân mới
            this.sourceSquare = square;
            this.ui.updateAllHighlights(game, moveHistory, currentFenIndex);
            
            this.ui.dom.boardCont?.querySelector(`.square-${square}`)?.classList.add('square-selected');
            game.moves({square: square, verbose: true}).forEach(m => {
                this.ui.dom.boardCont?.querySelector(`.square-${m.to}`)?.classList.add('highlight-move');
            });
            return;
        }

        // 2. Nếu đã có quân được chọn và click vào ô khác (ô trống hoặc quân địch) -> Thử di chuyển
        if (this.sourceSquare) {
            let uci = this.sourceSquare + square;
            const p = game.get(this.sourceSquare);
            const isPromotion = p?.type === 'p' && (square[1] === '8' || square[1] === '1');
            
            const move = game.move({
                from: this.sourceSquare,
                to: square,
                promotion: isPromotion ? 'q' : undefined
            });

            if (move) {
                if (isPromotion) uci += 'q';
                board.position(game.fen());
                this.handleLocalMove(uci);
                this.sourceSquare = null;
            } else {
                // Click vào ô không hợp lệ -> Hủy chọn và xóa highlight
                this.sourceSquare = null;
                this.ui.updateAllHighlights(game, moveHistory, currentFenIndex);
            }
        }
    }

    /**
     * Event handler for piece drop on the board.
     * @param {string} source - Start square.
     * @param {string} target - End square.
     * @returns {string|undefined} 'snapback' if move is invalid.
     * @async
     */
    async onDrop(source, target) {
        if (playerColor !== null && game.turn() !== playerColor) return 'snapback';
        let uci = source + target;
        const p = game.get(source);
        if (p?.type === 'p' && (target[1] === '8' || target[1] === '1')) uci += 'q';
        if (game.move({ from: source, to: target, promotion: uci.endsWith('q') ? 'q' : undefined }) === null) return 'snapback';
        await this.handleLocalMove(uci);
    }

    /**
     * Processes a move locally, updating state and UI.
     * @param {string} uci - Move in UCI format.
     * @async
     */
    async handleLocalMove(uci) {
        if (currentFenIndex < moveHistory.length - 1) moveHistory = moveHistory.slice(0, currentFenIndex + 1);
        const san = game.history().pop();
        const newEntry = { fen: game.fen(), score: null, san, uci };
        moveHistory.push(newEntry);
        currentFenIndex = moveHistory.length - 1;
        this.opening.detectAndUpdate(moveHistory, currentFenIndex);
        this.ui.renderBestMoveArrow(null);
        this.updateUI();
        await this.onTurnEnd();
    }

    /**
     * Logic executed after every turn (checking game over, starting engine).
     * @async
     */
    async onTurnEnd() {
        this.ui.updateAllHighlights(game, moveHistory, currentFenIndex);
        this.updateUI();
        if (isTimedGame) clearInterval(timerInterval);
        if (game.game_over()) {
            this.ui.updateEvaluationBar(0, game.fen(), game);
            this._showGameOver();
            isPlayerTurn = true; return;
        }

        const savedIdx = currentFenIndex;
        this.engine.getDeepEval(game.fen()).then(d => {
            if (d.success && d.engine_results && moveHistory[savedIdx]) {
                const sc = d.engine_results.search_score;
                this.ui.updateEvaluationBar(sc, game.fen(), game);
                moveHistory[savedIdx].score = sc;
                moveHistory[savedIdx].bestMove = d.engine_results.best_move;
                if (savedIdx === currentFenIndex) {
                    this.ui.renderBestMoveArrow(d.engine_results.best_move);
                    this._renderPGN();
                }
            }
        });

        if (playerColor !== null && game.turn() !== playerColor) {
            if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            await this.botGo();
        } else {
            if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            isPlayerTurn = true;
        }
    }

    /**
     * Triggers AI calculation and move execution.
     * @async
     */
    async botGo() {
        isPlayerTurn = false;
        this.ui.renderBestMoveArrow(null);
        try {
            const r = await this.engine.getBestMove(game.fen(), selectedBotLevel || 10, selectedBotTime);
            if (r) {
                game.move(r.move, { sloppy: true });
                const san = game.history().pop();
                moveHistory.push({ fen: game.fen(), score: r.score, san, uci: r.move });
                currentFenIndex = moveHistory.length - 1;
                this.opening.detectAndUpdate(moveHistory, currentFenIndex);
                board.position(game.fen());
                this.updateUI();
                this.ui.updateEvaluationBar(r.score, game.fen(), game);
                if (game.game_over()) this._showGameOver();
                else if (isTimedGame && window.startTimer) window.startTimer(game.turn());
            }
        } catch (e) { console.error("Engine failure:", e); }
        isPlayerTurn = true;
    }

    /**
     * Synchronizes all UI components with the current game state.
     */
    updateUI() {
        this._syncButtons();
        const op = this.opening.detectAndUpdate(moveHistory, currentFenIndex);
        if (this.ui.dom.openingName) this.ui.dom.openingName.textContent = op.name;
        this._renderPGN();
        this.ui.renderBestMoveArrow(moveHistory[currentFenIndex]?.bestMove || null);
    }

    /**
     * Renders the vertical PGN history table.
     * @private
     */
    _renderPGN() {
        this._ensureDom();
        if (!this.dom.pgnList) return;
        
        const htmlParts = [];
        for (let i = 1; i < moveHistory.length; i += 2) {
            const w = moveHistory[i], b = moveHistory[i + 1];
            const wH = (i === currentFenIndex) ? 'current-move-highlight' : '';
            const bH = (b && (i+1) === currentFenIndex) ? 'current-move-highlight' : '';
            
            htmlParts.push(`<tr><td>${Math.floor((i-1)/2)+1}.</td>`);
            htmlParts.push(`<td class="move-cell ${wH}" data-index="${i}">${w.san} ${this._annot(w, i)}</td>`);
            htmlParts.push(`<td class="move-cell ${bH}" data-index="${i+1}">${b ? b.san : ''} ${b ? this._annot(b, i+1) : ''}</td></tr>`);
        }
        
        this.dom.pgnList.innerHTML = htmlParts.join('');
        if (this.dom.pgnCont) this.dom.pgnCont.scrollTop = this.dom.pgnCont.scrollHeight;
    }

    /**
     * Generates annotation icons based on move quality.
     * @param {Object} m - The move history item.
     * @param {number} idx - Index of the move.
     * @returns {string} HTML string containing icons.
     * @private
     */
    _annot(m, idx) {
        if (!this.dom.notateSwitch?.checked) return '';
        if (m.isBookMove) return `<span class="move-annotation" title="Book Move"><img src="static/img/icon/book.svg"></span>`;
        if (m.score === null || m.score === undefined || idx === 0 || !moveHistory[idx-1]) return '';

        const cur = this.engine.parseScore(m.score);
        const pre = this.engine.parseScore(moveHistory[idx-1].score);
        const diff = (idx % 2 !== 0) ? (cur - pre) : (pre - cur);
        const isBest = (moveHistory[idx-1].bestMove === m.uci);

        if (diff > 1.5) return `<span class="move-annotation" title="Brilliant"><img src="static/img/icon/brilliant.svg"></span>`;
        if (diff > 0.8) return `<span class="move-annotation" title="Great Move"><img src="static/img/icon/great.svg"></span>`;
        if (isBest) return `<span class="move-annotation" title="Best Move"><img src="static/img/icon/best.svg"></span>`;
        if (diff > 0.1) return `<span class="move-annotation" title="Good Move"><img src="static/img/icon/good.svg"></span>`;
        if (diff > -0.2) return `<span class="move-annotation" title="Solid Move"><img src="static/img/icon/solid.svg"></span>`;
        if (Math.abs(pre) > 2.5 && Math.abs(cur) < 0.5) return `<span class="move-annotation" title="Missed Win"><img src="static/img/icon/miss.svg"></span>`;
        if (diff < -1.5) return `<span class="move-annotation" title="Blunder"><img src="static/img/icon/blunder.svg"></span>`;
        if (diff < -0.7) return `<span class="move-annotation" title="Mistake"><img src="static/img/icon/mistake.svg"></span>`;
        if (diff < -0.3) return `<span class="move-annotation" title="Inaccurate"><img src="static/img/icon/inacc.svg"></span>`;

        return '';
    }

    /**
     * Initializes global event listeners (UI switches, keys).
     * @private
     */
    _initGlobalListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('flip-board-switch')?.addEventListener('change', () => { board?.flip(); this.updateUI(); });
            document.getElementById('best-move-switch')?.addEventListener('change', () => this.ui.renderBestMoveArrow(moveHistory[currentFenIndex]?.bestMove));
            document.getElementById('eval-bar-switch')?.addEventListener('change', (e) => {
                const w = document.querySelector('.score-alignment-wrapper');
                if (w) { w.style.display = e.target.checked ? 'flex' : 'none'; board?.resize(); if(e.target.checked) setTimeout(()=>this.ui.syncBoardAndEvalHeight(), 50); }
            });
            document.getElementById('move-notate-switch')?.addEventListener('change', () => this._renderPGN());
        });
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'f') document.getElementById('flip-board-switch')?.click();
        });
    }

    /**
     * Handles dynamic board resizing on window change.
     * @private
     */
    _setupResize() {
        if (!window._boardResizeHandler) {
            window._boardResizeHandler = () => {
                // Thêm một khoảng trễ nhỏ để đảm bảo Layout đã ổn định
                setTimeout(() => {
                    board?.resize();
                    this.ui.syncBoardAndEvalHeight();
                    this.updateUI();
                }, 100);
            };
            window.addEventListener('resize', window._boardResizeHandler);
        }
    }

    /**
     * Syncs navigation button states (enabled/disabled).
     * @private
     */
    _syncButtons() {
        const isF = currentFenIndex <= 0, isL = currentFenIndex >= moveHistory.length - 1;
        try {
            $('[data-action="first"], [data-action="prev"]').prop('disabled', isF);
            $('[data-action="next"], [data-action="last"]').prop('disabled', isL);
        } catch (e) {}
    }

    /**
     * Displays a Modal when game is over.
     * @private
     */
    _showGameOver() {
        let t = "Ván đấu kết thúc", b = game.in_checkmate() ? `Chiếu hết! ${game.turn() === 'b' ? 'Trắng' : 'Đen'} thắng.` : "Hòa!";
        setTimeout(() => window.showGameOverModal?.(t, b), 200);
    }

    /**
     * Chessboard event for move start.
     * @param {string} source - Square clicked.
     * @param {string} piece - Piece identifier.
     * @returns {boolean} True if drag is allowed.
     */
    onDragStart(source, piece) {
        if (!isPlayerTurn || game.turn() !== piece[0]) return false;

        // Lưu ô bắt đầu dragging làm sourceSquare cho click-to-move
        this.sourceSquare = source;

        this.ui.updateAllHighlights(game, moveHistory, currentFenIndex);
        this.ui.dom.boardCont?.querySelector(`.square-${source}`)?.classList.add('square-selected');
        
        game.moves({square: source, verbose: true}).forEach(m => {
            const sq = this.ui.dom.boardCont?.querySelector(`.square-${m.to}`);
            if (sq) sq.classList.add('highlight-move');
        });
        return true;
    }

    /**
     * Board sync after snap animation.
     */
    onSnapEnd() { if (board && board.fen() !== game.fen()) board.position(game.fen(), false); }
}

// Global Core Initialization
const core = new ChessCore();

/**
 * Public interface for main.js communication.
 */
window.LOGIC_GAME = {
    initChessboard: (o) => core.initBoard(o),
    updateEvaluationBar: (s, f) => core.ui.updateEvaluationBar(s, f, game),
    syncBoardAndEvalHeight: () => core.ui.syncBoardAndEvalHeight(),
    makeMove: (m) => core.handleLocalMove(m),
    onDrop: (s, t) => core.onDrop(s, t),
    handleTurnEnd: (f) => core.onTurnEnd(f),
    handleBotTurn: () => core.botGo(),
    updateUI: () => core.updateUI(),
    loadFen: (i) => { if(i>=0 && i<moveHistory.length) { currentFenIndex=i; game.load(moveHistory[i].fen); board.position(moveHistory[i].fen); core.ui.updateAllHighlights(game, moveHistory, i); core.updateUI(); core.ui.updateEvaluationBar(moveHistory[i].score, moveHistory[i].fen, game); } },
    clearBoard: () => { fetch('/api/game/clear_cache', {method:'POST'}); core.initBoard(board?.orientation()); core.ui.renderBestMoveArrow(null); },
    updateAllHighlights: () => core.ui.updateAllHighlights(game, moveHistory, currentFenIndex),
    updatePgnHistory: () => core._renderPGN(),
    fetchDeepEvaluation: (f) => core.engine.getDeepEval(f),
    renderBestMoveArrow: (m) => core.ui.renderBestMoveArrow(m),
    handleScoreUpdate: (s, f) => core.ui.updateEvaluationBar(s, f, game),
    findKingSquare: (c) => core.ui._findKing(c, game),
    onDragStart: (s, p, po, o) => core.onDragStart(s, p, po, o),
    onSnapEnd: () => core.onSnapEnd()
};
