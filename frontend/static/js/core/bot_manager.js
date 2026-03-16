/**
 * BotManager - Orchestrates multiple chess engines (Stockfish WASM & Wonder Engine API)
 * Handles UI settings, game initialization, and engine communication.
 */

import { APP_CONST } from '../constants.js';

export class BotManager {
    constructor() {
        const botConst = APP_CONST?.BOT || {};
        // UI & State Settings
        this.selectedEngine = botConst.DEFAULT_ENGINE || 'stockfish';
        this.selectedLevel = botConst.DEFAULT_LEVEL || 10;
        this.selectedColor = botConst.DEFAULT_COLOR || 'r'; // 'w', 'b', or 'r' (random)
        this.selectedTime = botConst.DEFAULT_TIME || '0'; // minutes
        this.selectedIncrement = 0; // seconds
        
        // Stockfish WASM state
        this.sfEngine = null;
        this.sfIsReady = false;
        this.STOCKFISH_URL = APP_CONST?.BOT?.STOCKFISH_WASM_URL || "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.min.js";

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
        const ids = APP_CONST?.IDS;
        this.dom.modal = document.getElementById(ids?.BOT_SETTINGS_MODAL || 'bot-settings-modal');
        if (!this.dom.modal) return;

        this.dom.engineSelect = document.getElementById(ids?.BOT_ENGINE_SELECT || 'bot-engine-select');
        this.dom.levelSlider = document.getElementById(ids?.BOT_LEVEL_SLIDER || 'bot-level-slider');
        this.dom.levelSelect = document.getElementById(ids?.BOT_LEVEL_SELECT || 'bot-level-select');
        this.dom.sideSelect = document.getElementById(ids?.BOT_SIDE_SELECT || 'bot-side-select');
        this.dom.timeSelect = document.getElementById(ids?.BOT_TIME_SELECT || 'bot-time-select');
        this.dom.incrementSelect = document.getElementById(ids?.BOT_INCREMENT_SELECT || 'bot-increment-select');
        this.dom.levelDisplay = document.getElementById(ids?.BOT_LEVEL_DISPLAY || 'level-value-display');
        this.dom.startBtn = document.getElementById(ids?.BOT_START_BTN || 'start-bot-game-btn');

        this.setupEventListeners();
        this.syncInitialState();
        
        // Auto-initialize Stockfish in background after a short delay
        const delay = APP_CONST?.BOT?.INIT_DELAY_MS || 2000;
        setTimeout(() => this.initStockfish(), delay);
    }

    setupEventListeners() {
        // Sync Slider and Level Display/Select
        if (this.dom.levelSlider) {
            this.dom.levelSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.selectedLevel = val;
                window.selectedBotLevel = val;
                this.updateLevelUI(val);

                const botConst = APP_CONST?.BOT || {};
                const thresholds = botConst.LEVEL_THRESHOLDS || [];
                
                if (this.dom.levelSelect && thresholds.length > 0) {
                    let assignedValue = null;
                    for (const t of thresholds) {
                        if (t.max !== undefined && val <= t.max) {
                            assignedValue = t.value;
                            break;
                        }
                    }
                    if (assignedValue === null) {
                        const fb = thresholds.find(t => t.fallback);
                        assignedValue = fb ? fb.fallback : "20";
                    }
                    this.dom.levelSelect.value = assignedValue;
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
            window.playerColor = val === 'white' ? 'w' : (val === 'black' ? 'b' : 'r');
        });

        this.setupButtonSelection('.setting-group button[data-time]', (val) => {
            this.selectedTime = val;
            window.selectedBotTime = val;
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
            const baseElo = APP_CONST?.BOT?.BASE_ELO || 850;
            const eloStep = APP_CONST?.BOT?.ELO_STEP || 50;
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
        
        // 1. Hande Server-side engine (Native .exe) or Wonder Engine
        if (engineType === 'server' || engineType === 'custom') {
            return await this._getBestMoveFromAPI(fen, engineType, level, timeLimit);
        }

        // 2. Handle Client-side engine (Stockfish WASM)
        const defaultTime = APP_CONST?.BOT?.DEFAULT_WASM_MOVETIME || 500;
        const result = await this.getStockfishMove(fen, level, defaultTime);

        // FALLBACK: If WASM times out or fails, try the server engine automatically
        if (result === null) {
            console.warn("BotManager: WASM failed, falling back to Server Engine");
            return await this._getBestMoveFromAPI(fen, 'server', level, timeLimit);
        }
        
        return result;
    }

    async _getBestMoveFromAPI(fen, engineType, level, timeLimit) {
        try {
            const url = (APP_CONST && APP_CONST.API && APP_CONST.API.BOT_MOVE) 
                ? APP_CONST.API.BOT_MOVE : '/api/game/bot_move';
            
            const resp = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    fen, 
                    engine: engineType === 'server' ? 'stockfish' : engineType, 
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

    // --- Stockfish WASM Implementation ---

    async initStockfish() {
        if (this.sfEngine) return;
        try {
            const response = await fetch(this.STOCKFISH_URL);
            const script = await response.text();
            const blob = new Blob([script], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            this.sfEngine = new Worker(workerUrl);
            const onInitMsg = (e) => {
                const line = e.data;
                if (line === "readyok") {
                    this.sfIsReady = true;
                    console.log("BotManager: Stockfish WASM Ready (readyok)");
                    this.sfEngine.removeEventListener('message', onInitMsg);
                }
            };
            this.sfEngine.addEventListener('message', onInitMsg);

            this.sfEngine.postMessage("uci");
            this.sfEngine.postMessage("setoption name Threads value 1");
            this.sfEngine.postMessage("setoption name Hash value 16");
            this.sfEngine.postMessage("isready");
        } catch (error) {
            console.error("BotManager: Failed to initialize Stockfish:", error);
        }
    }

    getStockfishMove(fen, skillLevel, timeLimitMs) {
        return new Promise(async (resolve, reject) => {
            // Wait for engine to be initialized if not already
            if (!this.sfEngine) await this.initStockfish();
            
            // If still no engine or after reasonable wait not ready, return null to trigger fallback
            if (!this.sfEngine) {
                return resolve(null);
            }

            // Wait up to 2 seconds for sfIsReady if it just started
            if (!this.sfIsReady) {
                let checkAttempts = 0;
                while (!this.sfIsReady && checkAttempts < 20) {
                    await new Promise(r => setTimeout(r, 100));
                    checkAttempts++;
                }
                if (!this.sfIsReady) return resolve(null);
            }

            let lastScore = "0.00";
            this.sfEngine.postMessage(`setoption name Skill Level value ${skillLevel}`);
            this.sfEngine.postMessage(`position fen ${fen}`);
            
            const sideToMove = fen.split(' ')[1]; // 'w' or 'b'
            let isResolved = false;

            const cleanupAndResolve = (result) => {
                if (isResolved) return;
                isResolved = true;
                this.sfEngine.removeEventListener('message', onMsg);
                if (timeoutId) clearTimeout(timeoutId);
                resolve(result);
            };

            const onMsg = (event) => {
                const line = event.data;
                const botConst = APP_CONST?.BOT || {};
                const scoreRegex = botConst.REGEX?.SCORE || /score\s(cp|mate)\s(-?\d+)/;
                
                if (typeof line === 'string' && line.includes("score")) {
                    const scoreMatch = line.match(scoreRegex);
                    if (scoreMatch) {
                        const type = scoreMatch[1];
                        const value = parseInt(scoreMatch[2]);
                        let normalizedValue = (sideToMove === 'w') ? value : -value;

                        if (type === 'cp') {
                            const cpToPawn = APP_CONST?.ENGINE?.CP_TO_PAWN || 100;
                            lastScore = (normalizedValue / cpToPawn).toFixed(2);
                            if (normalizedValue > 0) lastScore = "+" + lastScore;
                        } else if (type === 'mate') {
                            lastScore = normalizedValue > 0 ? `+M${Math.abs(normalizedValue)}` : `-M${Math.abs(normalizedValue)}`;
                        }
                    }
                }

                if (typeof line === 'string' && line.startsWith("bestmove")) {
                    const bestMoveRegex = botConst.REGEX?.BESTMOVE || /bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/;
                    const match = line.match(bestMoveRegex);
                    if (match) {
                        cleanupAndResolve({
                            move: match[1],
                            score: lastScore
                        });
                    }
                }
            };

            this.sfEngine.addEventListener('message', onMsg);
            this.sfEngine.postMessage(`go movetime ${timeLimitMs}`);

            // Fallback timeout cleanup (timeLimit + 5 seconds buffer to handle slow WASM initialization/search)
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    console.warn(`BotManager: Stockfish WASM timed out after ${timeLimitMs + 5000}ms.`);
                    cleanupAndResolve(null); 
                }
            }, timeLimitMs + 5000);
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

        // Update active navigation state
        const classes = APP_CONST?.CLASSES || {};
        document.querySelectorAll(classes.NAV_MODE_LINK || ".nav-mode-link").forEach(link => {
            link.classList.remove(classes.NAV_ACTIVE || "active");
        });
        const playBotLink = document.querySelector(APP_CONST?.IDS?.NAV_PLAY_BOT || "#nav-play-bot");
        if (playBotLink) playBotLink.classList.add(classes.NAV_ACTIVE || "active");

        let finalPlayerColor = this.selectedColor;
        if (this.selectedColor === 'r') {
            const threshold = APP_CONST?.UI_CONFIG?.RANDOM_THRESHOLD || 0.5;
            finalPlayerColor = (Math.random() < threshold) ? 'w' : 'b';
        }

        window.playerColor = finalPlayerColor;
        window.selectedBotEngine = this.selectedEngine;
        window.selectedBotLevel = this.selectedLevel;
        window.selectedBotTime = this.selectedTime;
        window.selectedBotIncrement = this.selectedIncrement;
        
        let boardOrientation = (finalPlayerColor === 'b') ? 'black' : 'white';

        const ids = APP_CONST?.IDS || {};
        const flipSwitch = document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch');
        if (flipSwitch) flipSwitch.checked = (boardOrientation === 'black');

        const timeLimitMinutes = parseInt(this.selectedTime);
        if (timeLimitMinutes > 0) {
            if (window.TIMER_MANAGER) window.TIMER_MANAGER.init(timeLimitMinutes);
        } else {
            if (window.TIMER_MANAGER) window.TIMER_MANAGER.reset();
        }

        const clearCacheUrl = (APP_CONST && APP_CONST.API && APP_CONST.API.CLEAR_CACHE) 
            ? APP_CONST.API.CLEAR_CACHE : '/api/game/clear_cache';
        
        fetch(clearCacheUrl, {method: 'POST'});

        if (window.LOGIC_GAME && window.LOGIC_GAME.initBoard) {
            window.LOGIC_GAME.initBoard(boardOrientation);
        }
    }
}
