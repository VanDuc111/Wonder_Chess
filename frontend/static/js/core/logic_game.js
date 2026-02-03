/**
 * @fileoverview Logic core for WonderChess application.
 * Handles chessboard initialization, move validation, AI interaction, and UI updates.
 * Built with an Object-Oriented approach for maintainability and performance.
 */





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
        
        /** @type {Object} The chess.js instance */
        this.game = new Chess();
        /** @type {Array<Object>} Move history with metadata (FEN, score, etc.) */
        this.history = [{ fen: this.game.fen(), score: "0.00" }];
        /** @type {number} Current pointer in the history array */
        this.index = 0;

        /** @type {AbortController|null} Controller for cancelling stale API evaluations */
        this.evalAbortController = null;
        /** @type {number} Monotonic counter to track board 'version' for async safety */
        this.boardVersion = 0;

        this._initGlobalListeners();
        this._setupResize();
    }



    /**
     * Initializes a new chessboard or resets current one.
     * @param {'white'|'black'} [orientation='white'] - Board orientation.
     * @param {string|null} [fen=null] - Optional FEN to start from.
     */
    initBoard(orientation = 'white', fen = null) {
        const ids = window.APP_CONST?.IDS || {};
        if (typeof board !== 'undefined' && board) try { board.destroy(); } catch(e){}

        // Check for 'op' param (opening slug)
        // Standardized on "slugs" for clean, unique URLs (e.g. /?op=sicilian-defense)
        const urlParams = new URLSearchParams(window.location.search);
        const opSlug = urlParams.get('op');
        
        // Legacy/Fallback check for ECO if users type it manually
        const opEco = urlParams.get('eco');
        
        let foundOp = null;
        
        if (typeof OPENINGS_DATA !== 'undefined') {
            if (opSlug) {
                // Helper to slugify name matching the frontend/openings.js logic
                const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                foundOp = OPENINGS_DATA.find(o => slugify(o.name) === opSlug);
            } else if (opEco) {
                foundOp = OPENINGS_DATA.find(o => o.eco === opEco);
            }
        }

        // Only load opening from URL if no specific FEN was requested as an argument
        if (!fen && foundOp) {
            // Setup game from Opening Data
            this.game = new Chess();
            this.history = [{ fen: this.game.fen(), score: "0.00" }];
            this.index = 0;

            // Clean moves string: "1. e4 e5 2. Nf3" -> ["e4", "e5", "Nf3"]
            const cleanMoves = foundOp.moves.replace(/\d+\./g, '').replace(/\.\.\./g, '').split(/\s+/).filter(m => m.length > 0);
            
            for (const m of cleanMoves) {
                const moveResult = this.game.move(m);
                if (moveResult) {
                    const uci = moveResult.from + moveResult.to + (moveResult.promotion || '');
                    this.history.push({ 
                        fen: this.game.fen(), 
                        score: null, 
                        san: moveResult.san, 
                        uci: uci, 
                        isBookMove: true 
                    });
                }
            }
            this.index = this.history.length - 1;
            
            // Allow board to init with this final FEN
            fen = this.game.fen();
        } else {
            // Fallback to FEN param or default
            const urlFen = urlParams.get('fen');
            if (!fen && urlFen) fen = decodeURIComponent(urlFen);
            
            const startFen = fen || window.APP_CONST?.STARTING_FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            this.game = new Chess(startFen);
            this.history = [{ fen: this.game.fen(), score: "0.00" }];
            this.index = 0;
        }
        
        board = Chessboard(ids.BOARD_ELEMENT || 'myBoard', {
            draggable: true, 
            position: this.game.fen(), 
            pieceTheme: window.APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png',
            orientation, 
            moveSpeed: 150, 
            snapSpeed: 25,
            onDrop: this.onDrop.bind(this), 
            onDragStart: this.onDragStart.bind(this), 
            onSnapEnd: this.onSnapEnd.bind(this)
        });
        
        const flipSwitch = document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch');
        if (flipSwitch?.checked) board.orientation('black');
        this.ui.syncOrientation(board.orientation() === 'black');
        
        // Trigger turn end to ensure state is consistent and handle bot moves if necessary
        this.onTurnEnd(); 
        
        // Explicitly set opening name in UI if loaded from Opening Data
        if (foundOp) {
             if (this.ui.dom.openingName) this.ui.dom.openingName.textContent = foundOp.name;
        }

        const boardEl = $('#myBoard');
        boardEl.off('click', '.square-55d63'); 
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

        const piece = this.game.get(square);
        const isMyPiece = piece && piece.color === this.game.turn() && (playerColor === null || piece.color === playerColor);

        if (isMyPiece) {
            if (this.sourceSquare === square) return;
            this.sourceSquare = square;
            this.updateUI();
            this.ui.dom.boardCont?.querySelector(`.square-${square}`)?.classList.add('square-selected');
            this.game.moves({square: square, verbose: true}).forEach(m => {
                this.ui.dom.boardCont?.querySelector(`.square-${m.to}`)?.classList.add('highlight-move');
            });
            return;
        }

        if (this.sourceSquare) {
            let uci = this.sourceSquare + square;
            const p = this.game.get(this.sourceSquare);
            const isPromotion = p?.type === 'p' && (square[1] === '8' || square[1] === '1');
            
            const move = this.game.move({
                from: this.sourceSquare,
                to: square,
                promotion: isPromotion ? 'q' : undefined
            });

            if (move) {
                if (isPromotion) uci += 'q';
                board.position(this.game.fen());
                this.handleLocalMove(uci);
                this.sourceSquare = null;
            } else {
                this.sourceSquare = null;
                this.updateUI();
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
        if (playerColor !== null && this.game.turn() !== playerColor) return 'snapback';
        let uci = source + target;
        const p = this.game.get(source);
        if (p?.type === 'p' && (target[1] === '8' || target[1] === '1')) uci += 'q';
        if (this.game.move({ from: source, to: target, promotion: uci.endsWith('q') ? 'q' : undefined }) === null) return 'snapback';
        await this.handleLocalMove(uci);
    }

    /**
     * Processes a move locally, updating state and UI.
     * @param {string} uci - Move in UCI format.
     * @async
     */
    async handleLocalMove(uci) {
        if (this.index < this.history.length - 1) this.history = this.history.slice(0, this.index + 1);
        const history = this.game.history();
        const san = history[history.length - 1];
        const newEntry = { fen: this.game.fen(), score: null, san, uci };
        this.history.push(newEntry);
        this.index = this.history.length - 1;
        this.opening.detectAndUpdate(this.history, this.index);
        this.ui.renderBestMoveArrow(null);
        this.updateUI();
        
        // Update captured pieces display
        if (window.updateCapturedPieces) {
            window.updateCapturedPieces(this.game);
        }
        
        await this.onTurnEnd();
    }

    /**
     * Logic executed after every turn (checking game over, starting engine).
     * @async
     */
    async onTurnEnd() {
        this.updateUI();
        const isTimed = (typeof TIMER_MANAGER !== 'undefined' && TIMER_MANAGER.isTimedGame);
        if (isTimed) TIMER_MANAGER.stop();
        
        if (this.game.game_over()) {
            this._showGameOver();
            isPlayerTurn = true; 
            return;
        }

        // --- EXPERT: Cancel previous stale evaluations ---
        if (this.evalAbortController) this.evalAbortController.abort();
        this.evalAbortController = new AbortController();
        const { signal } = this.evalAbortController;

        const savedIdx = this.index;
        const currentFen = this.game.fen();

        // Perform evaluation with cancellation support
        fetch(window.APP_CONST?.API?.EVALUATE || '/api/game/evaluate', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fen: currentFen }),
            signal // Link to abort controller
        })
        .then(res => res.json())
        .then(d => {
            if (d.success && d.engine_results && this.history[savedIdx]) {
                const sc = d.engine_results.search_score;
                this.ui.updateEvaluationBar(sc, currentFen, this.game);
                this.history[savedIdx].score = sc;
                this.history[savedIdx].bestMove = d.engine_results.best_move;
                
                if (savedIdx === this.index) {
                    this.ui.renderBestMoveArrow(d.engine_results.best_move);
                    this.ui.renderPGNTable(this.history, this.index, this.engine);
                    if (window.ALICE_CHAT) window.ALICE_CHAT.checkCoachComment();
                }
            }
        })
        .catch(err => {
            if (err.name === 'AbortError') return; // Expected cancellation
            console.warn('Evaluation failed:', err);
        });

        // Handle Bot or Human turn
        if (playerColor !== null && this.game.turn() !== playerColor) {
            if (isTimed) TIMER_MANAGER.start(this.game.turn(), selectedBotIncrement);
            await this.botGo();
        } else {
            if (isTimed) TIMER_MANAGER.start(this.game.turn(), selectedBotIncrement);
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
        
        const currentVersion = ++this.boardVersion; // Increment version per bot session
        const startTime = Date.now();
        const MIN_THINKING_TIME = window.APP_CONST?.UI_CONFIG?.MIN_BOT_THINKING_TIME_MS || 1200;
        
        try {
            const r = await this.engine.getBestMove(this.game.fen(), selectedBotLevel || 10, selectedBotTime);
            
            // --- EXPERT: Validate that game state has not changed (Undo/Restart) while thinking ---
            if (currentVersion !== this.boardVersion) {
                console.log("⚠️ Ignoring Bot move: board state changed during calculation.");
                return;
            }

            if (r) {
                const elapsed = Date.now() - startTime;
                const remainingWait = Math.max(0, MIN_THINKING_TIME - elapsed);
                if (remainingWait > 0) await new Promise(res => setTimeout(res, remainingWait));
                
                // Final sanity check before applying
                if (currentVersion !== this.boardVersion) return;

                this.game.move(r.move, { sloppy: true });
                const history = this.game.history();
                const san = history[history.length - 1];
                
                this.history.push({ fen: this.game.fen(), score: r.score, san, uci: r.move });
                this.index = this.history.length - 1;
                
                this.opening.detectAndUpdate(this.history, this.index);
                this.updateUI();
                if (window.updateCapturedPieces) window.updateCapturedPieces(this.game);
                
                await this.onTurnEnd();
            }
        } catch (e) {
            console.error("Engine failure:", e);
            if (currentVersion === this.boardVersion) isPlayerTurn = true;
        }
    }

    /**
     * Synchronizes all UI components with the current game state.
     */
    updateUI() {
        const currentState = this.history[this.index];
        if (!currentState) return;

        if (typeof board !== 'undefined' && board) board.position(currentState.fen);
        this.ui.updateAllHighlights(this.game, this.history, this.index);
        this.ui.renderBestMoveArrow(currentState.bestMove || null);

        const op = this.opening.detectAndUpdate(this.history, this.index);
        if (this.ui.dom.openingName) this.ui.dom.openingName.textContent = op.name;

        this.ui.renderPGNTable(this.history, this.index, this.engine);
        this.ui.updateNavButtons(this.index <= 0, this.index >= this.history.length - 1);

        if (currentState.score !== undefined && currentState.score !== null) {
            this.ui.updateEvaluationBar(currentState.score, currentState.fen, this.game);
        }
    }



    /**
     * Initializes global event listeners (UI switches, keys).
     * @private
     */
    _initGlobalListeners() {
        const ids = window.APP_CONST?.IDS || {};
        
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch')?.addEventListener('change', () => { 
                board?.flip(); 
                this.ui.syncOrientation(board?.orientation() === 'black');
                this.updateUI(); 
            });
            document.getElementById(ids.BEST_MOVE_SWITCH || 'best-move-switch')?.addEventListener('change', () => this.ui.renderBestMoveArrow(this.history[this.index]?.bestMove));
            document.getElementById(ids.EVAL_BAR_SWITCH || 'eval-bar-switch')?.addEventListener('change', (e) => {
                const w = document.querySelector('.score-alignment-wrapper');
                if (w) { 
                    w.style.display = e.target.checked ? 'flex' : 'none'; 
                    if(e.target.checked) this.ui.syncBoardAndEvalHeight(); 
                }
            });
            document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch')?.addEventListener('change', () => this.ui.renderPGNTable(this.history, this.index, this.engine));
        });
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'f') document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch')?.click();
            if (e.key === 'ArrowLeft') {
                this.loadFen(this.index - 1);
            } else if (e.key === 'ArrowRight') {
                this.loadFen(this.index + 1);
            }
        });
    }

    /**
     * Handles dynamic board resizing on window change.
     * @private
     */
    _setupResize() {
        if (window._boardResizeInitialized) return;

        const handleResize = () => {
            if (typeof board !== 'undefined' && board) {
                board.resize();
                if (this.ui) this.ui.syncBoardAndEvalHeight();
            }
        };

        window.addEventListener('resize', () => {
            if (this._resizeTimer) clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(handleResize, window.APP_CONST?.UI_CONFIG?.RESIZE_DEBOUNCE_MS || 150);
        });

        const ids = window.APP_CONST?.IDS || {};
        const container = document.getElementById(ids.BOARD_CONTAINER || 'chessboard-main-container');
        if (container && window.ResizeObserver) {
            const ro = new ResizeObserver((entries) => {
                // Use requestAnimationFrame to sync with browser paint
                window.requestAnimationFrame(() => handleResize());
            });
            ro.observe(container);
        }
        window._boardResizeInitialized = true;
    }



    /**
     * Displays a Modal when game is over.
     * @param {string|null} [title=null] - Optional override for modal title.
     * @param {string|null} [message=null] - Optional override for modal body.
     * @private
     */
    _showGameOver(title = null, message = null) {
        let t = title || "Ván đấu kết thúc";
        let b = message || (this.game.in_checkmate() ? `Chiếu hết! ${this.game.turn() === 'b' ? 'Trắng' : 'Đen'} thắng.` : "Hòa!");
        
        const stats = this._calculatePlayerStats();
        this.ui.showGameOverModal(t, b, stats);
    }

    /**
     * Calculates move quality statistics for the human player.
     * @private
     */
    _calculatePlayerStats() {
        const isWhite = (playerColor === 'w' || playerColor === null);
        const counts = {
            brilliant: 0, best: 0, good: 0, solid: 0, 
            blunder: 0, mistake: 0, inacc: 0, great: 0,
            book: 0
        };

        for (let i = 1; i < this.history.length; i++) {
            const isWhiteTurn = (i % 2 !== 0);
            if (isWhiteTurn === isWhite) {
                const m = this.history[i];
                if (!this.history[i-1]) continue;

                if (m.isBookMove) {
                    counts.book++;
                    continue;
                }
                
                if (m.score === null) continue;

                const thresholds = window.APP_CONST?.QUALITY_THRESHOLDS || {};
                const cur = this.engine.parseScore(m.score);
                const pre = this.engine.parseScore(this.history[i-1].score);
                const diff = isWhiteTurn ? (cur - pre) : (pre - cur);
                const isBest = (this.history[i-1].bestMove === m.uci);

                if (diff > (thresholds.BRILLIANT || 1.5)) counts.brilliant++;
                else if (diff > (thresholds.GREAT || 0.8)) counts.great++;
                else if (isBest) counts.best++;
                else if (diff > (thresholds.GOOD || 0.1)) counts.good++;
                else if (diff > (thresholds.SOLID || -0.3)) counts.solid++;
                else if (diff < (thresholds.BLUNDER || -1.5)) counts.blunder++;
                else if (diff < (thresholds.MISTAKE || -0.7)) counts.mistake++;
                else if (diff <= (thresholds.INACCURATE || -0.3)) counts.inacc++;
            }
        }
        return counts;
    }



    /**
     * Chessboard event for move start.
     * @param {string} source - Square clicked.
     * @param {string} piece - Piece identifier.
     * @returns {boolean} True if drag is allowed.
     */
    onDragStart(source, piece) {
        if (!isPlayerTurn || this.game.turn() !== piece[0]) return false;

        // Lưu ô bắt đầu dragging làm sourceSquare cho click-to-move
        this.sourceSquare = source;

        this.ui.updateAllHighlights(this.game, this.history, this.index);
        this.ui.dom.boardCont?.querySelector(`.square-${source}`)?.classList.add('square-selected');
        
        this.game.moves({square: source, verbose: true}).forEach(m => {
            const sq = this.ui.dom.boardCont?.querySelector(`.square-${m.to}`);
            if (sq) sq.classList.add('highlight-move');
        });
        return true;
    }

    /**
     * Board sync after snap animation.
     */
    onSnapEnd() { if (board && board.fen() !== this.game.fen()) board.position(this.game.fen(), false); }



    /**
     * Loads a specific FEN from the move history.
     * @param {number} i - Index of the FEN to load.
     */
    loadFen(i) {
        if (i >= 0 && i < this.history.length) {
            this.index = i;
            this.game.load(this.history[i].fen);
            board.position(this.history[i].fen);
            this.updateUI();
            
            // Update captured pieces when navigating history
            if (window.updateCapturedPieces) {
                window.updateCapturedPieces(this.game);
            }
        }
    }
    /**
     * Resets the game state and clears backend cache.
     */
    async clearBoard() {
        const clearUrl = window.APP_CONST?.API?.CLEAR_CACHE || '/api/game/clear_cache';
        try {
            await fetch(clearUrl, { method: 'POST' });
        } catch (e) {
            console.warn("Failed to clear backend cache", e);
        }

        const currentOrientation = (typeof board !== 'undefined' && board) ? board.orientation() : 'white';
        this.initBoard(currentOrientation);
        this.ui.renderBestMoveArrow(null);
        
        if (window.clearCapturedPieces) window.clearCapturedPieces();
    }

    /**
     * Flips the board orientation and syncs UI helpers.
     */
    flipBoard() {
        if (typeof board !== 'undefined' && board) {
            board.flip();
            this._syncOrientationUI();
            this.updateUI();
        }
    }
}

// Global Core Initialization
const core = new ChessCore();

/**
 * Public interface for main.js communication.
 */
window.LOGIC_GAME = {
    initChessboard: (o, f) => core.initBoard(o, f),
    updateEvaluationBar: (s, f) => core.ui.updateEvaluationBar(s, f, core.game),
    syncBoardAndEvalHeight: () => core.ui.syncBoardAndEvalHeight(),
    makeMove: (m) => core.handleLocalMove(m),
    onDrop: (s, t) => core.onDrop(s, t),
    handleTurnEnd: (f) => core.onTurnEnd(f),
    handleBotTurn: () => core.botGo(),
    updateUI: () => core.updateUI(),
    loadFen: (i) => core.loadFen(i),
    clearBoard: () => core.clearBoard(),
    updateAllHighlights: () => core.ui.updateAllHighlights(core.game, core.history, core.index),
    updatePgnHistory: () => core.ui.renderPGNTable(core.history, core.index, core.engine),
    fetchDeepEvaluation: (f) => core.engine.getDeepEval(f),
    renderBestMoveArrow: (m) => core.ui.renderBestMoveArrow(m),
    handleScoreUpdate: (s, f) => core.ui.updateEvaluationBar(s, f, core.game),
    findKingSquare: (c) => core.ui._findKing(c, core.game),
    showGameOver: (t, m) => core._showGameOver(t, m),
    onDragStart: (s, p, po, o) => core.onDragStart(s, p, po, o),
    onSnapEnd: () => core.onSnapEnd(),
    flipBoard: () => core.flipBoard(),
    // Expose core properties for debugging or main.js compatibility
    getGame: () => core.game,
    getHistory: () => core.history,
    getIndex: () => core.index
};
