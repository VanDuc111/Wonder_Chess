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
        /** @type {number} The last move index that received an increment */
        this.lastIncrementMoveIndex = -1;
        
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
        const min = Math.floor(seconds / (window.APP_CONST?.TIME?.SECONDS_PER_MINUTE || 60));
        const sec = seconds % (window.APP_CONST?.TIME?.SECONDS_PER_MINUTE || 60);
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
        this.lastIncrementMoveIndex = -1;

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
     * @param {Object} [gameInstance=null] - Optional chess.js instance for increment check.
     */
    start(colorToMove, increment = 0, gameInstance = null) {
        this.stop();

        // Increment Logic: Add time to the player WHO JUST MOVED
        const game = gameInstance || window.LOGIC_GAME?.getGame?.();
        if (this.isTimedGame && increment > 0 && game) {
            const history = game.history();
            const moveCount = history.length;
            
            // Only increment if we haven't incremented for THIS specific move yet
            if (moveCount > 0 && moveCount !== this.lastIncrementMoveIndex) {
                if (colorToMove === 'w') {
                    this.blackTime += increment; // Black just moved
                } else {
                    this.whiteTime += increment; // White just moved
                }
                this.lastIncrementMoveIndex = moveCount;
                this.updateDisplay();
            }
        }

        this._ensureDom();
        const isWhite = (colorToMove === 'w');
        if (isWhite) {
            this.dom.timerWhite?.classList.add('active');
            this.dom.timerBlack?.classList.remove('active');
        } else {
            this.dom.timerWhite?.classList.remove('active');
            this.dom.timerBlack?.classList.add('active');
        }

        this.timerInterval = setInterval(() => {
            if (isWhite) {
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
        this._ensureDom();
        this.isTimedGame = false;
        
        const whiteVN = window.APP_CONST?.STRINGS?.COLOR_WHITE_VN || 'Trắng';
        const blackVN = window.APP_CONST?.STRINGS?.COLOR_BLACK_VN || 'Đen';
        const winner = (color === 'w') ? blackVN : whiteVN;
        
        const title = window.APP_CONST?.MESSAGES?.GAME_OVER_TIME_TITLE || "Hết giờ";
        const body = window.APP_CONST?.MESSAGES?.GAME_OVER_TIME_DESC ? 
            window.APP_CONST.MESSAGES.GAME_OVER_TIME_DESC(winner) : 
            `Hết giờ! ${winner} thắng cuộc.`;

        if (window.LOGIC_GAME && window.LOGIC_GAME.showGameOver) {
            window.LOGIC_GAME.showGameOver(title, body);
        } else if (window.showGameOverModal) {
            window.showGameOverModal(title, body);
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
