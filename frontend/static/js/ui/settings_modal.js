/**
 * @fileoverview Settings Modal Manager
 * Directly triggers logic from Modal UI for immediate feedback
 */

document.addEventListener('DOMContentLoaded', () => {
    const ids = window.APP_CONST?.IDS || {};
    const settingKeys = window.APP_CONST?.SETTINGS?.KEYS || {
        FLIP: 'flip',
        BEST_MOVE: 'bestMove',
        NOTATE: 'notate',
        EVAL_BAR: 'evalBar'
    };

    const modalSwitches = {
        [settingKeys.FLIP]: document.getElementById(ids.FLIP_BOARD_SWITCH_MODAL || 'flip-board-switch-modal'),
        [settingKeys.BEST_MOVE]: document.getElementById(ids.BEST_MOVE_SWITCH_MODAL || 'best-move-switch-modal'),
        [settingKeys.NOTATE]: document.getElementById(ids.MOVE_NOTATE_SWITCH_MODAL || 'move-notate-switch-modal'),
        [settingKeys.EVAL_BAR]: document.getElementById(ids.EVAL_BAR_SWITCH_MODAL || 'eval-bar-switch-modal')
    };

    const baseSwitches = {
        [settingKeys.FLIP]: document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch'),
        [settingKeys.BEST_MOVE]: document.getElementById(ids.BEST_MOVE_SWITCH || 'best-move-switch'),
        [settingKeys.NOTATE]: document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch'),
        [settingKeys.EVAL_BAR]: document.getElementById(ids.EVAL_BAR_SWITCH || 'eval-bar-switch')
    };

    /**
     * Helper to sync modal state to base and trigger logic
     * @param {string} key - Setting key (e.g., 'flip', 'bestMove')
     * @param {boolean} value - New checked state
     */
    const updateSetting = (key, value) => {
        // Always sync the hidden base switch first
        if (baseSwitches[key]) {
            baseSwitches[key].checked = value;
        }
        
        // Immediate Logic Trigger via LOGIC_GAME interface
        if (window.LOGIC_GAME) {
            switch(key) {
                case settingKeys.FLIP:
                    if (typeof window.LOGIC_GAME.flipBoard === 'function') {
                        window.LOGIC_GAME.flipBoard();
                    }
                    break;
                case settingKeys.BEST_MOVE:
                    if (typeof window.LOGIC_GAME.renderBestMoveArrow === 'function') {
                        const history = window.LOGIC_GAME.getHistory ? window.LOGIC_GAME.getHistory() : [];
                        const index = window.LOGIC_GAME.getIndex ? window.LOGIC_GAME.getIndex() : 0;
                        window.LOGIC_GAME.renderBestMoveArrow(value ? (history[index]?.bestMove) : null);
                    }
                    break;
                case settingKeys.NOTATE:
                    if (typeof window.LOGIC_GAME.updatePgnHistory === 'function') {
                        window.LOGIC_GAME.updatePgnHistory();
                    }
                    break;
                case settingKeys.EVAL_BAR:
                    const wrapperSelector = '.score-alignment-wrapper';
                    const wrapper = document.querySelector(wrapperSelector);
                    if (wrapper) {
                        wrapper.style.display = value ? 'flex' : 'none';
                        if (value) {
                            if (typeof window.LOGIC_GAME.syncBoardAndEvalHeight === 'function') {
                                setTimeout(() => window.LOGIC_GAME.syncBoardAndEvalHeight(), window.APP_CONST?.UI_CONFIG?.UI_SYNC_DELAY_MS || 50);
                            }
                            if (typeof window.LOGIC_GAME.updateUI === 'function') {
                                window.LOGIC_GAME.updateUI();
                            }
                        }
                    }
                    break;
            }
        }
    };

    // Attach listeners to modal switches
    Object.keys(modalSwitches).forEach(key => {
        const sw = modalSwitches[key];
        if (sw) {
            sw.addEventListener('change', (e) => {
                updateSetting(key, e.target.checked);
            });
        }
    });

    // Handle Modal show - sync from base state (in case changed via keybinds)
    const settingsModal = document.getElementById(ids.SETTINGS_MODAL || 'settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('show.bs.modal', () => {
            Object.keys(baseSwitches).forEach(key => {
                if (baseSwitches[key] && modalSwitches[key]) {
                    modalSwitches[key].checked = baseSwitches[key].checked;
                }
            });
        });
    }
});
