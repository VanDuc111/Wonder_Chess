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
            openingName: null
        };
    }

    /**
     * Ensures mandatory DOM elements are cached for performance.
     * @private
     */
    _ensureDom() {
        // Only re-cache if essential elements are missing
        if (this.dom.evalBar && document.contains(this.dom.evalBar)) return;

        const ids = window.APP_CONST?.IDS || {};
        this.dom.evalBar = document.getElementById(ids.EVAL_BAR || 'eval-white-advantage');
        this.dom.evalScore = document.getElementById(ids.EVAL_SCORE || 'evaluation-score');
        this.dom.boardCont = document.getElementById('myBoard');
        this.dom.openingName = document.getElementById('opening-name');
        this.dom.arrowCont = document.getElementById('arrow-container');
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
     * Updates the visual evaluation bar directly with a winner.
     * @param {string} winner 'w' or 'b'
     */
    updateEvaluationGameOver(winner) {
        this._ensureDom();
        if (winner === 'w') this._applyEvalUI(100, "1-0");
        else if (winner === 'b') this._applyEvalUI(0, "0-1");
        else this._applyEvalUI(50, "1/2-1/2");
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
            const boardArea = document.querySelector('.chess-board-area');
            const barCont = document.querySelector('.score-bar-container');
            const wrapper = document.querySelector('.score-alignment-wrapper');
            
            if (!boardArea || !barCont || !wrapper) return;

            const h = boardArea.clientHeight;
            if (h <= 0) return;

            const screenWidth = window.innerWidth;
            const rootStyles = getComputedStyle(document.documentElement);
            
            let offset;
            if (screenWidth >= 992) offset = parseInt(rootStyles.getPropertyValue('--eval-offset-desktop')) || 45;
            else if (screenWidth >= 577) offset = parseInt(rootStyles.getPropertyValue('--eval-offset-tablet')) || 55;
            else offset = parseInt(rootStyles.getPropertyValue('--eval-offset-mobile')) || 48;
            
            const wrapperHeight = h - (offset * 2);
            wrapper.style.height = `${wrapperHeight}px`;
            
            const scoreH = this.dom.evalScore ? this.dom.evalScore.offsetHeight : 0;
            barCont.style.height = `${wrapperHeight - scoreH - 10}px`;
        }, 50);
    }

    /**
     * Renders a SVG arrow on the board indicating the best move.
     * @param {string|null} moveUci - Move in UCI format (e.g., "e2e4").
     */
    renderBestMoveArrow(moveUci) {
        this._ensureDom();
        if (!this.dom.boardCont) return;
        
        const enabled = document.getElementById('best-move-switch')?.checked;
        
        // If disabled or no move, just clear and exit
        if (!enabled || !moveUci || moveUci.length < 4) {
            if (this.dom.arrowCont) this.dom.arrowCont.innerHTML = '';
            if (this.dom.arrowCont) this.dom.arrowCont.setAttribute('data-current-move', '');
            return;
        }

        // --- NEW: Check if arrowCont exists and is still attached to the current board ---
        const isAttached = this.dom.arrowCont && this.dom.boardCont.contains(this.dom.arrowCont);

        if (!this.dom.arrowCont || !isAttached) {
            if (!this.dom.arrowCont) {
                this.dom.arrowCont = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                this.dom.arrowCont.id = "arrow-container";
                Object.assign(this.dom.arrowCont.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: '100'
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

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        marker.setAttribute("markerWidth", "6"); marker.setAttribute("markerHeight", "6");
        marker.setAttribute("refX", "0"); marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", "0 0, 6 3, 0 6");
        poly.setAttribute("fill", "rgba(76, 175, 80, 0.95)");
        marker.appendChild(poly); defs.appendChild(marker); this.dom.arrowCont.appendChild(defs);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
        line.setAttribute("x2", start.x + dx * ratio); line.setAttribute("y2", start.y + dy * ratio);
        line.setAttribute("stroke", "rgba(76, 175, 80, 0.6)"); 
        line.setAttribute("stroke-width", "4"); 
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
