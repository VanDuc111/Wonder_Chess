/**
 * Navigation Manager - Handles Navbar, View Modes, and Board Navigation Buttons
 */

import { APP_CONST } from '../constants.js';

export class NavigationManager {
    constructor() {
        this.modeLinks = null;
        this.buttonGroup = null;
    }

    init() {
        const ids = APP_CONST?.IDS || {};
        const classes = APP_CONST?.CLASSES || {};

        this.modeLinks = document.querySelectorAll(classes.NAV_MODE_LINK || ".nav-mode-link");
        this.buttonGroup = document.querySelector(ids.BTN_GROUP_CONT || ".button-group-container");
        this.pgnHistoryEl = document.getElementById(ids.PGN_VERTICAL_LIST || "pgn-history-list-vertical");

        this.setupEventListeners();
    }

    setupEventListeners() {
        const classes = APP_CONST?.CLASSES || {};
        const modes = APP_CONST?.MODES || {};

        // Navbar Mode Switching
        this.modeLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = event.currentTarget.getAttribute("href");
                const path = window.location.pathname;
                const isHomePage = path === "/" || path === "" || path.endsWith("/index.html") || path.endsWith("/");
                const isToHome = href === "/" || href === "./" || href.endsWith("index.html");

                if (isToHome) {
                    event.preventDefault();
                    this.collapseNavbar();
                    if (window.LOGIC_GAME) {
                        window.TIMER_MANAGER?.reset();
                        window.playerColor = null;
                        window.isPlayerTurn = true;
                        window.LOGIC_GAME.initBoard("white");

                        const classes = APP_CONST?.CLASSES || {};
                        const scoreWrapper = document.querySelector(".score-alignment-wrapper");
                        if (scoreWrapper) scoreWrapper.classList.remove(classes.ROTATED_SCORE || "rotated-score");
                        
                        const boardContainer = document.querySelector(".chess-board-area");
                        if (boardContainer) boardContainer.classList.remove(classes.ROTATED_BOARD || "rotated-board");

                        window.LOGIC_GAME.updateUI();
                    }
                    return;
                }

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
                const actions = APP_CONST?.ACTIONS || {};
                if (!logic) return;

                const idx = logic.index;
                const hist = logic.history;

                switch (action) {
                    case (actions.FIRST || "first"): logic.loadFen(0); break;
                    case (actions.PREV || "prev"):  logic.loadFen(idx - 1); break;
                    case (actions.NEXT || "next"):  logic.loadFen(idx + 1); break;
                    case (actions.LAST || "last"):  logic.loadFen(hist.length - 1); break;
                    case (actions.CLEAR || "clear"): logic.clearBoard(); break;
                    case (actions.LOAD || "load"):
                        if (window.MODAL_MANAGER && typeof window.MODAL_MANAGER.showLoadDataModal === 'function') {
                            window.MODAL_MANAGER.showLoadDataModal();
                        }
                        break;
                }
            });
        }

        // PGN History Click
        if (this.pgnHistoryEl) {
            const classes = APP_CONST?.CLASSES || {};
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
                const idx = window.LOGIC_GAME.index;
                if (e.key === "ArrowLeft") window.LOGIC_GAME.loadFen(idx - 1);
                else if (e.key === "ArrowRight") window.LOGIC_GAME.loadFen(idx + 1);
                else if (e.key.toLowerCase() === "f") {
                    const ids = APP_CONST?.IDS || {};
                    document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch')?.click();
                }
            }
        });
    }

    setAnalyzeMode() {
        if (window.LOGIC_GAME) {
            window.TIMER_MANAGER?.reset();
            window.LOGIC_GAME.playerColor = null;
            window.LOGIC_GAME.isPlayerTurn = true;
            window.LOGIC_GAME.initBoard("white");

            const classes = APP_CONST?.CLASSES || {};
            const scoreWrapper = document.querySelector(".score-alignment-wrapper");
            if (scoreWrapper) scoreWrapper.classList.remove(classes.ROTATED_SCORE || "rotated-score");
            
            const boardContainer = document.querySelector(".chess-board-area");
            if (boardContainer) boardContainer.classList.remove(classes.ROTATED_BOARD || "rotated-board");

            window.LOGIC_GAME.updateUI();
            window.LOGIC_GAME.handleScoreUpdate(APP_CONST?.STRINGS?.EVAL_DEFAULT || "0.00");
        }

        this.collapseNavbar();
    }

    collapseNavbar() {
        const ids = APP_CONST?.IDS || {};
        const navbarCollapse = document.getElementById(ids.NAV_BAR_NAV || "navbarNav");
        if (navbarCollapse && navbarCollapse.classList.contains("show")) {
            if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        }
    }
}
