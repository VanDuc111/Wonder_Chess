/**
 * @fileoverview ChessUI Module - Handles all visual components of the WonderChess board.
 * Responsible for rendering evaluation bars, move quality arrows, and square highlights.
 */

import { APP_CONST } from '../constants.js';

export class ChessUI {
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
            notateSwitch: null,
            boardArea: null,
            barCont: null,
            wrapper: null
        };
        this._lastPgnStateKey = null;
        this._lastEvalHeight = 0;
        this._cachedOffsets = null;
    }

    /**
     * Ensures mandatory DOM elements are cached for performance.
     * @private
     */
    _ensureDom() {
        const ids = APP_CONST?.IDS || {};
        
        if (!this.dom.evalBar) this.dom.evalBar = document.getElementById(ids.EVAL_BAR || 'eval-white-advantage');
        if (!this.dom.evalScore) this.dom.evalScore = document.getElementById(ids.EVAL_SCORE || 'evaluation-score');
        if (!this.dom.boardCont) this.dom.boardCont = document.getElementById(ids.BOARD_ELEMENT || 'myBoard');
        if (!this.dom.openingName) this.dom.openingName = document.getElementById(ids.OPENING_NAME_DISPLAY || 'opening-name');
        if (!this.dom.arrowCont) this.dom.arrowCont = document.getElementById(ids.ARROW_CONTAINER || 'arrow-container');
        if (!this.dom.pgnList) this.dom.pgnList = document.getElementById(ids.PGN_VERTICAL_LIST || 'pgn-history-list-vertical');
        if (!this.dom.pgnCont) this.dom.pgnCont = document.getElementById(ids.PGN_VERTICAL_CONT || 'pgn-history-vertical');
        if (!this.dom.notateSwitch) this.dom.notateSwitch = document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch');
        
        // Items for height sync
        if (!this.dom.boardArea) this.dom.boardArea = document.querySelector('.chess-board-area');
        if (!this.dom.barCont) this.dom.barCont = document.querySelector('.score-bar-container');
        if (!this.dom.wrapper) this.dom.wrapper = document.querySelector('.score-alignment-wrapper');
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

            const strings = APP_CONST?.STRINGS || {};
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
                    const mateBase = APP_CONST?.ENGINE?.MATE_SCORE_BASE || 1000000;
                    const mateAdjust = APP_CONST?.ENGINE?.MATE_DEPTH_ADJUSTMENT || 500;
                    const MATE_VAL = mateBase - mateAdjust;

                    if (Math.abs(numScore) > MATE_VAL) {
                        const moves = mateBase - Math.abs(numScore);
                        formattedScore = (numScore > 0) ? `M+${moves}` : `M-${moves}`;
                        percentAdvantage = (numScore > 0) ? 100 : 0;
                    } else {
                        const MAX_PAWNS = APP_CONST?.UI_CONFIG?.EVAL_MAX_PAWNS || 10.0;
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
        const strings = APP_CONST?.STRINGS || {};
        if (winner === 'w') this._applyEvalUI(100, strings.SCORE_WHITE_WIN || "1-0");
        else if (winner === 'b') this._applyEvalUI(0, strings.SCORE_BLACK_WIN || "0-1");
        else this._applyEvalUI(50, strings.SCORE_DRAW || "1/2-1/2");
    }

    /**
     * Applies the calculated evaluation to the DOM.
     * @param {number} percent - Height/Width percentage for the white advantage bar.
     * @param {string} score - Formatted score text.
     * @private
     */
    _applyEvalUI(percent, score) {
        if (this.dom.evalBar) {
            const isMobile = window.innerWidth < 992;
            const isFlipped = this.dom.wrapper && this.dom.wrapper.classList.contains('rotated-score');

            if (isMobile) {
                this.dom.evalBar.style.height = '100%';
                this.dom.evalBar.style.width = `${percent}%`;
                // On mobile horizontal bar, if flipped, white advantage grows from right
                this.dom.evalBar.style.left = isFlipped ? 'auto' : '0';
                this.dom.evalBar.style.right = isFlipped ? '0' : 'auto';
            } else {
                this.dom.evalBar.style.width = '100%';
                this.dom.evalBar.style.height = `${percent}%`;
                this.dom.evalBar.style.left = '0';
                this.dom.evalBar.style.right = 'auto';
                // Vertical bar bottom: 0 is handled by CSS, rotation handles flipping
            }
        }
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
            const config = APP_CONST?.UI_CONFIG || {};
            const offsets = config.EVAL_OFFSETS || {};
            
            if (!this.dom.boardArea || !this.dom.barCont || !this.dom.wrapper) return;

            const h = this.dom.boardArea.clientHeight;
            if (h <= 0) return;

            // Only update if height changed significantly to break ResizeObserver loops
            if (Math.abs(this._lastEvalHeight - h) < 2) return;
            this._lastEvalHeight = h;

            if (!this._cachedOffsets) {
                const rootStyles = getComputedStyle(document.documentElement);
                this._cachedOffsets = {
                    desktop: parseInt(rootStyles.getPropertyValue('--eval-offset-desktop')) || (offsets.DESKTOP || 45),
                    tablet: parseInt(rootStyles.getPropertyValue('--eval-offset-tablet')) || (offsets.TABLET || 55)
                };
            }
            
            const screenWidth = window.innerWidth;
            if (screenWidth < 992) {
                // Remove inline heights on mobile so CSS can take over horizontally
                this.dom.wrapper.style.height = '';
                this.dom.barCont.style.height = '';
                
                // Keep percentage updated correctly if screen resized
                if (this.dom.evalBar && this.dom.evalBar.style.height.includes('%') && this.dom.evalBar.style.height !== '100%') {
                   this.dom.evalBar.style.width = this.dom.evalBar.style.height;
                   this.dom.evalBar.style.height = '100%';
                }
                return;
            }

            let offset = screenWidth >= (offsets.BREAKPOINT_LG || 992) ? this._cachedOffsets.desktop : this._cachedOffsets.tablet;
            
            const wrapperHeight = h - (offset * 2);
            this.dom.wrapper.style.height = `${wrapperHeight}px`;
            
            if (this._scoreH === undefined) {
                this._scoreH = this.dom.evalScore ? this.dom.evalScore.offsetHeight : 0;
            }
            this.dom.barCont.style.height = `${wrapperHeight - this._scoreH - 10}px`;
        }, APP_CONST?.UI_CONFIG?.UI_SYNC_DELAY_MS || 50);
    }

    /**
     * Renders a SVG arrow on the board indicating the best move.
     * @param {string|null} moveUci - Move in UCI format (e.g., "e2e4").
     */
    renderBestMoveArrow(moveUci) {
        this._ensureDom();
        if (!this.dom.boardCont) return;
        
        const ids = APP_CONST?.IDS || {};
        const enabled = document.getElementById(ids.BEST_MOVE_SWITCH || 'best-move-switch')?.checked;
        
        // If disabled or no move, just clear and exit
        if (!enabled || !moveUci || moveUci.length < 4) {
            if (this.dom.arrowCont) this.dom.arrowCont.innerHTML = '';
            if (this.dom.arrowCont) this.dom.arrowCont.setAttribute('data-current-move', '');
            return;
        }

        // --- NEW: Check if arrowCont exists and is still attached to the current board ---
        const isAttached = this.dom.arrowCont && this.dom.boardCont && this.dom.boardCont.contains(this.dom.arrowCont);

        if (!this.dom.boardCont || !this.dom.arrowCont || !isAttached) {
            const arrowIds = APP_CONST?.IDS || {};
            const arrowStyles = APP_CONST?.UI_CONFIG?.ARROW || {};

            if (!this.dom.arrowCont) {
                this.dom.arrowCont = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                this.dom.arrowCont.id = arrowIds.ARROW_CONTAINER || "arrow-container";
                Object.assign(this.dom.arrowCont.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: arrowStyles.Z_INDEX || '100'
                });
            }
            // (Re)attach to current board container
            if (!this.dom.boardCont) return; // Safety check
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

        const arrowStyles = APP_CONST?.UI_CONFIG?.ARROW || {};

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
        
        const classes = APP_CONST?.CLASSES || {};
        const highlightClasses = [
            classes.SQUARE_SELECTED || 'square-selected',
            classes.HIGHLIGHT_MOVE || 'highlight-move',
            classes.HIGHLIGHT_CHECK || 'highlight-check'
        ];

        // Optimized: only query squares that actually have highlights
        const highlightedSquares = this.dom.boardCont.querySelectorAll(highlightClasses.map(c => '.' + c).join(', '));
        highlightedSquares.forEach(sq => sq.classList.remove(...highlightClasses));

        if (gameInstance.in_check()) {
            const king = this._findKing(gameInstance.turn(), gameInstance);
            this.dom.boardCont.querySelector(`.square-${king}`)?.classList.add(classes.HIGHLIGHT_CHECK || 'highlight-check');
        }

        const moveEntry = history[curIdx];
        if (moveEntry && moveEntry.uci) {
            const classes = APP_CONST?.CLASSES || {};
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
        const files = APP_CONST?.CHESS_RULES?.BOARD_FILES || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
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
        const thresholds = APP_CONST?.QUALITY_THRESHOLDS || {};
        
        if (history.length <= 1) {
            htmlParts.push(`
                <tr>
                    <td colspan="3" class="text-center text-white-50 opacity-50 py-5" style="border: none;">
                        <i class="bi bi-cloud-arrow-up display-4 mb-2 d-block"></i>
                        <small>Nhấn nút <strong class="text-white">LOAD</strong> góc dưới bàn cờ để tải dữ liệu (Ảnh, PGN, FEN).</small>
                    </td>
                </tr>
            `);
        } else {
            for (let i = 1; i < history.length; i += 2) {
                const w = history[i], b = history[i + 1];
                const wH = (i === curIdx) ? 'current-move-highlight' : '';
                const bH = (b && (i+1) === curIdx) ? 'current-move-highlight' : '';
                
                // Only generate annotations if needed
                const wAnnot = w.annotHtml || (this._annot ? this._annot(history, i, engineService) : '');
                const bAnnot = (b) ? (b.annotHtml || (this._annot ? this._annot(history, i+1, engineService) : '')) : '';
                
                htmlParts.push(`<tr><td class="move-number-cell">${Math.floor((i-1)/2)+1}.</td>`);
                htmlParts.push(`<td class="move-cell ${wH}" data-index="${i}">${w.san} ${wAnnot}</td>`);
                htmlParts.push(`<td class="move-cell ${bH}" data-index="${i+1}">${b ? b.san : ''} ${bAnnot}</td></tr>`);
            }
        }
        
        this.dom.pgnList.innerHTML = htmlParts.join('');
        
        // Use requestAnimationFrame for scrolling to avoid blocking the main thread
        if (this.dom.pgnCont) {
            requestAnimationFrame(() => {
                this.dom.pgnCont.scrollTop = this.dom.pgnCont.scrollHeight;
            });
        }
    }

    /**
     * Generates annotation icons based on move quality.
     * @private
     */
    _annot(history, idx, engineService) {
        if (!this.dom.notateSwitch?.checked || !engineService) return '';
        const m = history[idx];
        if (!m) return '';
        
        // Return cached annotation if already calculated and final
        if (m.annotHtml !== undefined && (m.score !== null || m.isBookMove)) return m.annotHtml;

        const qualities = APP_CONST?.MOVE_QUALITY || {};
        const getIconHtml = (qKey) => {
            const q = qualities[qKey];
            if (!q) return '';
            return `<span class="move-annotation" title="${q.label}"><img src="static/img/icon/${q.icon}"></span>`;
        };

        if (m.isBookMove) {
            m.annotHtml = getIconHtml('BOOK');
            return m.annotHtml;
        }

        if (m.score === null || m.score === undefined || idx === 0) return '';

        let preScoreObj = history[idx-1] ? history[idx-1].score : null;
        let isPrevBook = history[idx-1] ? history[idx-1].isBookMove : false;

        // Nếu nước đi trước được load từ lý thuyết, gán điểm giả định 0.00
        if (preScoreObj === null || preScoreObj === undefined) {
            if (isPrevBook) {
                preScoreObj = "0.00";
            } else {
                if (history[idx-1] && history[idx-1].bestMove === m.uci) {
                    return getIconHtml('BEST');
                }
                return ''; 
            }
        }

        const cur = engineService.parseScore(m.score);
        const pre = engineService.parseScore(preScoreObj);
        const diff = (idx % 2 !== 0) ? (cur - pre) : (pre - cur);
        const isBest = (history[idx-1] && history[idx-1].bestMove === m.uci);

        const thresholds = APP_CONST?.QUALITY_THRESHOLDS || {};
        let annot = '';

        const wasWinning = Math.abs(pre) >= (thresholds.MISS_WIN_FROM || 2.5);
        const lostAdvantage = Math.abs(cur) <= (thresholds.MISS_WIN_TO || 0.6);

        if (wasWinning && lostAdvantage && diff < -1.0) annot = getIconHtml('MISS');
        else if (diff >= (thresholds.BRILLIANT || 1.6) && !isBest) annot = getIconHtml('BRILLIANT');
        else if (diff >= (thresholds.GREAT || 0.9)) annot = getIconHtml('GREAT');
        else if (isBest) annot = getIconHtml('BEST');
        else if (diff >= (thresholds.GOOD || 0.2)) annot = getIconHtml('GOOD');
        else if (diff >= (thresholds.BEST || -0.1)) annot = getIconHtml('BEST');
        else if (diff >= (thresholds.SOLID || -0.4)) annot = getIconHtml('SOLID');
        else if (diff >= (thresholds.INACCURATE || -0.8)) annot = getIconHtml('INACCURATE');
        else if (diff >= (thresholds.MISTAKE || -1.6)) annot = getIconHtml('MISTAKE');
        else annot = getIconHtml('BLUNDER');

        m.annotHtml = annot;
        return annot;
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
        const classes = APP_CONST?.CLASSES || {};
        const boardArea = document.querySelector('.chess-board-area');
        const scoreWrapper = document.querySelector('.score-alignment-wrapper');
        
        if (boardArea) boardArea.classList.toggle(classes.ROTATED_BOARD || 'rotated-board', isFlipped);
        if (scoreWrapper) scoreWrapper.classList.toggle(classes.ROTATED_SCORE || 'rotated-score', isFlipped);
    }

    /**
     * Displays GameOver modal and renders stats.
     */
    showGameOverModal(title, message, stats = null) {
        if (window.MODAL_MANAGER) {
            window.MODAL_MANAGER.showGameOverModal(title, message);
            
            const shuffler = document.getElementById('game-over-stats-shuffler');
            const statsGrid = document.getElementById('game-over-stats');
            
            if (stats) {
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
            } else {
                // No stats available (e.g., time-up), hide both spinner and stats
                if (shuffler) shuffler.classList.add('d-none');
                if (statsGrid) statsGrid.classList.add('d-none');
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
