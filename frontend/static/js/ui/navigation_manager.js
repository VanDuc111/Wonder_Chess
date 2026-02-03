/**
 * Navigation Manager - Handles Navbar, View Modes, and Board Navigation Buttons
 */
class NavigationManager {
    constructor() {
        this.modeLinks = null;
        this.buttonGroup = null;
    }

    init() {
        const ids = window.APP_CONST?.IDS || {};
        const classes = window.APP_CONST?.CLASSES || {};

        this.modeLinks = document.querySelectorAll(classes.NAV_MODE_LINK || ".nav-mode-link");
        this.buttonGroup = document.querySelector(ids.BTN_GROUP_CONT || ".button-group-container");
        this.pgnHistoryEl = document.getElementById(ids.PGN_VERTICAL_LIST || "pgn-history-list-vertical");

        this.setupEventListeners();
    }

    setupEventListeners() {
        const classes = window.APP_CONST?.CLASSES || {};
        const modes = window.APP_CONST?.MODES || {};

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
                this.modeLinks.forEach((item) => item.classList.remove(classes.NAV_ACTIVE || "active"));
                event.currentTarget.classList.add(classes.NAV_ACTIVE || "active");

                const selectedMode = event.currentTarget.getAttribute("data-mode");
                if (selectedMode === (modes.ANALYZE || "analyze")) {
                    this.setAnalyzeMode();
                } else if (selectedMode === (modes.PLAY || "play")) {
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
                const actions = window.APP_CONST?.ACTIONS || {};
                if (!logic) return;

                const idx = logic.getIndex();
                const hist = logic.getHistory();

                switch (action) {
                    case (actions.FIRST || "first"): logic.loadFen(0); break;
                    case (actions.PREV || "prev"):  logic.loadFen(idx - 1); break;
                    case (actions.NEXT || "next"):  logic.loadFen(idx + 1); break;
                    case (actions.LAST || "last"):  logic.loadFen(hist.length - 1); break;
                    case (actions.CLEAR || "clear"): window.clearBoard(); break;
                    case (actions.LOAD || "load"):
                        if (window.MODAL_MANAGER) window.MODAL_MANAGER.showLoadDataModal();
                        break;
                }
            });
        }

        // PGN History Click
        if (this.pgnHistoryEl) {
            const classes = window.APP_CONST?.CLASSES || {};
            this.pgnHistoryEl.addEventListener("click", (e) => {
                const mv = e.target.closest(classes.MOVE_CELL || ".move-cell");
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

        const classes = window.APP_CONST?.CLASSES || {};
        const scoreWrapper = document.querySelector(".score-alignment-wrapper");
        if (scoreWrapper) scoreWrapper.classList.remove(classes.ROTATED_SCORE || "rotated-score");
        
        const boardContainer = document.querySelector(".chess-board-area");
        if (boardContainer) boardContainer.classList.remove(classes.ROTATED_BOARD || "rotated-board");

        if (window.updateUI) window.updateUI(window.STARTING_FEN || window.APP_CONST?.STARTING_FEN);
        if (window.LOGIC_GAME) window.LOGIC_GAME.handleScoreUpdate(window.APP_CONST?.STRINGS?.EVAL_DEFAULT || "0.00");

        this.collapseNavbar();
    }

    collapseNavbar() {
        const ids = window.APP_CONST?.IDS || {};
        const navbarCollapse = document.getElementById(ids.NAV_BAR_NAV || "navbarNav");
        if (navbarCollapse && navbarCollapse.classList.contains("show")) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse);
            bsCollapse.hide();
        }
    }
}

window.NAV_MANAGER = new NavigationManager();
document.addEventListener("DOMContentLoaded", () => window.NAV_MANAGER.init());
