/**
 * File: frontend/static/js/logic_game.js
 * Tập hợp các hàm xử lý logic bàn cờ và nước đi theo cấu trúc Class OOP.
 */

class ChessUI {
    constructor() {
        this._lastInvalidFenModalAt = 0;
    }

    updateEvaluationBar(score, fen, gameInstance) {
        try {
            const evalBar = document.getElementById(window.APP_CONST?.IDS?.EVAL_BAR || 'eval-white-advantage');
            const evalScoreText = document.getElementById(window.APP_CONST?.IDS?.EVAL_SCORE || 'evaluation-score');
            if (!evalBar && !evalScoreText) return;

            let formattedScore = "0.00";
            let percentAdvantage = 50;

            if (gameInstance && typeof gameInstance.game_over === 'function' && gameInstance.game_over()) {
                if (gameInstance.in_checkmate()) {
                    formattedScore = (gameInstance.turn() === 'b') ? "1-0" : "0-1";
                    percentAdvantage = (gameInstance.turn() === 'b') ? 100 : 0;
                } else {
                    formattedScore = "1/2-1/2";
                    percentAdvantage = 50;
                }
                this._applyEvalUI(evalBar, evalScoreText, percentAdvantage, formattedScore);
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
            this._applyEvalUI(evalBar, evalScoreText, percentAdvantage, formattedScore);
        } catch (err) {
            console.warn('UI Eval Error:', err);
        }
    }

    _applyEvalUI(bar, text, percent, score) {
        if (bar) bar.style.height = `${percent}%`;
        if (text) text.textContent = score;
    }

    syncBoardAndEvalHeight() {
        const boardEl = document.getElementById('myBoard');
        const barCont = document.querySelector('.score-bar-container');
        const wrapper = document.querySelector('.score-alignment-wrapper');
        const scoreEl = document.getElementById(window.APP_CONST?.IDS?.EVAL_SCORE || 'evaluation-score');
        if (!boardEl || !barCont || !wrapper) return;
        const h = boardEl.clientHeight;
        wrapper.style.height = `${h}px`;
        const scoreH = scoreEl ? scoreEl.offsetHeight : 0;
        barCont.style.height = `${h - scoreH - 8}px`;
    }

    renderBestMoveArrow(moveUci) {
        const boardCont = document.getElementById('myBoard');
        if (!boardCont) return;
        let svg = document.getElementById('arrow-container');
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.id = "arrow-container";
            boardCont.appendChild(svg);
        } else svg.innerHTML = '';

        const enabled = document.getElementById('best-move-switch')?.checked;
        if (!enabled || !moveUci || moveUci.length < 4) return;

        svg.setAttribute("viewBox", `0 0 ${boardCont.offsetWidth} ${boardCont.offsetHeight}`);
        const fromSq = moveUci.substring(0, 2), toSq = moveUci.substring(2, 4);
        const fromEl = boardCont.querySelector(`.square-${fromSq}`), toEl = boardCont.querySelector(`.square-${toSq}`);
        if (!fromEl || !toEl) return;

        const start = { x: fromEl.offsetLeft + fromEl.offsetWidth / 2, y: fromEl.offsetTop + fromEl.offsetHeight / 2 };
        const end = { x: toEl.offsetLeft + toEl.offsetWidth / 2, y: toEl.offsetTop + toEl.offsetHeight / 2 };
        const dx = end.x - start.x, dy = end.y - start.y, len = Math.sqrt(dx * dx + dy * dy);
        const ratio = (len - 10) / len;

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.id = "arrowhead";
        marker.setAttribute("markerWidth", "6"); marker.setAttribute("markerHeight", "5");
        marker.setAttribute("refX", "5"); marker.setAttribute("refY", "2.5");
        marker.setAttribute("orient", "auto");
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", "0 0, 6 2.5, 0 5");
        poly.setAttribute("fill", "rgba(76, 175, 80, 0.9)");
        marker.appendChild(poly); defs.appendChild(marker); svg.appendChild(defs);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
        line.setAttribute("x2", start.x + dx * ratio); line.setAttribute("y2", start.y + dy * ratio);
        line.setAttribute("stroke", "rgba(76, 175, 80, 0.6)"); line.setAttribute("stroke-width", "6");
        line.setAttribute("marker-end", "url(#arrowhead)");
        svg.appendChild(line);
    }

    updateAllHighlights(gameInstance, history, curIdx) {
        document.querySelectorAll('#myBoard .square-55d63').forEach(sq => sq.classList.remove('square-selected', 'highlight-move', 'highlight-check'));
        if (gameInstance.in_check()) {
            const king = this._findKing(gameInstance.turn(), gameInstance);
            document.querySelector(`#myBoard .square-${king}`)?.classList.add('highlight-check');
        }
        const moves = gameInstance.history({verbose: true});
        if (moves.length > 0 && curIdx === history.length - 1) {
            const last = moves[moves.length - 1];
            document.querySelector(`#myBoard .square-${last.from}`)?.classList.add('square-selected');
            document.querySelector(`#myBoard .square-${last.to}`)?.classList.add('square-selected');
        }
    }

    _findKing(color, game) {
        const cols = ['a','b','c','d','e','f','g','h'], rows = ['1','2','3','4','5','6','7','8'];
        for (const c of cols) for (const r of rows) {
            const p = game.get(c + r);
            if (p?.type === 'k' && p?.color === color) return c + r;
        }
        return null;
    }
}

class ChessOpening {
    detectAndUpdate(history, curIdx) {
        if (!history[curIdx]) return { name: "Chưa bắt đầu", isBookMove: false };

        // Kiểm tra biến OPENINGS_DATA từ phạm vi toàn cục thay vì qua window
        let dictionary = null;
        try {
            if (typeof OPENINGS_DATA !== 'undefined') dictionary = OPENINGS_DATA;
        } catch(e) {}

        const currentMoves = history.slice(1, curIdx + 1).map(h => h.san);
        if (currentMoves.length === 0) {
            history[curIdx].opening = "Chưa bắt đầu";
            history[curIdx].isBookMove = false;
            return { name: "Chưa bắt đầu", isBookMove: false };
        }

        let best = null, maxLen = -1;
        if (dictionary) {
            for (const op of dictionary) {
                const opMoves = op.moves.replace(/\s+/g, ' ').trim().replace(/\d+\.\s+/g, '').replace(/\d+\.\.\.\s+/g, '').split(' ').filter(m => m.length > 0);
                
                let match = true;
                if (opMoves.length > currentMoves.length) {
                    match = false;
                } else {
                    for (let i = 0; i < opMoves.length; i++) {
                        if (opMoves[i] !== currentMoves[i]) {
                            match = false;
                            break;
                        }
                    }
                }
                
                if (match && opMoves.length > maxLen) {
                    maxLen = opMoves.length;
                    best = op;
                }
            }
        }

        const isKnownBook = (best && maxLen === currentMoves.length);
        const name = best ? best.name : (currentMoves.length <= 2 ? "Đang khai triển..." : "Khai cuộc không xác định");

        history[curIdx].opening = name;
        history[curIdx].isBookMove = !!isKnownBook;

        return { name, isBookMove: !!isKnownBook };
    }
}

class ChessEngine {
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

    async getDeepEval(fen) {
        const resp = await fetch(window.APP_CONST?.API?.EVALUATE || '/api/game/evaluate', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fen })
        });
        return await resp.json();
    }

    parseScore(s) {
        if (s === null || s === undefined) return 0;
        const scoreStr = String(s);
        if (scoreStr.includes('M')) return scoreStr.includes('+') ? 100 : -100;
        return parseFloat(scoreStr) || 0;
    }
}

class ChessCore {
    constructor() {
        this.ui = new ChessUI();
        this.engine = new ChessEngine();
        this.opening = new ChessOpening();
        this._initGlobalListeners();
    }

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
    }

    async onDrop(source, target) {
        if (playerColor !== null && game.turn() !== playerColor) return 'snapback';
        let uci = source + target;
        const p = game.get(source);
        if (p?.type === 'p' && (target[1] === '8' || target[1] === '1')) uci += 'q';
        if (game.move({ from: source, to: target, promotion: uci.endsWith('q') ? 'q' : undefined }) === null) return 'snapback';
        await this.handleLocalMove(uci);
    }

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

    updateUI() {
        this._syncButtons();
        const op = this.opening.detectAndUpdate(moveHistory, currentFenIndex);
        const el = document.getElementById('opening-name');
        if (el) el.textContent = op.name;
        this._renderPGN();
        this.ui.renderBestMoveArrow(moveHistory[currentFenIndex]?.bestMove || null);
    }

    _renderPGN() {
        const list = document.getElementById('pgn-history-list-vertical');
        if (!list) return;
        let html = '';
        for (let i = 1; i < moveHistory.length; i += 2) {
            const w = moveHistory[i], b = moveHistory[i + 1];
            const wH = (i === currentFenIndex) ? 'current-move-highlight' : '';
            const bH = (b && (i+1) === currentFenIndex) ? 'current-move-highlight' : '';
            html += `<tr><td>${Math.floor((i-1)/2)+1}.</td>
                <td class="move-cell ${wH}" data-index="${i}">${w.san} ${this._annot(w, i)}</td>
                <td class="move-cell ${bH}" data-index="${i+1}">${b ? b.san : ''} ${b ? this._annot(b, i+1) : ''}</td></tr>`;
        }
        list.innerHTML = html;
        const c = document.getElementById('pgn-history-vertical');
        if (c) c.scrollTop = c.scrollHeight;
    }

    _annot(m, idx) {
        if (!document.getElementById('move-notate-switch')?.checked) return '';
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
        
        // Missed Win
        if (Math.abs(pre) > 2.5 && Math.abs(cur) < 0.5) return `<span class="move-annotation" title="Missed Win"><img src="static/img/icon/miss.svg"></span>`;

        if (diff < -1.5) return `<span class="move-annotation" title="Blunder"><img src="static/img/icon/blunder.svg"></span>`;
        if (diff < -0.7) return `<span class="move-annotation" title="Mistake"><img src="static/img/icon/mistake.svg"></span>`;
        if (diff < -0.3) return `<span class="move-annotation" title="Inaccurate"><img src="static/img/icon/inacc.svg"></span>`;

        return '';
    }

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

    _setupResize() {
        if (!window._boardResizeHandler) {
            window._boardResizeHandler = () => { board?.resize(); this.ui.syncBoardAndEvalHeight(); this.updateUI(); };
            window.addEventListener('resize', window._boardResizeHandler);
        }
    }

    _syncButtons() {
        const isF = currentFenIndex <= 0, isL = currentFenIndex >= moveHistory.length - 1;
        try {
            $('[data-action="first"], [data-action="prev"]').prop('disabled', isF);
            $('[data-action="next"], [data-action="last"]').prop('disabled', isL);
        } catch (e) {}
    }

    _showGameOver() {
        let t = "Ván đấu kết thúc", b = game.in_checkmate() ? `Chiếu hết! ${game.turn() === 'b' ? 'Trắng' : 'Đen'} thắng.` : "Hòa!";
        setTimeout(() => window.showGameOverModal?.(t, b), 200);
    }

    onDragStart(source, piece) {
        if (!isPlayerTurn || game.turn() !== piece[0]) return false;
        this.ui.updateAllHighlights(game, moveHistory, currentFenIndex);
        game.moves({square: source, verbose: true}).forEach(m => document.querySelector(`#myBoard .square-${m.to}`)?.classList.add('highlight-move'));
        return true;
    }

    onSnapEnd() { if (board && board.fen() !== game.fen()) board.position(game.fen(), false); }
}

const core = new ChessCore();
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
