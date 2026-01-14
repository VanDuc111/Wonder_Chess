/**
 * BotManager - Orchestrates multiple chess engines (Stockfish WASM & Wonder Engine API)
 * Handles UI settings, game initialization, and engine communication.
 */

class BotManager {
    constructor() {
        // UI & State Settings
        this.selectedEngine = 'stockfish';
        this.selectedLevel = 10;
        this.selectedColor = 'r'; // 'w', 'b', or 'r' (random)
        this.selectedTime = '0'; // minutes
        this.selectedIncrement = 0; // seconds
        
        // Stockfish WASM state
        this.sfEngine = null;
        this.sfIsReady = false;
        this.STOCKFISH_URL = (window.APP_CONST && window.APP_CONST.BOT) 
            ? window.APP_CONST.BOT.STOCKFISH_WASM_URL 
            : "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.min.js";

        this.dom = {
            modal: null,
            engineSelect: null,
            levelSlider: null,
            levelSelect: null,
            sideSelect: null,
            timeSelect: null,
            incrementSelect: null,
            levelDisplay: null,
            startBtn: null
        };
    }

    /**
     * Initialize UI listeners and pre-load Stockfish
     */
    init() {
        const ids = window.APP_CONST?.IDS;
        this.dom.modal = document.getElementById(ids?.BOT_SETTINGS_MODAL || 'bot-settings-modal');
        if (!this.dom.modal) return;

        this.dom.engineSelect = document.getElementById('bot-engine-select');
        this.dom.levelSlider = document.getElementById('bot-level-slider');
        this.dom.levelSelect = document.getElementById('bot-level-select');
        this.dom.sideSelect = document.getElementById('bot-side-select');
        this.dom.timeSelect = document.getElementById('bot-time-select');
        this.dom.incrementSelect = document.getElementById('bot-increment-select');
        this.dom.levelDisplay = document.getElementById('level-value-display');
        this.dom.startBtn = document.getElementById('start-bot-game-btn');

        this.setupEventListeners();
        this.syncInitialState();
        
        // Auto-initialize Stockfish in background after a short delay
        setTimeout(() => this.initStockfish(), 2000);
    }

    setupEventListeners() {
        // Sync Slider and Level Display/Select
        if (this.dom.levelSlider) {
            this.dom.levelSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.selectedLevel = val;
                this.updateLevelUI(val);
                
                if (this.dom.levelSelect) {
                    if (val <= 4) this.dom.levelSelect.value = "0";
                    else if (val <= 8) this.dom.levelSelect.value = "5";
                    else if (val <= 12) this.dom.levelSelect.value = "10";
                    else if (val <= 16) this.dom.levelSelect.value = "15";
                    else this.dom.levelSelect.value = "20";
                }
            });
        }

        if (this.dom.levelSelect) {
            this.dom.levelSelect.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                if (this.dom.levelSlider) this.dom.levelSlider.value = val;
                this.selectedLevel = val;
                this.updateLevelUI(val);
            });
        }

        if (this.dom.startBtn) {
            this.dom.startBtn.addEventListener('click', () => this.startBotGame());
        }

        this.setupButtonSelection('.setting-group button[data-color]', (val) => {
            this.selectedColor = val;
        });

        this.setupButtonSelection('.setting-group button[data-time]', (val) => {
            this.selectedTime = val;
        });
    }

    setupButtonSelection(selector, callback) {
        document.querySelectorAll(selector).forEach(button => {
            button.addEventListener('click', function () {
                const group = this.parentElement.querySelectorAll('button');
                group.forEach(btn => btn.classList.remove('selected'));
                this.classList.add('selected');
                
                const val = this.getAttribute('data-color') || this.getAttribute('data-time');
                if (val && callback) callback(val);
            });
        });
    }

    updateLevelUI(val) {
        if (this.dom.levelDisplay) {
            const baseElo = window.APP_CONST?.BOT?.BASE_ELO || 850;
            const eloStep = window.APP_CONST?.BOT?.ELO_STEP || 50;
            const elo = baseElo + (val * eloStep);
            this.dom.levelDisplay.textContent = elo;
        }
    }

    syncInitialState() {
        if (this.dom.levelSlider && this.dom.levelDisplay) {
            this.updateLevelUI(parseInt(this.dom.levelSlider.value));
        }
    }

    // --- Engine Orchestration Methods ---

    /**
     * Unified interface to get the best move from the selected engine
     */
    async getBestMove(fen, level, timeLimit) {
        const engineType = window.selectedBotEngine || this.selectedEngine;
        
        if (engineType === 'stockfish') {
            const defaultTime = window.APP_CONST?.BOT?.DEFAULT_WASM_MOVETIME || 500;
            return await this.getStockfishMove(fen, level, defaultTime); 
        } else {
            // Wonder Engine (Custom Minimax) or others via API
            try {
                const url = (window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.BOT_MOVE) 
                    ? window.APP_CONST.API.BOT_MOVE : '/api/game/bot_move';
                
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        fen, 
                        engine: engineType, 
                        skill_level: level, 
                        time_limit: timeLimit 
                    })
                });
                const d = await resp.json();
                return d.success ? { move: d.move_uci, score: d.evaluation, fen: d.fen } : null;
            } catch (error) {
                console.error("Error fetching bot move from API:", error);
                return null;
            }
        }
    }

    // --- Stockfish WASM Implementation ---

    async initStockfish() {
        if (this.sfEngine) return;
        try {
            const response = await fetch(this.STOCKFISH_URL);
            const script = await response.text();
            const blob = new Blob([script], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            this.sfEngine = new Worker(workerUrl);
            this.sfEngine.postMessage("uci");
            this.sfEngine.postMessage("isready");
            this.sfIsReady = true;
            console.log("BotManager: Stockfish WASM Initialized");
        } catch (error) {
            console.error("BotManager: Failed to initialize Stockfish:", error);
        }
    }

    getStockfishMove(fen, skillLevel, timeLimitMs) {
        return new Promise(async (resolve, reject) => {
            if (!this.sfEngine) await this.initStockfish();
            if (!this.sfEngine) {
                reject("Stockfish engine not available");
                return;
            }

            let lastScore = "0.00";
            this.sfEngine.postMessage(`setoption name Skill Level value ${skillLevel}`);
            this.sfEngine.postMessage(`position fen ${fen}`);
            
            const sideToMove = fen.split(' ')[1]; // 'w' or 'b'

            const onMsg = (event) => {
                const line = event.data;
                if (typeof line === 'string' && line.includes("score")) {
                    const scoreMatch = line.match(/score\s(cp|mate)\s(-?\d+)/);
                    if (scoreMatch) {
                        const type = scoreMatch[1];
                        const value = parseInt(scoreMatch[2]);
                        let normalizedValue = (sideToMove === 'w') ? value : -value;

                        if (type === 'cp') {
                            lastScore = (normalizedValue / 100).toFixed(2);
                            if (normalizedValue > 0) lastScore = "+" + lastScore;
                        } else if (type === 'mate') {
                            lastScore = normalizedValue > 0 ? `+M${Math.abs(normalizedValue)}` : `-M${Math.abs(normalizedValue)}`;
                        }
                    }
                }

                if (typeof line === 'string' && line.startsWith("bestmove")) {
                    const match = line.match(/bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
                    if (match) {
                        this.sfEngine.removeEventListener('message', onMsg);
                        resolve({
                            move: match[1],
                            score: lastScore
                        });
                    }
                }
            };

            this.sfEngine.addEventListener('message', onMsg);
            this.sfEngine.postMessage(`go movetime ${timeLimitMs}`);
        });
    }

    // --- Game Lifecycle ---

    startBotGame() {
        if (this.dom.engineSelect) this.selectedEngine = this.dom.engineSelect.value;
        if (this.dom.levelSlider) this.selectedLevel = parseInt(this.dom.levelSlider.value);
        if (this.dom.sideSelect) this.selectedColor = this.dom.sideSelect.value;
        if (this.dom.timeSelect) this.selectedTime = this.dom.timeSelect.value;
        if (this.dom.incrementSelect) this.selectedIncrement = parseInt(this.dom.incrementSelect.value);

        if (this.dom.modal) this.dom.modal.style.display = 'none';

        let finalPlayerColor = this.selectedColor;
        if (this.selectedColor === 'r') {
            finalPlayerColor = (Math.random() < 0.5) ? 'w' : 'b';
        }

        window.playerColor = finalPlayerColor;
        window.selectedBotEngine = this.selectedEngine;
        window.selectedBotLevel = this.selectedLevel;
        window.selectedBotTime = this.selectedTime;
        window.selectedBotIncrement = this.selectedIncrement;
        
        let boardOrientation = (finalPlayerColor === 'b') ? 'black' : 'white';

        const flipSwitch = document.getElementById('flip-board-switch');
        if (flipSwitch) flipSwitch.checked = (boardOrientation === 'black');

        const timeLimitMinutes = parseInt(this.selectedTime);
        if (timeLimitMinutes > 0) {
            if (window.initTimers) window.initTimers(timeLimitMinutes);
        } else {
            if (window.resetTimers) window.resetTimers();
        }

        const clearCacheUrl = (window.APP_CONST && window.APP_CONST.API && window.APP_CONST.API.CLEAR_CACHE) 
            ? window.APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache';
        
        fetch(clearCacheUrl, {method: 'POST'});

        if (window.initChessboard) {
            window.initChessboard(boardOrientation);
        }
    }
}

// Global instance
window.BOT_MANAGER = new BotManager();
document.addEventListener('DOMContentLoaded', () => {
    window.BOT_MANAGER.init();
});
