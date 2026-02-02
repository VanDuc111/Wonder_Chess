(function () {
    // File: frontend/static/js/constants.js
    // Nguồn sự thật duy nhất cho toàn bộ hằng số trong ứng dụng WonderChess

    const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const PATHS = {
        STATIC: '/static/',
        PIECE_THEME: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        PIECE_IMAGES: {
            'p': 'img/chesspieces/wikipedia/bP.png',
            'n': 'img/chesspieces/wikipedia/bN.png',
            'b': 'img/chesspieces/wikipedia/bB.png',
            'r': 'img/chesspieces/wikipedia/bR.png',
            'q': 'img/chesspieces/wikipedia/bQ.png',
            'P': 'img/chesspieces/wikipedia/wP.png',
            'N': 'img/chesspieces/wikipedia/wN.png',
            'B': 'img/chesspieces/wikipedia/wB.png',
            'R': 'img/chesspieces/wikipedia/wR.png',
            'Q': 'img/chesspieces/wikipedia/wQ.png',
        }
    };

    const PIECE_VALUES = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
    };

    const PIECE_NAMES_VN = {
        'p': 'Tốt đen', 'n': 'Mã đen', 'b': 'Tượng đen', 
        'r': 'Xe đen', 'q': 'Hậu đen', 'k': 'Vua đen',
        'P': 'Tốt trắng', 'N': 'Mã trắng', 'B': 'Tượng trắng',
        'R': 'Xe trắng', 'Q': 'Hậu trắng', 'K': 'Vua trắng'
    };

    const CHESS_RULES = {
        STARTING_PIECES: {
            'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1,
            'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 'K': 1
        }
    };

    const BOT = {
        STOCKFISH_WASM_URL: "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.min.js",
        BASE_ELO: 850,
        ELO_STEP: 50,
        DEFAULT_WASM_MOVETIME: 500,
        INIT_DELAY_MS: 2000,
        DEFAULT_LEVEL: 10
    };

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
        LOAD_DATA_MODAL: 'loadDataModal',
        BOT_SETTINGS_MODAL: 'bot-settings-modal',
        FLIP_BOARD_SWITCH: 'flip-board-switch',
        BEST_MOVE_SWITCH: 'best-move-switch',
        EVAL_BAR_SWITCH: 'eval-bar-switch',
        MOVE_NOTATE_SWITCH: 'move-notate-switch',
        PGN_VERTICAL_LIST: 'pgn-history-list-vertical',
        PGN_VERTICAL_CONT: 'pgn-history-vertical',
        OPENING_NAME_DISPLAY: 'opening-name',
        
        // Bot Settings UI IDs
        BOT_ENGINE_SELECT: 'bot-engine-select',
        BOT_LEVEL_SLIDER: 'bot-level-slider',
        BOT_LEVEL_SELECT: 'bot-level-select',
        BOT_SIDE_SELECT: 'bot-side-select',
        BOT_TIME_SELECT: 'bot-time-select',
        BOT_INCREMENT_SELECT: 'bot-increment-select',
        BOT_LEVEL_DISPLAY: 'level-value-display',
        BOT_START_BTN: 'start-bot-game-btn',

        // Board Editor IDs
        EDITOR_MODAL: 'boardEditorModal',
        EDITOR_BOARD: 'editorBoard',
        EDITOR_FEN_INPUT: 'editor-fen-input',
        EDITOR_REF_IMAGE: 'editor-reference-image',
        EDITOR_REF_PLACEHOLDER: 'editor-no-image-placeholder',
        EDITOR_DONE_BTN: 'editor-done-btn',
        EDITOR_CLEAR_BTN: 'editor-clear-board',
        EDITOR_FLIP_BTN: 'editor-flip-board',
        EDITOR_START_BTN: 'editor-start-position',
        EDITOR_APPLY_FEN_BTN: 'editor-apply-fen',
        EDITOR_DELETE_TOOL: 'editor-delete-piece',
        EDITOR_HAND_TOOL: 'editor-hand-tool',
        EDITOR_VALIDATION_ERROR: 'editor-validation-error',
        EDITOR_ERROR_MSG: 'editor-error-message',
        EDITOR_LIGHTBOX: 'editor-image-lightbox',
        EDITOR_LIGHTBOX_IMG: 'lightbox-img',
        
        // Editor Setting Element IDs
        EDITOR_CASTLE_WK: 'castling-wk',
        EDITOR_CASTLE_WQ: 'castling-wq',
        EDITOR_CASTLE_BK: 'castling-bk',
        EDITOR_CASTLE_BQ: 'castling-bq'
    };

    const API = {
        CLEAR_CACHE: '/api/game/clear_cache',
        MAKE_MOVE: '/api/game/make_move',
        BOT_MOVE: '/api/game/bot_move',
        EVALUATE: '/api/game/evaluate',
        IMAGE_ANALYZE: '/api/image/analyze_image',
        CHAT_ANALYSIS: '/api/analysis/chat_analysis'
    };

    const MESSAGES = {
        WELCOME: (name) => `Chào bạn, ${name}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`,
        ALICE_IDLE: "Sẵn sàng...",
        ALICE_THINKING: "Alice đang suy nghĩ...",
        VISION_SUPPORTED_FORMATS: "Định dạng hỗ trợ: JPG, PNG. Ảnh rõ nét sẽ cho kết quả chính xác nhất.",
        VISION_READY_SCAN: "Sẵn sàng để phân tích!",
        VISION_ERROR_LOST: "Ôi không! Alice bị lạc rồi...",
        VISION_ERROR_LOST_DESC: "Kết nối tới máy chủ AI gặp chút trục trặc. Bạn hãy thử lại sau giây lát nhé.",
        VISION_ERROR_TIMEOUT: "Kết nối quá hạn (Timeout)",
        VISION_ERROR_TIMEOUT_DESC: "Alice đã cố gắng hết sức nhưng máy chủ phản hồi quá chậm.",
        GAME_OVER_TIME_TITLE: "Hết giờ",
        GAME_OVER_TIME_DESC: (winner) => `Hết giờ! ${winner} thắng cuộc.`,
        INVALID_FEN_KING: "Mỗi bên phải có đúng 1 vua!",
        INVALID_IMAGE: "Vui lòng chọn file ảnh hợp lệ (JPG, PNG).",
        LOAD_ERROR_DATA: "Lỗi: Dữ liệu PGN/FEN không hợp lệ.",
        COACH_COMMENT_OPENING: "phân tích khai cuộc này một cách chuyên sâu",
        COACH_COMMENT_BRILLIANT: "khen ngợi nước đi thiên tài này",
        COACH_COMMENT_GOOD: "nhận xét đây là một nước đi rất tốt",
        COACH_COMMENT_BLUNDER: "phê bình sai lầm nghiêm trọng này",
        COACH_COMMENT_MISTAKE: "chỉ ra đây là một sai lầm và tại sao"
    };

    const ASSETS = {
        ALICE_ERROR_IMG: '/static/img/alice-error.webp',
        ALICE_LOADING_SVG: '/static/img/alice-loading.svg'
    };
    
    const STRINGS = {
        COLOR_WHITE_VN: 'Trắng',
        COLOR_BLACK_VN: 'Đen',
        OPENING_DEFAULT: 'Khởi đầu'
    };
    
    const UI_CONFIG = {
        EVAL_MAX_PAWNS: 10.0,
        MIN_BOT_THINKING_TIME_MS: 1200,
        RESIZE_DEBOUNCE_MS: 150
    };

    const QUALITY_THRESHOLDS = {
        BRILLIANT: 1.5,
        GREAT: 0.8,
        GOOD: 0.1,
        SOLID: -0.3,
        MISTAKE: -0.7,
        BLUNDER: -1.5,
        INACCURATE: -0.3,
        MISS_WIN_THRESHOLD: 2.5,
        MISS_WIN_RESULT: 0.5
    };

    // Gắn các hằng số vào đối tượng toàn cục
    if (typeof window !== 'undefined') {
        window.APP_CONST = {
            STARTING_FEN,
            PATHS,
            PIECE_VALUES,
            PIECE_NAMES_VN,
            CHESS_RULES,
            BOT,
            DEFAULTS,
            ENGINE,
            TIMERS,
            AUTO_SCAN,
            VIDEO_CONSTRAINTS,
            IDS,
            API,
            MESSAGES,
            ASSETS,
            STRINGS,
            UI_CONFIG,
            QUALITY_THRESHOLDS,
            OPENINGS: {
                ITEMS_PER_PAGE: 20,
                TRANSITION_MS: 1800
            }
        };
    }
})();
