/**
 * @fileoverview Logic core for WonderChess application.
 * Handles chessboard initialization, move validation, AI interaction, and UI updates.
 * Built with an Object-Oriented approach for maintainability and performance.
 */

import { APP_CONST } from '../constants.js';
import { ChessUI } from '../ui/chess_ui.js';
import { ChessEngine } from './engine_service.js';
import { ChessOpening } from '../modules/opening_manager.js';
import { OPENINGS_DATA } from '../data/opening_data.js';

/**
 * Main Orchestrator Class for WonderChess.
 * Connects UI, Opening, and Engine components.
 */
export class ChessCore {
    /**
     * Initialize ChessCore and attach to global game state.
     */
    constructor() {
        // Initialize global state for compatibility
        window.playerColor = window.playerColor || null;
        window.isPlayerTurn = (window.isPlayerTurn !== undefined) ? window.isPlayerTurn : true;
        window.selectedBotEngine = window.selectedBotEngine || 'stockfish';
        window.selectedBotLevel = window.selectedBotLevel || 10;

        this.ui = new ChessUI();
        this.engine = new ChessEngine();
        this.opening = new ChessOpening();
        this.sourceSquare = null;
        
        /** @type {Object} The chess.js instance */
        // Note: Chess (chess.js) is currently loaded as a global.
        this.game = new Chess();
        /** @type {Array<Object>} Move history with metadata (FEN, score, etc.) */
        this.history = [{ fen: this.game.fen(), score: "0.00" }];
        /** @type {number} Current pointer in the history array */
        this.index = 0;

        /** @type {AbortController|null} Controller for cancelling stale API evaluations */
        this.evalAbortController = null;
        /** @type {number} Monotonic counter to track board 'version' for async safety */
        this.boardVersion = 0;

        // UI Update Throttling
        this._pendingUIUpdate = false;

        this._initGlobalListeners();
        this._setupResize();
    }

    /**
     * Initializes a new chessboard or resets current one.
     * @param {'white'|'black'} [orientation='white'] - Board orientation.
     * @param {string|null} [fen=null] - Optional FEN to start from.
     */
    initBoard(orientation = 'white', fen = null) {
        const ids = APP_CONST?.IDS || {};
        const chessboardFunc = window.Chessboard || window.ChessBoard;
        
        if (!chessboardFunc) {
            console.error("Chessboard library not loaded!");
            return;
        }

        if (typeof window.board !== 'undefined' && window.board) try { window.board.destroy(); } catch(e){}

        // Check for 'op' param (opening slug)
        const urlParams = new URLSearchParams(window.location.search);
        const opSlug = urlParams.get('op');
        
        // Legacy/Fallback check for ECO
        const opEco = urlParams.get('eco');
        
        let foundOp = null;
        
        if (typeof OPENINGS_DATA !== 'undefined') {
            if (opSlug) {
                const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                foundOp = OPENINGS_DATA.find(o => slugify(o.name) === opSlug);
            } else if (opEco) {
                foundOp = OPENINGS_DATA.find(o => o.eco === opEco);
            }
        }

        if (!fen && foundOp) {
            this.game = new Chess();
            this.history = [{ fen: this.game.fen(), score: "0.00" }];
            this.index = 0;

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
            fen = this.game.fen();
        } else {
            const urlFen = urlParams.get('fen');
            if (!fen && urlFen) fen = decodeURIComponent(urlFen);
            
            const startFen = fen || APP_CONST?.STARTING_FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            this.game = new Chess(startFen);
            this.history = [{ fen: this.game.fen(), score: "0.00" }];
            this.index = 0;
        }
        
        // Initialize the board
        window.board = chessboardFunc(ids.BOARD_ELEMENT || 'myBoard', {
            draggable: true, 
            position: this.game.fen(), 
            pieceTheme: APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png',
            orientation, 
            moveSpeed: 150, 
            snapSpeed: 25,
            onDrop: this.onDrop.bind(this), 
            onDragStart: this.onDragStart.bind(this), 
            onSnapEnd: this.onSnapEnd.bind(this)
        });
        
        const flipSwitch = document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch');
        if (flipSwitch?.checked) window.board.orientation('black');
        this.ui.syncOrientation(window.board.orientation() === 'black');
        
        this.onTurnEnd(); 
        
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
        if (!window.isPlayerTurn) return;

        const piece = this.game.get(square);
        const isMyPiece = piece && piece.color === this.game.turn() && (window.playerColor === null || piece.color === window.playerColor);

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
                window.board.position(this.game.fen());
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
    onDrop(source, target) {
        if (window.playerColor !== null && this.game.turn() !== window.playerColor) return 'snapback';
        
        let uci = source + target;
        const p = this.game.get(source);
        if (p?.type === 'p' && (target[1] === '8' || target[1] === '1')) uci += 'q';
        
        const move = this.game.move({ 
            from: source, 
            to: target, 
            promotion: uci.endsWith('q') ? 'q' : undefined 
        });

        if (move === null) return 'snapback';
        
        this.handleLocalMove(uci);
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
        
        if (window.updateCapturedPieces) {
            window.updateCapturedPieces(this.game);
        }
        
        this.boardVersion++;
        await this.onTurnEnd();
    }

    /**
     * Logic executed after every turn (checking game over, starting engine).
     * @async
     */
    async onTurnEnd() {
        this.updateUI();
        const isTimed = (window.TIMER_MANAGER && window.TIMER_MANAGER.isTimedGame);
        if (isTimed) window.TIMER_MANAGER.stop();
        
        if (this.game.game_over()) {
            this._showGameOver();
            window.isPlayerTurn = true; 
            return;
        }

        if (this.evalAbortController) this.evalAbortController.abort();
        this.evalAbortController = new AbortController();
        const { signal } = this.evalAbortController;

        const savedIdx = this.index;
        const currentFen = this.game.fen();

        fetch(APP_CONST?.API?.EVALUATE || '/api/game/evaluate', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fen: currentFen }),
            signal
        })
        .then(res => res.json())
        .then(d => {
            if (d.success && d.engine_results && this.history[savedIdx]) {
                const sc = d.engine_results.search_score;
                const oldScore = this.history[savedIdx].score;
                
                // Debug log for score jumping
                if (oldScore !== null && Math.abs(parseFloat(sc) - parseFloat(oldScore)) > 2.0) {
                    console.warn(`[EvalJump] Move ${savedIdx} changed: ${oldScore} -> ${sc}`);
                }

                this.history[savedIdx].score = sc;
                this.history[savedIdx].bestMove = d.engine_results.best_move;
                
                // Update table regardless of if it's the current move (to fill missing labels)
                this.ui.renderPGNTable(this.history, this.index, this.engine);

                // These UI elements only update if we are still on this position
                if (savedIdx === this.index) {
                    this.ui.updateEvaluationBar(sc, currentFen, this.game);
                    this.ui.renderBestMoveArrow(d.engine_results.best_move);
                    if (window.ALICE_CHAT) window.ALICE_CHAT.checkCoachComment();
                }
            }
        })
        .catch(err => {
            if (err.name === 'AbortError') return;
            console.warn('Evaluation failed:', err);
        });

        if (window.playerColor !== null && this.game.turn() !== window.playerColor) {
            if (isTimed) window.TIMER_MANAGER.start(this.game.turn(), window.selectedBotIncrement);
            await this.botGo();
        } else {
            if (isTimed) window.TIMER_MANAGER.start(this.game.turn(), window.selectedBotIncrement);
            window.isPlayerTurn = true;
        }
    }

    /**
     * Triggers AI calculation and move execution.
     * @async
     */
    async botGo() {
        window.isPlayerTurn = false;
        this.ui.renderBestMoveArrow(null);
        
        const currentVersion = ++this.boardVersion;
        const startTime = Date.now();
        const MIN_THINKING_TIME = APP_CONST?.UI_CONFIG?.MIN_BOT_THINKING_TIME_MS || 1200;
        
        try {
            const r = await this.engine.getBestMove(this.game.fen(), window.selectedBotLevel || 10, window.selectedBotTime);
            
            if (currentVersion !== this.boardVersion) {
                console.log("⚠️ Ignoring Bot move: board state changed during calculation.");
                return;
            }

            if (r) {
                const elapsed = Date.now() - startTime;
                const remainingWait = Math.max(0, MIN_THINKING_TIME - elapsed);
                if (remainingWait > 0) await new Promise(res => setTimeout(res, remainingWait));
                
                if (currentVersion !== this.boardVersion) return;

                this.game.move(r.move, { sloppy: true });
                const history = this.game.history();
                const san = history[history.length - 1];
                
                // Push Bot move to history with null score to avoid "jumping"
                // The authoritative evaluation will be filled by onTurnEnd()
                this.history.push({ fen: this.game.fen(), score: null, san, uci: r.move });
                this.index = this.history.length - 1;
                
                this.opening.detectAndUpdate(this.history, this.index);
                if (window.updateCapturedPieces) window.updateCapturedPieces(this.game);
                
                // Consolidation: onTurnEnd will call updateUI()
                await this.onTurnEnd();
            } else {
                window.isPlayerTurn = true;
            }
        } catch (e) {
            console.error("Engine failure:", e);
            if (currentVersion === this.boardVersion) window.isPlayerTurn = true;
        }
    }

    /**
     * Synchronizes all UI components with the current game state.
     */
    updateUI() {
        if (this._pendingUIUpdate) return;
        this._pendingUIUpdate = true;

        window.requestAnimationFrame(() => {
            const currentState = this.history[this.index];
            if (!currentState) {
                this._pendingUIUpdate = false;
                return;
            }

            // Sync Board Position
            if (typeof window.board !== 'undefined' && window.board) {
                const boardPos = window.board.fen();
                const statePos = currentState.fen.split(' ')[0];
                if (boardPos !== statePos) {
                    window.board.position(currentState.fen, false);
                }
            }

            // Sync Highlights & Arrows
            this.ui.updateAllHighlights(this.game, this.history, this.index);
            this.ui.renderBestMoveArrow(currentState.bestMove || null);

            // Sync Opening Name
            const op = this.opening.detectAndUpdate(this.history, this.index);
            if (this.ui.dom.openingName) this.ui.dom.openingName.textContent = op.name;

            // Sync History Table & Sidebar
            this.ui.renderPGNTable(this.history, this.index, this.engine);
            this.ui.updateNavButtons(this.index <= 0, this.index >= this.history.length - 1);

            // Sync Eval Bar
            if (currentState.score !== undefined && currentState.score !== null) {
                this.ui.updateEvaluationBar(currentState.score, currentState.fen, this.game);
            }

            this._pendingUIUpdate = false;
        });
    }

    /**
     * Initializes global event listeners (UI switches, keys).
     * @private
     */
    _initGlobalListeners() {
        const ids = APP_CONST?.IDS || {};
        
        document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch')?.addEventListener('change', () => { 
            window.board?.flip(); 
            this.ui.syncOrientation(window.board?.orientation() === 'black');
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
    }

    /**
     * Handles dynamic board resizing on window change.
     * @private
     */
    _setupResize() {
        if (window._boardResizeInitialized) return;

        const handleResize = () => {
            if (typeof window.board !== 'undefined' && window.board) {
                window.board.resize();
            }
            if (this.ui) {
                this.ui.syncBoardAndEvalHeight();
            }
            this.updateUI();
        };

        const ids = APP_CONST?.IDS || {};
        const container = document.getElementById(ids.BOARD_CONTAINER || 'chessboard-main-container');
        if (container && window.ResizeObserver) {
            let roTimeout = null;
            const ro = new ResizeObserver(() => {
                if (roTimeout) return;
                roTimeout = setTimeout(() => {
                    handleResize();
                    roTimeout = null;
                }, 100);
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
        const isWhite = (window.playerColor === 'w' || window.playerColor === null);
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
                
                let preScoreObj = this.history[i-1].score;
                let isPrevBook = this.history[i-1].isBookMove;

                if (preScoreObj === null || preScoreObj === undefined) {
                    if (isPrevBook) {
                        preScoreObj = "0.00";
                    } else continue;
                }

                const thresholds = APP_CONST?.QUALITY_THRESHOLDS || {};
                const cur = this.engine.parseScore(m.score);
                const pre = this.engine.parseScore(preScoreObj);
                const diff = isWhiteTurn ? (cur - pre) : (pre - cur);
                const isBest = (this.history[i-1].bestMove === m.uci);

                const wasWinning = Math.abs(pre) >= (thresholds.MISS_WIN_FROM || 2.5);
                const lostAdvantage = Math.abs(cur) <= (thresholds.MISS_WIN_TO || 0.6);

                if (wasWinning && lostAdvantage && diff < -1.0) counts.blunder++;
                else if (diff >= (thresholds.BRILLIANT || 1.6) && !isBest) counts.brilliant++;
                else if (diff >= (thresholds.GREAT || 0.9)) counts.great++;
                else if (isBest || diff >= (thresholds.BEST || -0.1)) counts.best++;
                else if (diff >= (thresholds.GOOD || 0.2)) counts.good++;
                else if (diff >= (thresholds.SOLID || -0.4)) counts.solid++;
                else if (diff >= (thresholds.INACCURATE || -0.8)) counts.inacc++;
                else if (diff >= (thresholds.MISTAKE || -1.6)) counts.mistake++;
                else counts.blunder++;
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
        if (!window.isPlayerTurn || this.game.turn() !== piece[0]) return false;

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
    onSnapEnd() { 
        if (window.board && window.board.fen() !== this.game.fen().split(' ')[0]) {
            window.board.position(this.game.fen(), false); 
        }
        this.updateUI(); 
    }

    /**
     * Loads a specific FEN from the move history.
     * @param {number} i - Index of the FEN to load.
     */
    loadFen(i) {
        if (i >= 0 && i < this.history.length) {
            this.index = i;
            this.game.load(this.history[i].fen);
            window.board.position(this.history[i].fen);
            this.updateUI();
            
            if (window.updateCapturedPieces) {
                window.updateCapturedPieces(this.game);
            }
        }
    }
    /**
     * Resets the game state and clears backend cache.
     */
    async clearBoard() {
        const clearUrl = APP_CONST?.API?.CLEAR_CACHE || '/api/game/clear_cache';
        try {
            await fetch(clearUrl, { method: 'POST' });
        } catch (e) {
            console.warn("Failed to clear backend cache", e);
        }

        const currentOrientation = (typeof window.board !== 'undefined' && window.board) ? window.board.orientation() : 'white';
        this.initBoard(currentOrientation);
        this.ui.renderBestMoveArrow(null);
        
        if (window.clearCapturedPieces) window.clearCapturedPieces();
    }

    /**
     * Flips the board orientation and syncs UI helpers.
     */
    flipBoard() {
        if (typeof window.board !== 'undefined' && window.board) {
            window.board.flip();
            this.updateUI();
        }
    }

    /**
     * Returns the current history index.
     * @returns {number}
     */
    getIndex() {
        return this.index;
    }

    /**
     * Returns the full move history.
     * @returns {Array<Object>}
     */
    getHistory() {
        return this.history;
    }

    /**
     * Returns the current chess.js instance.
     * @returns {Object}
     */
    getGame() {
        return this.game;
    }
}
