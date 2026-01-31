/**
 * Navigation Manager - Handles Navbar, View Modes, and Board Navigation Buttons
 */
class NavigationManager {
    constructor() {
        this.modeLinks = null;
        this.buttonGroup = null;
    }

    init() {
        this.modeLinks = document.querySelectorAll(".nav-mode-link");
        this.buttonGroup = document.querySelector(".button-group-container");
        this.pgnHistoryEl = document.getElementById("pgn-history-list-vertical");

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navbar Mode Switching
        this.modeLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = event.currentTarget.getAttribute("href");
                const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html") || window.location.pathname === "";
                const isToHome = href === "/" || href === "./" || href.endsWith("index.html");

                if (href && href !== "#" && !href.startsWith("javascript:") && !(isHomePage && isToHome)) {
                    this.collapseNavbar();
                    return;
                }

                event.preventDefault();
                this.modeLinks.forEach((item) => item.classList.remove("active"));
                event.currentTarget.classList.add("active");

                const selectedMode = event.currentTarget.getAttribute("data-mode");
                if (selectedMode === "analyze") {
                    this.setAnalyzeMode();
                } else if (selectedMode === "play") {
                    this.collapseNavbar();
                }
            });
        });

        // Manual Board Navigation (Bottom Buttons)
        if (this.buttonGroup) {
            this.buttonGroup.addEventListener("click", (e) => {
                const btn = e.target.closest("button");
                if (!btn) return;
                const action = btn.getAttribute("data-action");
                const logic = window.LOGIC_GAME;
                if (!logic) return;

                const idx = logic.getIndex();
                const hist = logic.getHistory();

                switch (action) {
                    case "first": logic.loadFen(0); break;
                    case "prev":  logic.loadFen(idx - 1); break;
                    case "next":  logic.loadFen(idx + 1); break;
                    case "last":  logic.loadFen(hist.length - 1); break;
                    case "clear": window.clearBoard(); break;
                    case "load":
                        if (window.MODAL_MANAGER) window.MODAL_MANAGER.showLoadDataModal();
                        break;
                }
            });
        }

        // PGN History Click
        if (this.pgnHistoryEl) {
            this.pgnHistoryEl.addEventListener("click", (e) => {
                const mv = e.target.closest(".move-cell");
                if (!mv) return;
                const idx = parseInt(mv.getAttribute("data-index"));
                if (!isNaN(idx) && window.LOGIC_GAME) window.LOGIC_GAME.loadFen(idx);
            });
        }

        // Keyboard navigation
        document.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (window.LOGIC_GAME) {
                const idx = window.LOGIC_GAME.getIndex();
                if (e.key === "ArrowLeft") window.LOGIC_GAME.loadFen(idx - 1);
                else if (e.key === "ArrowRight") window.LOGIC_GAME.loadFen(idx + 1);
            }
        });
    }

    setAnalyzeMode() {
        if (window.resetTimers) window.resetTimers();
        window.playerColor = null;
        window.isPlayerTurn = true;

        if (window.initChessboard) window.initChessboard("white");

        const scoreWrapper = document.querySelector(".score-alignment-wrapper");
        if (scoreWrapper) scoreWrapper.classList.remove("rotated-score");
        
        const boardContainer = document.querySelector(".chess-board-area");
        if (boardContainer) boardContainer.classList.remove("rotated-board");

        if (window.updateUI) window.updateUI(window.STARTING_FEN);
        if (window.LOGIC_GAME) window.LOGIC_GAME.handleScoreUpdate("0.00");

        this.collapseNavbar();
    }

    collapseNavbar() {
        const navbarCollapse = document.getElementById("navbarNav");
        if (navbarCollapse && navbarCollapse.classList.contains("show")) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse);
            bsCollapse.hide();
        }
    }
}

window.NAV_MANAGER = new NavigationManager();
document.addEventListener("DOMContentLoaded", () => window.NAV_MANAGER.init());
