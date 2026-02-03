/**
 * @fileoverview Settings Modal Manager
 * Directly triggers logic from Modal UI for immediate feedback
 */

import { APP_CONST } from '../constants.js';

export class SettingsModal {
    /**
     * Initializes setting switches and their listeners within the modal.
     */
    init() {
        const ids = APP_CONST?.IDS || {};
        const settingKeys = APP_CONST?.SETTINGS?.KEYS || {
            FLIP: 'flip',
            BEST_MOVE: 'bestMove',
            NOTATE: 'notate',
            EVAL_BAR: 'evalBar'
        };

        this.modalSwitches = {
            [settingKeys.FLIP]: document.getElementById(ids.FLIP_BOARD_SWITCH_MODAL || 'flip-board-switch-modal'),
            [settingKeys.BEST_MOVE]: document.getElementById(ids.BEST_MOVE_SWITCH_MODAL || 'best-move-switch-modal'),
            [settingKeys.NOTATE]: document.getElementById(ids.MOVE_NOTATE_SWITCH_MODAL || 'move-notate-switch-modal'),
            [settingKeys.EVAL_BAR]: document.getElementById(ids.EVAL_BAR_SWITCH_MODAL || 'eval-bar-switch-modal')
        };

        this.baseSwitches = {
            [settingKeys.FLIP]: document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch'),
            [settingKeys.BEST_MOVE]: document.getElementById(ids.BEST_MOVE_SWITCH || 'best-move-switch'),
            [settingKeys.NOTATE]: document.getElementById(ids.MOVE_NOTATE_SWITCH || 'move-notate-switch'),
            [settingKeys.EVAL_BAR]: document.getElementById(ids.EVAL_BAR_SWITCH || 'eval-bar-switch')
        };

        // Attach listeners to modal switches
        Object.keys(this.modalSwitches).forEach(key => {
            const sw = this.modalSwitches[key];
            if (sw) {
                sw.addEventListener('change', (e) => {
                    this._updateSetting(key, e.target.checked);
                });
            }
        });

        // Handle Modal show - sync from base state (in case changed via keybinds)
        const settingsModal = document.getElementById(ids.SETTINGS_MODAL || 'settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('show.bs.modal', () => {
                Object.keys(this.baseSwitches).forEach(key => {
                    if (this.baseSwitches[key] && this.modalSwitches[key]) {
                        this.modalSwitches[key].checked = this.baseSwitches[key].checked;
                    }
                });
            });
        }
    }

    /**
     * Helper to sync modal state to base and trigger logic
     * @param {string} key - Setting key (e.g., 'flip', 'bestMove')
     * @param {boolean} value - New checked state
     * @private
     */
    _updateSetting(key, value) {
        const settingKeys = APP_CONST?.SETTINGS?.KEYS || {};
        
        // Always sync the hidden base switch first
        if (this.baseSwitches[key]) {
            this.baseSwitches[key].checked = value;
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
                    if (window.LOGIC_GAME.ui && typeof window.LOGIC_GAME.ui.renderBestMoveArrow === 'function') {
                        const history = window.LOGIC_GAME.history || [];
                        const index = window.LOGIC_GAME.index || 0;
                        window.LOGIC_GAME.ui.renderBestMoveArrow(value ? (history[index]?.bestMove) : null);
                    }
                    break;
                case settingKeys.NOTATE:
                    if (window.LOGIC_GAME.ui && typeof window.LOGIC_GAME.ui.renderPGNTable === 'function') {
                        window.LOGIC_GAME.ui.renderPGNTable(window.LOGIC_GAME.history, window.LOGIC_GAME.index, window.LOGIC_GAME.engine);
                    }
                    break;
                case settingKeys.EVAL_BAR:
                    const wrapperSelector = '.score-alignment-wrapper';
                    const wrapper = document.querySelector(wrapperSelector);
                    if (wrapper) {
                        wrapper.style.display = value ? 'flex' : 'none';
                        if (value) {
                            if (window.LOGIC_GAME.ui && typeof window.LOGIC_GAME.ui.syncBoardAndEvalHeight === 'function') {
                                setTimeout(() => window.LOGIC_GAME.ui.syncBoardAndEvalHeight(), APP_CONST?.UI_CONFIG?.UI_SYNC_DELAY_MS || 50);
                            }
                            if (typeof window.LOGIC_GAME.updateUI === 'function') {
                                window.LOGIC_GAME.updateUI();
                            }
                        }
                    }
                    break;
            }
        }
    }
}
