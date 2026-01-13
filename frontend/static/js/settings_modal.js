/**
 * @fileoverview Settings Modal Manager
 * Directly triggers logic from Modal UI for immediate feedback
 */

document.addEventListener('DOMContentLoaded', () => {
    const modalSwitches = {
        flip: document.getElementById('flip-board-switch-modal'),
        bestMove: document.getElementById('best-move-switch-modal'),
        notate: document.getElementById('move-notate-switch-modal'),
        evalBar: document.getElementById('eval-bar-switch-modal')
    };

    const baseSwitches = {
        flip: document.getElementById('flip-board-switch'),
        bestMove: document.getElementById('best-move-switch'),
        notate: document.getElementById('move-notate-switch'),
        evalBar: document.getElementById('eval-bar-switch')
    };

    // Helper to sync modal state to base and trigger logic
    const updateSetting = (key, value) => {
        // Always sync the hidden base switch first
        if (baseSwitches[key]) {
            baseSwitches[key].checked = value;
        }
        
        // Immediate Logic Trigger via LOGIC_GAME interface
        if (window.LOGIC_GAME) {
            switch(key) {
                case 'flip':
                    if (typeof window.LOGIC_GAME.flipBoard === 'function') {
                        window.LOGIC_GAME.flipBoard();
                    }
                    break;
                case 'bestMove':
                    if (typeof window.LOGIC_GAME.renderBestMoveArrow === 'function') {
                        const history = window.LOGIC_GAME.getHistory ? window.LOGIC_GAME.getHistory() : [];
                        const index = window.LOGIC_GAME.getIndex ? window.LOGIC_GAME.getIndex() : 0;
                        window.LOGIC_GAME.renderBestMoveArrow(value ? (history[index]?.bestMove) : null);
                    }
                    break;
                case 'notate':
                    if (typeof window.LOGIC_GAME.updatePgnHistory === 'function') {
                        window.LOGIC_GAME.updatePgnHistory();
                    }
                    break;
                case 'evalBar':
                    const wrapper = document.querySelector('.score-alignment-wrapper');
                    if (wrapper) {
                        wrapper.style.display = value ? 'flex' : 'none';
                        if (value) {
                            if (typeof window.LOGIC_GAME.syncBoardAndEvalHeight === 'function') {
                                setTimeout(() => window.LOGIC_GAME.syncBoardAndEvalHeight(), 50);
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
    const settingsModal = document.getElementById('settingsModal');
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
