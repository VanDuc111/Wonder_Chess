/**
 * Modal Manager - Handles all popups including Load Data (FEN/PGN/AI) and Game Over
 */
class ModalManager {
    constructor() {
        this.loadDataModalInstance = null;
        this.gameOverModalInstance = null;
    }

    init() {
        const ids = window.APP_CONST?.IDS || {};
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
            const ids = window.APP_CONST?.IDS || {};
            const el = document.getElementById(ids.LOAD_DATA_MODAL || "loadDataModal");
            if (el) el.style.display = "block";
        }
    }

    showGameOverModal(title, body) {
        const ids = window.APP_CONST?.IDS || {};
        const titleEl = document.getElementById(ids.GAME_OVER_MODAL_TITLE || "gameOverModalTitle");
        const bodyEl = document.getElementById(ids.GAME_OVER_MODAL_BODY || "gameOverModalBody");

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;

        if (this.gameOverModalInstance) {
            this.gameOverModalInstance.show();
        }
    }

    setupLoadDataLogic() {
        const ids = window.APP_CONST?.IDS || {};
        const msgs = window.APP_CONST?.MESSAGES || {};
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

                    const data = await window.VISION_MANAGER.analyzeUpload(imageInput.files[0]);
                    if (data.success) {
                        success = true;
                        fenToLoad = data.fen;
                    } else {
                        if (loader) loader.classList.add("d-none");
                        window.VISION_MANAGER.showFriendlyError(statusEl, data.error);
                        return;
                    }
                } else if (activeTabId === "live-scan-pane") {
                    await window.VISION_MANAGER.performScan();
                    if (loader) loader.classList.add("d-none");
                    return;
                }

                if (success && fenToLoad) {
                    if (!window.VISION_MANAGER.isValidFen(fenToLoad)) {
                        if (loader) loader.classList.add("d-none");
                        const statusEl = document.getElementById(ids.SCAN_STATUS || "scan-status") || document.getElementById(ids.IMAGE_UPLOAD_STATUS || "image-upload-status");
                        if (statusEl) statusEl.textContent = msgs.ERROR_INVALID_FEN_KING || "⚠️ FEN không hợp lệ hoặc thiếu quân Vua.";
                    } else {
                        window.clearBoard(); 
                        window.initChessboard(window.board?.orientation() || "white", fenToLoad);
                        window.updateUI();
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
        const ids = window.APP_CONST?.IDS || {};
        const btnNewGameModal = document.getElementById(ids.MODAL_NEW_GAME_BTN || "modalNewGameBtn");
        if (btnNewGameModal) {
            btnNewGameModal.addEventListener("click", () => {
                if (this.gameOverModalInstance) this.gameOverModalInstance.hide();

                window.clearBoard();
                const gameInst = window.LOGIC_GAME?.getGame();
                if (gameInst) window.updateUI();

                const timeLimitMinutes = parseInt(window.selectedBotTime);
                if (window.playerColor !== null && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0 && gameInst) {
                    if (window.initTimers) window.initTimers(timeLimitMinutes);
                    if (window.startTimer) window.startTimer(gameInst.turn());
                } else {
                    if (window.resetTimers) window.resetTimers();
                }

                if (window.playerColor === "b" && window.handleBotTurn) {
                    window.handleBotTurn();
                }
            });
        }
    }

    setupBotSettingsModal() {
        const ids = window.APP_CONST?.IDS || {};
        this._setupCustomModalBehavior(ids.BOT_SETTINGS_MODAL || "bot-settings-modal", ids.NAV_PLAY_BOT || "#nav-play-bot");
    }

    /**
     * Helper for non-bootstrap custom modals
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

window.MODAL_MANAGER = new ModalManager();
document.addEventListener("DOMContentLoaded", () => window.MODAL_MANAGER.init());
