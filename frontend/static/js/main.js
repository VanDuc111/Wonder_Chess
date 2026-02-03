/**
 * main.js - Application Entry Point (Bootstrapper)
 * Initializes core components and manages high-level application state.
 */

import { APP_CONST } from './constants.js';
import { ChessCore } from './core/logic_game.js';
import { AliceChat } from './ui/chat_manager.js';
import { CapturedPiecesManager } from './ui/captured_pieces.js';
import { SettingsModal } from './ui/settings_modal.js';
import { BoardEditor } from './ui/board_editor.js';
import { ModalManager } from './ui/modal_manager.js';
import { NavigationManager } from './ui/navigation_manager.js';
import { VisionManager } from './modules/vision_manager.js';
import { AuthManager } from './modules/auth_manager.js';
import { BotManager } from './core/bot_manager.js';
import { ChessTimer } from './modules/timer_manager.js';

// Initialize Global Constants if not already present (for legacy/other scripts)
window.APP_CONST = APP_CONST;

// Application Initialization
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Components
    window.TIMER_MANAGER = new ChessTimer();
    window.BOT_MANAGER = new BotManager();
    window.LOGIC_GAME = new ChessCore();
    window.ALICE_CHAT = new AliceChat();
    window.CAPTURED_PIECES = new CapturedPiecesManager();
    window.SETTINGS_MODAL = new SettingsModal();
    window.BOARD_EDITOR = new BoardEditor();
    window.MODAL_MANAGER = new ModalManager();
    window.NAV_MANAGER = new NavigationManager();
    
    // Inject specialized components into LOGIC_GAME for easier orchestration
    window.LOGIC_GAME.vision = new VisionManager();
    window.LOGIC_GAME.auth = new AuthManager();

    // 2. Component Initialization Logic
    window.BOT_MANAGER.init();
    window.ALICE_CHAT.init();
    window.CAPTURED_PIECES.init();
    window.SETTINGS_MODAL.init();
    window.BOARD_EDITOR.init();
    window.MODAL_MANAGER.init();
    window.NAV_MANAGER.init();
    
    window.LOGIC_GAME.vision.init();
    window.LOGIC_GAME.auth.init();

    // 3. Preload piece images
    const pieces = ["wP","wR","wN","wB","wQ","wK","bP","bR","bN","bB","bQ","bK"];
    const theme = APP_CONST?.PATHS?.PIECE_THEME || 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png';
    pieces.forEach((p) => {
        const img = new Image();
        img.src = theme.replace('{piece}', p);
    });

    // 4. Start Application
    const displayName = window.USER_DATA?.isAuthenticated ? window.USER_DATA.displayName : (APP_CONST?.CHAT?.DEFAULT_NICKNAME || "bạn");

    // Chatbot welcome message
    const ids = APP_CONST?.IDS || {};
    const chatbotMessages = document.getElementById(ids.CHATBOT_MESSAGES || "chatbot-messages");
    if (chatbotMessages && !sessionStorage.getItem("alice_welcomed")) {
        const welcomeMessage = APP_CONST?.MESSAGES?.WELCOME
            ? APP_CONST.MESSAGES.WELCOME(displayName)
            : `Chào ${displayName}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;

        window.ALICE_CHAT.displayMessage(welcomeMessage);
        sessionStorage.setItem("alice_welcomed", "true");
    }

    // Clear backend cache on startup
    fetch(APP_CONST?.API?.CLEAR_CACHE || "/api/game/clear_cache", { method: "POST" });

    // Initialize the main board if present
    const boardElId = APP_CONST?.IDS?.BOARD_ELEMENT || "myBoard";
    if (document.getElementById(boardElId)) {
        window.LOGIC_GAME.initBoard();
    }
});

// ==========================================
// GLOBAL BRIDGE FUNCTIONS (For Compatibility)
// ==========================================

window.initChessboard = (orientation = "white", fen = null) => {
    return window.LOGIC_GAME?.initBoard(orientation, fen);
};

window.updateUI = (fen) => {
    return window.LOGIC_GAME?.updateUI(fen);
};

window.loadFen = (index) => {
    return window.LOGIC_GAME?.loadFen(index);
};

window.handleBotTurn = () => {
    return window.LOGIC_GAME?.botGo();
};

window.clearBoard = () => {
    if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newUrl }, "", newUrl);
    }
    window.LOGIC_GAME?.clearBoard();
};

window.showGameOverModal = (title, body) => {
    if (window.LOGIC_GAME?.ui) {
         window.LOGIC_GAME.ui.showGameOverModal(title, body);
    } else if (window.MODAL_MANAGER) {
         window.MODAL_MANAGER.showGameOverModal(title, body);
    }
};

window.updateCapturedPieces = (game) => {
    window.CAPTURED_PIECES?.update(game);
};

window.clearCapturedPieces = () => {
    window.CAPTURED_PIECES?.clear();
};
