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
        const ids = window.APP_CONST?.IDS || {};
        if (!this.dom.pgnList) this.dom.pgnList = document.getElementById(ids.PGN_VERTICAL_LIST || 'pgn-history-list-vertical');
        if (!this.dom.pgnCont) this.dom.pgnCont = document.getElementById(ids.PGN_VERTICAL_CONT || 'pgn-history-vertical');
        if (!this.dom.notateSwitch) this.dom.notateSwitch = document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch');
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
        this._syncOrientationUI();
        
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
                    this._renderPGN();
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

        this._renderPGN();
        this._syncButtons();

        if (currentState.score !== undefined && currentState.score !== null) {
            this.ui.updateEvaluationBar(currentState.score, currentState.fen, this.game);
        }
    }

    /**
     * Renders the vertical PGN history table.
     * @private
     */
    _renderPGN() {
        this._ensureDom();
        if (!this.dom.pgnList) return;
        
        // Cache check to avoid redundant innerHTML sets. Include score to update icons when engine results arrive.
        const currentScore = this.history[this.index]?.score || '';
        const stateKey = `len:${this.history.length}-idx:${this.index}-sc:${currentScore}`;
        if (this._lastPgnStateKey === stateKey) return;
        this._lastPgnStateKey = stateKey;
        
        const htmlParts = [];
        for (let i = 1; i < this.history.length; i += 2) {
            const w = this.history[i], b = this.history[i + 1];
            const wH = (i === this.index) ? 'current-move-highlight' : '';
            const bH = (b && (i+1) === this.index) ? 'current-move-highlight' : '';
            
            htmlParts.push(`<tr><td class="move-number-cell">${Math.floor((i-1)/2)+1}.</td>`);
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
        if (m.score === null || m.score === undefined || idx === 0 || !this.history[idx-1]) return '';

        const cur = this.engine.parseScore(m.score);
        const pre = this.engine.parseScore(this.history[idx-1].score);
        const diff = (idx % 2 !== 0) ? (cur - pre) : (pre - cur);
        const isBest = (this.history[idx-1].bestMove === m.uci);

        const thresholds = window.APP_CONST?.QUALITY_THRESHOLDS || {};

        if (diff > (thresholds.BRILLIANT || 1.5)) return `<span class="move-annotation" title="Brilliant"><img src="static/img/icon/brilliant.svg"></span>`;
        if (diff > (thresholds.GREAT || 0.8)) return `<span class="move-annotation" title="Great Move"><img src="static/img/icon/great.svg"></span>`;
        if (isBest) return `<span class="move-annotation" title="Best Move"><img src="static/img/icon/best.svg"></span>`;
        if (diff > (thresholds.GOOD || 0.1)) return `<span class="move-annotation" title="Good Move"><img src="static/img/icon/good.svg"></span>`;
        if (diff > (thresholds.SOLID || -0.3)) return `<span class="move-annotation" title="Solid Move"><img src="static/img/icon/solid.svg"></span>`;
        
        const isMissWin = Math.abs(pre) > (thresholds.MISS_WIN_THRESHOLD || 2.5) && 
                          Math.abs(cur) < (thresholds.MISS_WIN_RESULT || 0.5);
        if (isMissWin) return `<span class="move-annotation" title="Missed Win"><img src="static/img/icon/miss.svg"></span>`;
        
        if (diff < (thresholds.BLUNDER || -1.5)) return `<span class="move-annotation" title="Blunder"><img src="static/img/icon/blunder.svg"></span>`;
        if (diff < (thresholds.MISTAKE || -0.7)) return `<span class="move-annotation" title="Mistake"><img src="static/img/icon/mistake.svg"></span>`;
        if (diff <= (thresholds.INACCURATE || -0.3)) return `<span class="move-annotation" title="Inaccurate"><img src="static/img/icon/inacc.svg"></span>`;

        return '';
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
                this._syncOrientationUI();
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
            document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch')?.addEventListener('change', () => this._renderPGN());
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
     * Syncs navigation button states (enabled/disabled).
     * @private
     */
    _syncButtons() {
        const isF = this.index <= 0, isL = this.index >= this.history.length - 1;
        try {
            $('[data-action="first"], [data-action="prev"]').prop('disabled', isF);
            $('[data-action="next"], [data-action="last"]').prop('disabled', isL);
        } catch (e) {}
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
        
        if (window.showGameOverModal) {
            // Hiện kết quả ngay lập tức
            window.showGameOverModal(t, b);
            
            const shuffler = document.getElementById('game-over-stats-shuffler');
            const statsGrid = document.getElementById('game-over-stats');
            
            if (shuffler) shuffler.classList.remove('d-none');
            if (statsGrid) statsGrid.classList.add('d-none');

            // hiệu ứng xáo trộn icon
            setTimeout(() => {
                const stats = this._calculatePlayerStats();
                this._renderPlayerStats(stats);
                
                if (shuffler) shuffler.classList.add('d-none');
                if (statsGrid) {
                    statsGrid.classList.remove('d-none');
                    statsGrid.style.opacity = '0';
                    statsGrid.style.transition = 'opacity 0.6s ease';
                    setTimeout(() => statsGrid.style.opacity = '1', 10);
                }
            }, 2500); 
        }
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
     * Renders top 3 stats to the modal, filtering out zero values.
     * @private
     */
    _renderPlayerStats(counts) {
        const statsGrid = document.getElementById('game-over-stats');
        if (!statsGrid) return;

        const all = [
            { label: 'Thiên tài', val: counts.brilliant, class: 'stat-brilliant', priority: 100 },
            { label: 'Sai lầm nghiêm trọng', val: counts.blunder, class: 'stat-blunder', priority: 90 },
            { label: 'Tốt nhất', val: counts.best, class: 'stat-best', priority: 80 },
            { label: 'Lý thuyết', val: counts.book, class: 'stat-book', priority: 75 },
            { label: 'Tuyệt vời', val: counts.great, class: 'stat-good', priority: 70 },
            { label: 'Tốt', val: counts.good, class: 'stat-good', priority: 60 },
            { label: 'Vững chắc', val: counts.solid, class: 'stat-solid', priority: 50 },
            { label: 'Sai lầm', val: counts.mistake, class: 'stat-mistake', priority: 40 },
            { label: 'Không chính xác', val: counts.inacc, class: 'stat-inacc', priority: 30 }
        ];

        // CHỈ giữ lại các chỉ số có giá trị > 0
        let filtered = all.filter(i => i.val > 0).sort((a, b) => b.priority - a.priority).slice(0, 3);
        
        // Nếu không có bất kỳ chỉ số nào > 0 (hiếm gặp), hiển thị Tốt nhất, Tốt, Vững chắc mặc định là 0
        if (filtered.length === 0) {
            filtered = all.filter(i => ['Tốt nhất', 'Tốt', 'Vững chắc'].includes(i.label)).slice(0, 3);
        }

        statsGrid.innerHTML = filtered.map(i => `
            <div class="stat-item">
                <span class="stat-value ${i.class}">${i.val}</span>
                <span class="stat-label">${i.label}</span>
            </div>
        `).join('');
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
     * Synchronizes UI components (timers, eval bar) with the board orientation.
     * @private
     */
    _syncOrientationUI() {
        if (!board) return;
        const isFlipped = board.orientation() === 'black';
        const boardArea = document.querySelector('.chess-board-area');
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        
        if (boardArea) boardArea.classList.toggle('rotated-board', isFlipped);
        if (scoreWrapper) scoreWrapper.classList.toggle('rotated-score', isFlipped);
    }

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
    clearBoard: () => { 
        const clearUrl = window.APP_CONST?.API?.CLEAR_CACHE || '/api/game/clear_cache';
        fetch(clearUrl, {method:'POST'}); 
        core.initBoard(board?.orientation()); 
        core.ui.renderBestMoveArrow(null); 
        if (window.clearCapturedPieces) window.clearCapturedPieces();
    },
    updateAllHighlights: () => core.ui.updateAllHighlights(core.game, core.history, core.index),
    updatePgnHistory: () => core._renderPGN(),
    fetchDeepEvaluation: (f) => core.engine.getDeepEval(f),
    renderBestMoveArrow: (m) => core.ui.renderBestMoveArrow(m),
    handleScoreUpdate: (s, f) => core.ui.updateEvaluationBar(s, f, core.game),
    findKingSquare: (c) => core.ui._findKing(c, core.game),
    showGameOver: (t, m) => core._showGameOver(t, m),
    onDragStart: (s, p, po, o) => core.onDragStart(s, p, po, o),
    onSnapEnd: () => core.onSnapEnd(),
    flipBoard: () => {
        if (typeof board !== 'undefined' && board) {
            board.flip();
            core._syncOrientationUI();
            core.updateUI();
        }
    },
    // Expose core properties for debugging or main.js compatibility
    getGame: () => core.game,
    getHistory: () => core.history,
    getIndex: () => core.index
};
