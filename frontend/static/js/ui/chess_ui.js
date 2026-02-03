/**
 * @fileoverview ChessUI Module - Handles all visual components of the WonderChess board.
 * Responsible for rendering evaluation bars, move quality arrows, and square highlights.
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
            openingName: null,
            pgnList: null,
            pgnCont: null,
            notateSwitch: null
        };
    }

    /**
     * Ensures mandatory DOM elements are cached for performance.
     * @private
     */
    _ensureDom() {
        const ids = window.APP_CONST?.IDS || {};
        // Only re-cache if essential elements are missing
        if (this.dom.evalBar && document.contains(this.dom.evalBar)) return;

        this.dom.evalBar = document.getElementById(ids.EVAL_BAR || 'eval-white-advantage');
        this.dom.evalScore = document.getElementById(ids.EVAL_SCORE || 'evaluation-score');
        this.dom.boardCont = document.getElementById(ids.BOARD_ELEMENT || 'myBoard');
        this.dom.openingName = document.getElementById(ids.OPENING_NAME_DISPLAY || 'opening-name');
        this.dom.arrowCont = document.getElementById(ids.ARROW_CONTAINER || 'arrow-container');
        this.dom.pgnList = document.getElementById(ids.PGN_VERTICAL_LIST || 'pgn-history-list-vertical');
        this.dom.pgnCont = document.getElementById(ids.PGN_VERTICAL_CONT || 'pgn-history-vertical');
        this.dom.notateSwitch = document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch');
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

            const strings = window.APP_CONST?.STRINGS || {};
            let formattedScore = strings.EVAL_DEFAULT || "0.00";
            let percentAdvantage = 50;

            // Check for game over states first
            if (gameInstance && typeof gameInstance.game_over === 'function' && gameInstance.game_over()) {
                if (gameInstance.in_checkmate()) {
                    formattedScore = (gameInstance.turn() === 'b') ? strings.SCORE_WHITE_WIN : strings.SCORE_BLACK_WIN;
                    percentAdvantage = (gameInstance.turn() === 'b') ? 100 : 0;
                } else {
                    formattedScore = strings.SCORE_DRAW || "1/2-1/2";
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
                    const mateBase = window.APP_CONST?.ENGINE?.MATE_SCORE_BASE || 1000000;
                    const mateAdjust = window.APP_CONST?.ENGINE?.MATE_DEPTH_ADJUSTMENT || 500;
                    const MATE_VAL = mateBase - mateAdjust;

                    if (Math.abs(numScore) > MATE_VAL) {
                        const moves = mateBase - Math.abs(numScore);
                        formattedScore = (numScore > 0) ? `M+${moves}` : `M-${moves}`;
                        percentAdvantage = (numScore > 0) ? 100 : 0;
                    } else {
                        const MAX_PAWNS = window.APP_CONST?.UI_CONFIG?.EVAL_MAX_PAWNS || 10.0;
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
     * Updates the visual evaluation bar directly with a winner.
     * @param {string} winner 'w' or 'b'
     */
    updateEvaluationGameOver(winner) {
        this._ensureDom();
        const strings = window.APP_CONST?.STRINGS || {};
        if (winner === 'w') this._applyEvalUI(100, strings.SCORE_WHITE_WIN || "1-0");
        else if (winner === 'b') this._applyEvalUI(0, strings.SCORE_BLACK_WIN || "0-1");
        else this._applyEvalUI(50, strings.SCORE_DRAW || "1/2-1/2");
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
     * Debounced to prevent layout thrashing.
     */
    syncBoardAndEvalHeight() {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        
        this._syncTimeout = setTimeout(() => {
            this._ensureDom();
            const config = window.APP_CONST?.UI_CONFIG || {};
            const offsets = config.EVAL_OFFSETS || {};
            
            const boardArea = document.querySelector('.chess-board-area');
            const barCont = document.querySelector('.score-bar-container');
            const wrapper = document.querySelector('.score-alignment-wrapper');
            
            if (!boardArea || !barCont || !wrapper) return;

            const h = boardArea.clientHeight;
            if (h <= 0) return;

            const screenWidth = window.innerWidth;
            const rootStyles = getComputedStyle(document.documentElement);
            
            let offset;
            if (screenWidth >= (offsets.BREAKPOINT_LG || 992)) offset = parseInt(rootStyles.getPropertyValue('--eval-offset-desktop')) || (offsets.DESKTOP || 45);
            else if (screenWidth >= (offsets.BREAKPOINT_MD || 577)) offset = parseInt(rootStyles.getPropertyValue('--eval-offset-tablet')) || (offsets.TABLET || 55);
            else offset = parseInt(rootStyles.getPropertyValue('--eval-offset-mobile')) || (offsets.MOBILE || 48);
            
            const wrapperHeight = h - (offset * 2);
            wrapper.style.height = `${wrapperHeight}px`;
            
            const scoreH = this.dom.evalScore ? this.dom.evalScore.offsetHeight : 0;
            barCont.style.height = `${wrapperHeight - scoreH - 10}px`;
        }, window.APP_CONST?.UI_CONFIG?.UI_SYNC_DELAY_MS || 50);
    }

    /**
     * Renders a SVG arrow on the board indicating the best move.
     * @param {string|null} moveUci - Move in UCI format (e.g., "e2e4").
     */
    renderBestMoveArrow(moveUci) {
        this._ensureDom();
        if (!this.dom.boardCont) return;
        
        const ids = window.APP_CONST?.IDS || {};
        const enabled = document.getElementById(ids.BEST_MOVE_SWITCH || 'best-move-switch')?.checked;
        
        // If disabled or no move, just clear and exit
        if (!enabled || !moveUci || moveUci.length < 4) {
            if (this.dom.arrowCont) this.dom.arrowCont.innerHTML = '';
            if (this.dom.arrowCont) this.dom.arrowCont.setAttribute('data-current-move', '');
            return;
        }

        // --- NEW: Check if arrowCont exists and is still attached to the current board ---
        const isAttached = this.dom.arrowCont && this.dom.boardCont.contains(this.dom.arrowCont);

        if (!this.dom.arrowCont || !isAttached) {
            const arrowIds = window.APP_CONST?.IDS || {};
            const arrowStyles = window.APP_CONST?.UI_CONFIG?.ARROW || {};

            if (!this.dom.arrowCont) {
                this.dom.arrowCont = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                this.dom.arrowCont.id = arrowIds.ARROW_CONTAINER || "arrow-container";
                Object.assign(this.dom.arrowCont.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: arrowStyles.Z_INDEX || '100'
                });
            }
            // (Re)attach to current board container
            this.dom.boardCont.appendChild(this.dom.arrowCont);
        } else {
            // Optimization: If the same move arrow is already there, don't redraw
            if (this.dom.arrowCont.getAttribute('data-current-move') === moveUci) return;
        }
        
        this.dom.arrowCont.innerHTML = '';
        this.dom.arrowCont.setAttribute('data-current-move', moveUci);

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
        const ratio = (len - 10) / len;

        const arrowStyles = window.APP_CONST?.UI_CONFIG?.ARROW || {};

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        marker.setAttribute("markerWidth", "6"); marker.setAttribute("markerHeight", "6");
        marker.setAttribute("refX", "0"); marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", "0 0, 6 3, 0 6");
        poly.setAttribute("fill", arrowStyles.COLOR || "rgba(76, 175, 80, 0.95)");
        marker.appendChild(poly); defs.appendChild(marker); this.dom.arrowCont.appendChild(defs);
 
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
        line.setAttribute("x2", start.x + dx * ratio); line.setAttribute("y2", start.y + dy * ratio);
        line.setAttribute("stroke", arrowStyles.COLOR_LINE || "rgba(76, 175, 80, 0.6)"); 
        line.setAttribute("stroke-width", arrowStyles.WIDTH || "4"); 
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
        
        const classes = window.APP_CONST?.CLASSES || {};
        const sqSelector = window.APP_CONST?.EDITOR?.SQUARE_SELECTOR || '.square-55d63';

        this.dom.boardCont.querySelectorAll(sqSelector).forEach(sq => {
            sq.classList.remove(classes.SQUARE_SELECTED || 'square-selected', classes.HIGHLIGHT_MOVE || 'highlight-move', classes.HIGHLIGHT_CHECK || 'highlight-check');
        });

        if (gameInstance.in_check()) {
            const king = this._findKing(gameInstance.turn(), gameInstance);
            this.dom.boardCont.querySelector(`.square-${king}`)?.classList.add(classes.HIGHLIGHT_CHECK || 'highlight-check');
        }

        const moveEntry = history[curIdx];
        if (moveEntry && moveEntry.uci) {
            const classes = window.APP_CONST?.CLASSES || {};
            const from = moveEntry.uci.substring(0, 2);
            const to = moveEntry.uci.substring(2, 4);
            this.dom.boardCont.querySelector(`.square-${from}`)?.classList.add(classes.SQUARE_SELECTED || 'square-selected');
            this.dom.boardCont.querySelector(`.square-${to}`)?.classList.add(classes.SQUARE_SELECTED || 'square-selected');
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
        const files = window.APP_CONST?.CHESS_RULES?.BOARD_FILES || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        for (const f of files) {
            for (const r of ranks) {
                const p = game.get(f + r);
                if (p?.type === 'k' && p?.color === color) return f + r;
            }
        }
        return null;
    }
    /**
     * Renders the vertical PGN history table.
     * @param {Array} history - The app's moveHistory array.
     * @param {number} curIdx - Current index in the history.
     * @param {Object} engineService - (Optional) Engine service to parse scores for annotations.
     */
    renderPGNTable(history, curIdx, engineService = null) {
        this._ensureDom();
        if (!this.dom.pgnList) return;
        
        const currentScore = history[curIdx]?.score || '';
        const stateKey = `len:${history.length}-idx:${curIdx}-sc:${currentScore}`;
        if (this._lastPgnStateKey === stateKey) return;
        this._lastPgnStateKey = stateKey;
        
        const htmlParts = [];
        for (let i = 1; i < history.length; i += 2) {
            const w = history[i], b = history[i + 1];
            const wH = (i === curIdx) ? 'current-move-highlight' : '';
            const bH = (b && (i+1) === curIdx) ? 'current-move-highlight' : '';
            
            htmlParts.push(`<tr><td class="move-number-cell">${Math.floor((i-1)/2)+1}.</td>`);
            htmlParts.push(`<td class="move-cell ${wH}" data-index="${i}">${w.san} ${this._annot(history, i, engineService)}</td>`);
            htmlParts.push(`<td class="move-cell ${bH}" data-index="${i+1}">${b ? b.san : ''} ${b ? this._annot(history, i+1, engineService) : ''}</td></tr>`);
        }
        
        this.dom.pgnList.innerHTML = htmlParts.join('');
        if (this.dom.pgnCont) this.dom.pgnCont.scrollTop = this.dom.pgnCont.scrollHeight;
    }

    /**
     * Generates annotation icons based on move quality.
     * @private
     */
    _annot(history, idx, engineService) {
        if (!this.dom.notateSwitch?.checked || !engineService) return '';
        const m = history[idx];
        if (m.isBookMove) return `<span class="move-annotation" title="Book Move"><img src="static/img/icon/book.svg"></span>`;
        if (m.score === null || m.score === undefined || idx === 0 || !history[idx-1]) return '';

        const cur = engineService.parseScore(m.score);
        const pre = engineService.parseScore(history[idx-1].score);
        const diff = (idx % 2 !== 0) ? (cur - pre) : (pre - cur);
        const isBest = (history[idx-1].bestMove === m.uci);

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
     * Syncs navigation button states (enabled/disabled).
     */
    updateNavButtons(isFirst, isLast) {
        try {
            $('[data-action="first"], [data-action="prev"]').prop('disabled', isFirst);
            $('[data-action="next"], [data-action="last"]').prop('disabled', isLast);
        } catch (e) {}
    }

    /**
     * Synchronizes UI components with the board orientation.
     */
    syncOrientation(isFlipped) {
        const classes = window.APP_CONST?.CLASSES || {};
        const boardArea = document.querySelector('.chess-board-area');
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        
        if (boardArea) boardArea.classList.toggle(classes.ROTATED_BOARD || 'rotated-board', isFlipped);
        if (scoreWrapper) scoreWrapper.classList.toggle(classes.ROTATED_SCORE || 'rotated-score', isFlipped);
    }

    /**
     * Displays GameOver modal and renders stats.
     */
    showGameOverModal(title, message, stats = null) {
        if (window.showGameOverModal) {
            window.showGameOverModal(title, message);
            
            if (stats) {
                const shuffler = document.getElementById('game-over-stats-shuffler');
                const statsGrid = document.getElementById('game-over-stats');
                
                if (shuffler) shuffler.classList.remove('d-none');
                if (statsGrid) statsGrid.classList.add('d-none');

                setTimeout(() => {
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
    }

    /**
     * Renders stats to the modal.
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

        let filtered = all.filter(i => i.val > 0).sort((a, b) => b.priority - a.priority).slice(0, 3);
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
}
