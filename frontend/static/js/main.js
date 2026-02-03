/**
 * main.js - Application Entry Point (Bootstrapper)
 * Initializes core components and manages high-level application state.
 */

// Global Game State
// Global Game State
window.board = null;
window.STARTING_FEN = window.APP_CONST?.STARTING_FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Bot configuration (synced with BOT_MANAGER)
const defaults = window.APP_CONST?.DEFAULTS || {};
window.selectedBotColor = defaults.BOT_COLOR || "r";
window.selectedBotEngine = "stockfish";
window.selectedBotLevel = window.APP_CONST?.BOT?.DEFAULT_LEVEL || 10;
window.selectedBotTime = defaults.BOT_TIME_MINUTES || "0";
window.selectedBotIncrement = 0;
window.playerColor = defaults.PLAYER_COLOR !== undefined ? defaults.PLAYER_COLOR : null;
window.isPlayerTurn = true;

document.addEventListener("DOMContentLoaded", () => {
    // 0. Preload piece images
    const pieces = ["wP","wR","wN","wB","wQ","wK","bP","bR","bN","bB","bQ","bK"];
    const theme = window.APP_CONST?.PATHS?.PIECE_THEME || 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png';
    pieces.forEach((p) => {
        const img = new Image();
        img.src = theme.replace('{piece}', p);
    });

    // 1. Initialize Global Entities
    if (window.ALICE_CHAT) window.ALICE_CHAT.init();
    
    // 2. Start Application
    const displayName = window.USER_DATA?.isAuthenticated ? window.USER_DATA.displayName : (window.APP_CONST?.CHAT?.DEFAULT_NICKNAME || "bạn");

    // Chatbot welcome message
    const ids = window.APP_CONST?.IDS || {};
    const chatbotMessages = document.getElementById(ids.CHATBOT_MESSAGES || "chatbot-messages");
    if (chatbotMessages && !sessionStorage.getItem("alice_welcomed")) {
        const welcomeMessage = window.APP_CONST?.MESSAGES?.WELCOME
            ? window.APP_CONST.MESSAGES.WELCOME(displayName)
            : `Chào ${displayName}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;

        if (typeof displayChatbotMessage === "function") {
            displayChatbotMessage(welcomeMessage);
            sessionStorage.setItem("alice_welcomed", "true");
        }
    }

    // Clear backend cache on startup
    fetch(window.APP_CONST?.API?.CLEAR_CACHE || "/api/game/clear_cache", { method: "POST" });

    // Initialize the main board if present
    const boardElId = window.APP_CONST?.IDS?.BOARD_ELEMENT || "myBoard";
    if (document.getElementById(boardElId)) {
        window.initChessboard();
    }
});

// ==========================================
// GLOBAL BRIDGE FUNCTIONS (For Compatibility)
// ==========================================

window.initChessboard = (orientation = "white", fen = null) => {
    return window.LOGIC_GAME?.initChessboard(orientation, fen);
};

window.updateUI = (fen) => {
    return window.LOGIC_GAME?.updateUI(fen);
};

window.loadFen = (index) => {
    return window.LOGIC_GAME?.loadFen(index);
};

window.handleBotTurn = () => {
    return window.LOGIC_GAME?.handleBotTurn();
};

window.clearBoard = () => {
    if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newUrl }, "", newUrl);
    }
    window.LOGIC_GAME?.clearBoard();
};

window.showGameOverModal = (title, body) => {
    window.MODAL_MANAGER?.showGameOverModal(title, body);
};
