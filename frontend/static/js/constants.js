(function () {
    // File: frontend/static/js/constants.js
    // Centralized constants for the app (compatible with classic <script> loading)

    const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const DEFAULTS = {
        BOT_COLOR: 'w',
        BOT_TIME_MINUTES: '5',
        PLAYER_COLOR: null,
        TIMED_GAME: false
    };

    const ENGINE = {
        MATE_SCORE_BASE: 1000000,
        MATE_DEPTH_ADJUSTMENT: 500
    };

    const TIMERS = {
        TICK_MS: 1000,
        DEFAULT_DISPLAY: '0:00'
    };

    const AUTO_SCAN = {
        DELAY_MS: 5000
    };

    const VIDEO_CONSTRAINTS = {
        video: {facingMode: 'environment'}
    };

    const IDS = {
        TIMER_WHITE: 'timer-white',
        TIMER_BLACK: 'timer-black',
        BOARD_CONTAINER: 'chessboard-main-container',
        BOARD_ELEMENT: 'myBoard',
        EVAL_BAR: 'eval-white-advantage',
        EVAL_SCORE: 'evaluation-score',
        PGN_HISTORY_LIST: 'pgn-history-list',
        WELCOME_SCREEN: 'welcome-screen',
        MAIN_APP_SCREEN: 'main-app-screen',
        CHATBOT_MESSAGES: 'chatbot-messages',
        WEBCAM_VIDEO: 'webcam-feed',
        GAME_OVER_MODAL: 'gameOverModal',
        LOAD_DATA_MODAL: 'loadDataModal'
    };

    const API = {
        CLEAR_CACHE: '/api/game/clear_cache',
        MAKE_MOVE: '/api/game/make_move',
        BOT_MOVE: '/api/game/bot_move',
        EVALUATE: '/api/game/evaluate',
        IMAGE_ANALYZE: '/api/image/analyze_image',
        CHAT_ANALYSIS: '/api/analysis/chat_analysis'
    };

    // Attach global object for legacy scripts
    if (typeof window !== 'undefined') {
        if (!window.APP_CONST) {
            window.APP_CONST = {
                STARTING_FEN: STARTING_FEN,
                DEFAULTS: DEFAULTS,
                ENGINE: ENGINE,
                TIMERS: TIMERS,
                AUTO_SCAN: AUTO_SCAN,
                VIDEO_CONSTRAINTS: VIDEO_CONSTRAINTS,
                IDS: IDS,
                API: API
            };
        } else {
            // Merge any missing keys to existing APP_CONST without overwriting
            window.APP_CONST.STARTING_FEN = window.APP_CONST.STARTING_FEN || STARTING_FEN;
            window.APP_CONST.DEFAULTS = window.APP_CONST.DEFAULTS || DEFAULTS;
            window.APP_CONST.ENGINE = window.APP_CONST.ENGINE || ENGINE;
            window.APP_CONST.TIMERS = window.APP_CONST.TIMERS || TIMERS;
            window.APP_CONST.AUTO_SCAN = window.APP_CONST.AUTO_SCAN || AUTO_SCAN;
            window.APP_CONST.VIDEO_CONSTRAINTS = window.APP_CONST.VIDEO_CONSTRAINTS || VIDEO_CONSTRAINTS;
            window.APP_CONST.IDS = window.APP_CONST.IDS || IDS;
            window.APP_CONST.API = window.APP_CONST.API || API;
        }
    }
})();
