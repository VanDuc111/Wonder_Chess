/**
 * Modal Manager - Handles all popups including Load Data (FEN/PGN/AI) and Game Over
 */

import { APP_CONST } from '../constants.js';

export class ModalManager {
    constructor() {
        this.loadDataModalInstance = null;
        this.gameOverModalInstance = null;
    }

    init() {
        const ids = APP_CONST?.IDS || {};
        const loadDataModalEl = document.getElementById(ids.LOAD_DATA_MODAL || "loadDataModal");
        if (loadDataModalEl) {
            this.loadDataModalInstance = new bootstrap.Modal(loadDataModalEl);
        }

        const gameOverModalEl = document.getElementById(ids.GAME_OVER_MODAL || "gameOverModal");
        if (gameOverModalEl) {
            this.gameOverModalInstance = new bootstrap.Modal(gameOverModalEl, {
                keyboard: false,
                backdrop: "static",
            });
        }

        this.setupLoadDataLogic();
        this.setupGameOverLogic();
        this.setupBotSettingsModal();
    }

    showLoadDataModal() {
        if (this.loadDataModalInstance) this.loadDataModalInstance.show();
        else {
            const ids = APP_CONST?.IDS || {};
            const el = document.getElementById(ids.LOAD_DATA_MODAL || "loadDataModal");
            if (el) el.style.display = "block";
        }
    }

    showGameOverModal(title, body) {
        const ids = APP_CONST?.IDS || {};
        const titleEl = document.getElementById(ids.GAME_OVER_MODAL_TITLE || "gameOverModalTitle");
        const bodyEl = document.getElementById(ids.GAME_OVER_MODAL_BODY || "gameOverModalBody");

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;

        if (this.gameOverModalInstance) {
            this.gameOverModalInstance.show();
        }
    }

    setupLoadDataLogic() {
        const ids = APP_CONST?.IDS || {};
        const msgs = APP_CONST?.MESSAGES || {};
        const confirmLoadBtn = document.getElementById(ids.CONFIRM_LOAD_BTN || "confirm-load-btn");
        if (!confirmLoadBtn) return;

        confirmLoadBtn.addEventListener("click", async () => {
            let success = false;
            let fenToLoad = null;

            const activeTab = document.querySelector(".tab-pane.fade.show.active");
            const activeTabId = activeTab ? activeTab.id : null;
            const loader = document.getElementById(ids.MODAL_LOADER_OVERLAY || "modal-loader-overlay");

            if (activeTabId === "image-pane" || activeTabId === "live-scan-pane") {
                if (loader) loader.classList.remove("d-none");
            }

            try {
                if (activeTabId === "pgn-pane") {
                    const pgnText = document.getElementById(ids.PGN_INPUT || "pgn-input").value.trim();
                    if (pgnText) {
                        const tempGame = new Chess();
                        success = tempGame.load_pgn(pgnText);
                        if (success) fenToLoad = tempGame.fen();
                    }
                } else if (activeTabId === "fen-pane") {
                    const fenText = document.getElementById(ids.FEN_INPUT || "fen-input").value.trim();
                    if (fenText) {
                        const tempGame = new Chess();
                        success = tempGame.load(fenText);
                        if (success) fenToLoad = fenText;
                    }
                } else if (activeTabId === "image-pane") {
                    const imageInput = document.getElementById(ids.IMAGE_UPLOAD_INPUT || "image-upload-input");
                    const statusEl = document.getElementById(ids.IMAGE_UPLOAD_STATUS || "image-upload-status");

                    if (!imageInput || imageInput.files.length === 0) {
                        if (loader) loader.classList.add("d-none");
                        if (statusEl) statusEl.textContent = msgs.ERROR_SELECT_IMAGE || "Lỗi: Vui lòng chọn một file ảnh.";
                        return;
                    }

                    if (window.LOGIC_GAME && window.LOGIC_GAME.vision) {
                        const data = await window.LOGIC_GAME.vision.analyzeUpload(imageInput.files[0]);
                        if (data.success) {
                            success = true;
                            fenToLoad = data.fen;
                        } else {
                            if (loader) loader.classList.add("d-none");
                            window.LOGIC_GAME.vision.showFriendlyError(statusEl, data.error);
                            return;
                        }
                    }
                } else if (activeTabId === "live-scan-pane") {
                    if (window.LOGIC_GAME && window.LOGIC_GAME.vision) {
                        await window.LOGIC_GAME.vision.performScan();
                    }
                    if (this.loadDataModalInstance) this.loadDataModalInstance.hide();
                    return;
                }

                if (success && fenToLoad) {
                    if (window.LOGIC_GAME && window.LOGIC_GAME.vision && !window.LOGIC_GAME.vision.isValidFen(fenToLoad)) {
                        if (loader) loader.classList.add("d-none");
                        const statusEl = document.getElementById(ids.SCAN_STATUS || "scan-status") || document.getElementById(ids.IMAGE_UPLOAD_STATUS || "image-upload-status");
                        if (statusEl) statusEl.textContent = msgs.ERROR_INVALID_FEN_KING || "⚠️ FEN không hợp lệ hoặc thiếu quân Vua.";
                    } else {
                        if (window.LOGIC_GAME) {
                            const currentOrientation = window.board ? window.board.orientation() : "white";
                            window.LOGIC_GAME.initBoard(currentOrientation, fenToLoad);
                        }
                        if (loader) loader.classList.add("d-none");
                        if (this.loadDataModalInstance) this.loadDataModalInstance.hide();
                    }
                } else if (activeTabId === "pgn-pane" || activeTabId === "fen-pane") {
                    alert(msgs.LOAD_ERROR_DATA || "Lỗi: Dữ liệu PGN/FEN không hợp lệ.");
                }
            } catch (err) {
                console.error("Lỗi confirm-load:", err);
            } finally {
                if (loader) loader.classList.add("d-none");
            }
        });
    }

    setupGameOverLogic() {
        const ids = APP_CONST?.IDS || {};
        const btnNewGameModal = document.getElementById(ids.MODAL_NEW_GAME_BTN || "modalNewGameBtn");
        if (btnNewGameModal) {
            btnNewGameModal.addEventListener("click", () => {
                if (this.gameOverModalInstance) this.gameOverModalInstance.hide();

                if (window.LOGIC_GAME) {
                    window.LOGIC_GAME.clearBoard();

                    const timeLimitMinutes = window.BOT_MANAGER ? parseInt(window.BOT_MANAGER.selectedTime) : 0;
                    const gameInst = window.LOGIC_GAME.game;
                    
                    if (window.playerColor !== null && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0 && gameInst) {
                        window.TIMER_MANAGER?.init(timeLimitMinutes);
                        window.TIMER_MANAGER?.start(gameInst.turn());
                    } else {
                        window.TIMER_MANAGER?.reset();
                    }

                    if (window.playerColor === "b") {
                        window.LOGIC_GAME.botGo();
                    }
                }
            });
        }
    }

    setupBotSettingsModal() {
        const ids = APP_CONST?.IDS || {};
        this._setupCustomModalBehavior(ids.BOT_SETTINGS_MODAL || "bot-settings-modal", ids.NAV_PLAY_BOT || "#nav-play-bot");
    }

    /**
     * Helper for non-bootstrap custom modals
     * @private
     */
    _setupCustomModalBehavior(modalId, triggerSelector) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;

        const triggerElement = document.querySelector(triggerSelector);
        if (triggerElement) {
            triggerElement.addEventListener("click", (e) => {
                e.preventDefault();
                modalElement.style.display = "block";
            });
        }

        const closeModalBtn = modalElement.querySelector(".close-btn");
        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => modalElement.style.display = "none");
        }

        modalElement.addEventListener("click", (e) => {
            if (e.target === modalElement) modalElement.style.display = "none";
        });
    }
}
