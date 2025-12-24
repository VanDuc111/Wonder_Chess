/**
 * @fileoverview Timer management for WonderChess.
 * Handles countdown logic, increment, and UI updates for player clocks.
 */

class ChessTimer {
    constructor() {
        /** @type {number} White's remaining time in seconds */
        this.whiteTime = 0;
        /** @type {number} Black's remaining time in seconds */
        this.blackTime = 0;
        /** @type {number|null} ID of the running setInterval */
        this.timerInterval = null;
        /** @type {boolean} Whether the current game has time controls */
        this.isTimedGame = false;
        
        /** @type {Object<string, HTMLElement|null>} DOM element cache */
        this.dom = {
            timerWhite: null,
            timerBlack: null
        };
    }

    /**
     * Ensures mandatory DOM elements are cached.
     * @private
     */
    _ensureDom() {
        if (!this.dom.timerWhite) {
            this.dom.timerWhite = document.getElementById(window.APP_CONST?.IDS?.TIMER_WHITE || 'timer-white');
        }
        if (!this.dom.timerBlack) {
            this.dom.timerBlack = document.getElementById(window.APP_CONST?.IDS?.TIMER_BLACK || 'timer-black');
        }
    }

    /**
     * Formats seconds into MM:SS.
     * @param {number} seconds 
     * @returns {string}
     */
    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    /**
     * Updates the clock displays on the UI.
     */
    updateDisplay() {
        this._ensureDom();
        if (this.dom.timerWhite) this.dom.timerWhite.textContent = this.formatTime(this.whiteTime);
        if (this.dom.timerBlack) this.dom.timerBlack.textContent = this.formatTime(this.blackTime);
    }

    /**
     * Resets and hides all timers.
     */
    reset() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.whiteTime = 0;
        this.blackTime = 0;
        this.isTimedGame = false;

        this._ensureDom();
        const resetEl = (el) => {
            if (el) {
                el.style.display = 'none';
                el.classList.remove('active');
                el.textContent = '0:00';
            }
        };
        resetEl(this.dom.timerWhite);
        resetEl(this.dom.timerBlack);
    }

    /**
     * Initializes timers for a new game.
     * @param {number} minutes - Starting time in minutes.
     */
    init(minutes) {
        this.reset();
        const initialTimeSeconds = minutes * 60;
        this.whiteTime = initialTimeSeconds;
        this.blackTime = initialTimeSeconds;
        this.isTimedGame = true;

        this._ensureDom();
        if (this.dom.timerWhite) this.dom.timerWhite.style.display = 'block';
        if (this.dom.timerBlack) this.dom.timerBlack.style.display = 'block';

        this.updateDisplay();
    }

    /**
     * Stops the current countdown.
     */
    stop() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Starts/Switches the timer for the active player.
     * @param {'w'|'b'} colorToMove - Who's turn it is.
     * @param {number} increment - Seconds to add to the previous player.
     */
    start(colorToMove, increment = 0) {
        this.stop();

        // Increment Logic
        if (this.isTimedGame && increment > 0 && typeof game !== 'undefined' && game) {
            const history = game.history();
            if (history.length > 0) {
                if (colorToMove === 'w') {
                    this.blackTime += increment;
                } else {
                    this.whiteTime += increment;
                }
                this.updateDisplay();
            }
        }

        this._ensureDom();
        if (colorToMove === 'w') {
            this.dom.timerWhite?.classList.add('active');
            this.dom.timerBlack?.classList.remove('active');
        } else {
            this.dom.timerWhite?.classList.remove('active');
            this.dom.timerBlack?.classList.add('active');
        }

        this.timerInterval = setInterval(() => {
            const isWhiteTurn = (colorToMove === 'w');
            if (isWhiteTurn) {
                this.whiteTime--;
                if (this.whiteTime <= 0) this._handleTimeUp('w');
            } else {
                this.blackTime--;
                if (this.blackTime <= 0) this._handleTimeUp('b');
            }
            this.updateDisplay();
        }, 1000);
    }

    /**
     * Internal handler for when a player's time runs out.
     * @param {'w'|'b'} color - Color that flagged.
     * @private
     */
    _handleTimeUp(color) {
        this.stop();
        this.isTimedGame = false;
        const winner = (color === 'w') ? 'Đen' : 'Trắng';
        if (window.showGameOverModal) {
            window.showGameOverModal("Hết giờ", `Hết giờ! ${winner} thắng cuộc.`);
        }
    }
}

// Global initialization
window.TIMER_MANAGER = new ChessTimer();

// Compatibility wrappers for existing code
window.startTimer = (color) => {
    const inc = (typeof selectedBotIncrement !== 'undefined') ? selectedBotIncrement : 0;
    window.TIMER_MANAGER.start(color, inc);
};
window.resetTimers = () => window.TIMER_MANAGER.reset();
window.initTimers = (m) => window.TIMER_MANAGER.init(m);
Object.defineProperty(window, 'isTimedGame', {
    get: () => window.TIMER_MANAGER.isTimedGame,
    set: (v) => { window.TIMER_MANAGER.isTimedGame = v; }
});
Object.defineProperty(window, 'timerInterval', {
    get: () => window.TIMER_MANAGER.timerInterval,
    set: (v) => { window.TIMER_MANAGER.timerInterval = v; }
});
