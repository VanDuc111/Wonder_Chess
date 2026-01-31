/**
 * Modal Manager - Handles all popups including Load Data (FEN/PGN/AI) and Game Over
 */
class ModalManager {
    constructor() {
        this.loadDataModalInstance = null;
        this.gameOverModalInstance = null;
    }

    init() {
        const loadDataModalEl = document.getElementById(window.APP_CONST?.IDS?.LOAD_DATA_MODAL || "loadDataModal");
        if (loadDataModalEl) {
            this.loadDataModalInstance = new bootstrap.Modal(loadDataModalEl);
        }

        const gameOverModalEl = document.getElementById("gameOverModal");
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
            const el = document.getElementById("loadDataModal");
            if (el) el.style.display = "block";
        }
    }

    showGameOverModal(title, body) {
        const titleEl = document.getElementById("gameOverModalTitle");
        const bodyEl = document.getElementById("gameOverModalBody");

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;

        if (this.gameOverModalInstance) {
            this.gameOverModalInstance.show();
        }
    }

    setupLoadDataLogic() {
        const confirmLoadBtn = document.getElementById("confirm-load-btn");
        if (!confirmLoadBtn) return;

        confirmLoadBtn.addEventListener("click", async () => {
            let success = false;
            let fenToLoad = null;

            const activeTab = document.querySelector(".tab-pane.fade.show.active");
            const activeTabId = activeTab ? activeTab.id : null;
            const loader = document.getElementById("modal-loader-overlay");

            if (activeTabId === "image-pane" || activeTabId === "live-scan-pane") {
                if (loader) loader.classList.remove("d-none");
            }

            try {
                if (activeTabId === "pgn-pane") {
                    const pgnText = document.getElementById("pgn-input").value.trim();
                    if (pgnText) {
                        const tempGame = new Chess();
                        success = tempGame.load_pgn(pgnText);
                        if (success) fenToLoad = tempGame.fen();
                    }
                } else if (activeTabId === "fen-pane") {
                    const fenText = document.getElementById("fen-input").value.trim();
                    if (fenText) {
                        const tempGame = new Chess();
                        success = tempGame.load(fenText);
                        if (success) fenToLoad = fenText;
                    }
                } else if (activeTabId === "image-pane") {
                    const imageInput = document.getElementById("image-upload-input");
                    const statusEl = document.getElementById("image-upload-status");

                    if (!imageInput || imageInput.files.length === 0) {
                        if (loader) loader.classList.add("d-none");
                        if (statusEl) statusEl.textContent = "Lỗi: Vui lòng chọn một file ảnh.";
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
                        const statusEl = document.getElementById("scan-status") || document.getElementById("image-upload-status");
                        if (statusEl) statusEl.textContent = "⚠️ FEN không hợp lệ hoặc thiếu quân Vua.";
                    } else {
                        window.clearBoard(); 
                        window.initChessboard(window.board?.orientation() || "white", fenToLoad);
                        window.updateUI();
                        if (loader) loader.classList.add("d-none");
                        if (this.loadDataModalInstance) this.loadDataModalInstance.hide();
                    }
                } else if (activeTabId === "pgn-pane" || activeTabId === "fen-pane") {
                    alert("Lỗi: Dữ liệu PGN/FEN không hợp lệ.");
                }
            } catch (err) {
                console.error("Lỗi confirm-load:", err);
            } finally {
                if (loader) loader.classList.add("d-none");
            }
        });
    }

    setupGameOverLogic() {
        const btnNewGameModal = document.getElementById("modalNewGameBtn");
        if (btnNewGameModal) {
            btnNewGameModal.addEventListener("click", () => {
                if (this.gameOverModalInstance) this.gameOverModalInstance.hide();

                window.clearBoard();
                const gameInst = window.LOGIC_GAME?.getGame();
                if (gameInst) window.updateUI(gameInst.fen());

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
        this._setupCustomModalBehavior("bot-settings-modal", "#nav-play-bot");
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
