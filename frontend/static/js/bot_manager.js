/**
 * BotManager - Handles UI settings and game initialization for playing against computer
 */

class BotManager {
    constructor() {
        this.selectedEngine = 'stockfish';
        this.selectedLevel = 10;
        this.selectedColor = 'r'; // 'w', 'b', or 'r' (random)
        this.selectedTime = '0'; // minutes
        this.selectedIncrement = 0; // seconds
        
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

    init() {
        this.dom.modal = document.getElementById('bot-settings-modal');
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
    }

    setupEventListeners() {
        // Sync Slider and Level Display/Select
        if (this.dom.levelSlider) {
            this.dom.levelSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.selectedLevel = val;
                this.updateLevelUI(val);
                
                // Update Select based on slider
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

        // Logic to start Bot Game
        if (this.dom.startBtn) {
            this.dom.startBtn.addEventListener('click', () => this.startBotGame());
        }

        // Handle side selection buttons
        this.setupButtonSelection('.setting-group button[data-color]', (val) => {
            this.selectedColor = val;
        });

        // Handle time selection buttons
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
            const elo = 850 + (val * 50);
            this.dom.levelDisplay.textContent = elo;
        }
    }

    syncInitialState() {
        if (this.dom.levelSlider && this.dom.levelDisplay) {
            this.updateLevelUI(parseInt(this.dom.levelSlider.value));
        }
    }

    startBotGame() {
        // Read final values from inputs if they changed without sync
        if (this.dom.engineSelect) this.selectedEngine = this.dom.engineSelect.value;
        if (this.dom.levelSlider) this.selectedLevel = parseInt(this.dom.levelSlider.value);
        if (this.dom.sideSelect) this.selectedColor = this.dom.sideSelect.value;
        if (this.dom.timeSelect) this.selectedTime = this.dom.timeSelect.value;
        if (this.dom.incrementSelect) this.selectedIncrement = parseInt(this.dom.incrementSelect.value);

        // Hide Modal
        if (this.dom.modal) this.dom.modal.style.display = 'none';

        // Choose player color
        let finalPlayerColor = this.selectedColor;
        let boardOrientation;

        if (this.selectedColor === 'r') {
            finalPlayerColor = (Math.random() < 0.5) ? 'w' : 'b';
        }

        // Update global variables in main.js for compatibility
        window.playerColor = finalPlayerColor;
        window.selectedBotEngine = this.selectedEngine;
        window.selectedBotLevel = this.selectedLevel;
        window.selectedBotTime = this.selectedTime;
        window.selectedBotIncrement = this.selectedIncrement;
        
        boardOrientation = (finalPlayerColor === 'b') ? 'black' : 'white';

        // Update UI flip switch
        const flipSwitch = document.getElementById('flip-board-switch');
        if (flipSwitch) flipSwitch.checked = (boardOrientation === 'black');

        // Initialize timers
        const timeLimitMinutes = parseInt(this.selectedTime);
        if (timeLimitMinutes > 0) {
            if (window.initTimers) window.initTimers(timeLimitMinutes);
        } else {
            if (window.resetTimers) window.resetTimers();
        }

        // Clear cache and init board
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
