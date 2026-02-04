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
    },
    BOARD_FILES: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
};

const BOT = {
    STOCKFISH_WASM_URL: "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.min.js",
    BASE_ELO: 850,
    ELO_STEP: 50,
    DEFAULT_WASM_MOVETIME: 500,
    INIT_DELAY_MS: 2000,
    DEFAULT_LEVEL: 10,
    DEFAULT_ENGINE: 'stockfish',
    DEFAULT_COLOR: 'r',
    DEFAULT_TIME: '0',
    LEVEL_THRESHOLDS: [
        { max: 4, value: "0" },
        { max: 8, value: "5" },
        { max: 12, value: "10" },
        { max: 16, value: "15" },
        { fallback: "20" }
    ],
    REGEX: {
        SCORE: /score\s(cp|mate)\s(-?\d+)/,
        BESTMOVE: /bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/
    }
};

const DEFAULTS = {
    BOT_COLOR: 'w',
    BOT_TIME_MINUTES: '5',
    PLAYER_COLOR: null,
    TIMED_GAME: false
};

const ENGINE = {
    MATE_SCORE_BASE: 1000000,
    MATE_DEPTH_ADJUSTMENT: 500,
    CP_TO_PAWN: 100,
    MATE_SYMBOLS: ['M', '#'],
    NORMALIZED_SCORE: {
        MATE: 100,
        DEFAULT: 0
    }
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

const VISION = {
    JPEG_QUALITY: 0.8,
    DEBUG_SHOW_DURATION_MS: 1500,
    MODAL_TRANSITION_MS: 300,
    WARPED_PREVIEW_DURATION_MS: 3000,
    BYTES_K: 1024
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
    
    // Vision / Load Data Modal IDs
    LIVE_SCAN_TAB: 'live-scan-tab',
    LIVE_SCAN_PANE: 'live-scan-pane',
    AUTO_SCAN_TOGGLE: 'auto-scan-toggle',
    CAPTURE_BTN: 'capture-btn',
    DEBUG_OVERLAY: 'debug-overlay',
    SCAN_STATUS: 'scan-status',
    WARPED_CONFIRM_CONT: 'warped-confirm-container',
    WARPED_PREVIEW_IMG: 'warped-preview-img',
    
    // Drag & Drop / Image Upload IDs
    DROP_ZONE: 'drop-zone',
    IMAGE_UPLOAD_INPUT: 'image-upload-input',
    FILE_PREVIEW: 'file-preview',
    PREVIEW_IMG: 'preview-img',
    FILE_NAME: 'file-name',
    FILE_SIZE: 'file-size',
    REMOVE_FILE_BTN: 'remove-file-btn',
    BROWSE_BTN: 'browse-btn',
    IMAGE_UPLOAD_STATUS: 'image-upload-status',
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
    EDITOR_CASTLE_BQ: 'castling-bq',
    
    // Captured Pieces IDs
    CAPTURED_WHITE: 'captured-by-white',
    CAPTURED_BLACK: 'captured-by-black',

    // Chat UI IDs
    CHAT_INPUT: 'chatbot-input',
    CHAT_FORM: 'chatbot-form',
    CHAT_SEND_BTN: 'send-chat-button',
    CHAT_RESET_BTN: 'reset-chat-btn',
    CHAT_COACH_SWITCH: 'coach-mode-switch',
    CHAT_RESET_OVERLAY: 'chat-reset-overlay',
    CHAT_CONFIRM_RESET: 'confirm-reset-chat',
    CHAT_CANCEL_RESET: 'cancel-reset-chat',
    USER_DISPLAY: 'user-display',
    ARROW_CONTAINER: 'arrow-container',

    // Modal IDs
    GAME_OVER_MODAL_TITLE: 'gameOverModalTitle',
    GAME_OVER_MODAL_BODY: 'gameOverModalBody',
    CONFIRM_LOAD_BTN: 'confirm-load-btn',
    MODAL_LOADER_OVERLAY: 'modal-loader-overlay',
    PGN_INPUT: 'pgn-input',
    FEN_INPUT: 'fen-input',
    IMAGE_UPLOAD_INPUT: 'image-upload-input',
    IMAGE_UPLOAD_STATUS: 'image-upload-status',
    SCAN_STATUS: 'scan-status',
    MODAL_NEW_GAME_BTN: 'modalNewGameBtn',
    
    // Navigation Selectors
    NAV_PLAY_BOT: '#nav-play-bot',
    NAV_BAR_NAV: 'navbarNav',
    BTN_GROUP_CONT: '.button-group-container',

    // Settings Modal IDs
    SETTINGS_MODAL: 'settingsModal',
    FLIP_BOARD_SWITCH_MODAL: 'flip-board-switch-modal',
    BEST_MOVE_SWITCH_MODAL: 'best-move-switch-modal',
    MOVE_NOTATE_SWITCH_MODAL: 'move-notate-switch-modal',
    EVAL_BAR_SWITCH_MODAL: 'eval-bar-switch-modal',
    
    // Opening Explore IDs
    OPENING_GRID: 'opening-grid',
    OPENING_SEARCH: 'opening-search',
    OPENING_NO_RESULTS: 'no-results-msg',
    OPENING_LOAD_MORE: 'load-more-btn',
    RABBIT_HOLE_OVERLAY: 'rabbit-hole-overlay',
    
    // Auth UI IDs
    SIGNIN_FORM: 'signin-form',
    SIGNUP_FORM: 'signup-form',
    LOGOUT_BTN: 'btn-logout',
    BTN_AUTH_SUBMIT: '.btn-auth-submit'
};

const API = {
    CLEAR_CACHE: '/api/game/clear_cache',
    MAKE_MOVE: '/api/game/make_move',
    BOT_MOVE: '/api/game/bot_move',
    EVALUATE: '/api/game/evaluate',
    IMAGE_ANALYZE: '/api/image/analyze_image',
    CHAT_ANALYSIS: '/api/analysis/chat_analysis',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_SIGNUP: '/api/auth/signup',
    AUTH_LOGOUT: '/api/auth/logout'
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
    COACH_COMMENT_MISTAKE: "chỉ ra đây là một sai lầm và tại sao",
    ERROR_INVALID_FEN: "FEN không hợp lệ",
    ERROR_INVALID_FEN_KING: "⚠️ FEN không hợp lệ hoặc thiếu quân Vua.",
    ERROR_SELECT_IMAGE: "Lỗi: Vui lòng chọn một file ảnh.",
    AUTH_LOGIN_ERROR: "Đăng nhập không thành công.",
    AUTH_SIGNUP_ERROR: "Đăng ký không thành công.",
    AUTH_SYSTEM_ERROR: "Có lỗi xảy ra, vui lòng thử lại.",
    SYSTEM_NOT_READY: "Lỗi: Hệ thống chưa sẵn sàng.",
    VISION_SCANNING: "🔄 Đang quét...",
    VISION_SCAN_SUCCESS: "✅ Đã cập nhật thế cờ!",
    VISION_HANDS_FREE_ON: "🟢 Chế độ rảnh tay đã bật.",
    VISION_HANDS_FREE_OFF: "🔴 Đã dừng quét tự động.",
    VISION_CAMERA_ERROR: "Lỗi: Không thể truy cập camera.",
    VISION_CAMERA_NOT_ON: "⚠️ Camera chưa bật!",
    VISION_ANALYZING: "Đang tải lên và phân tích...",
    VISION_ANALYZE_SUCCESS: "✅ Phân tích thành công!",
    VISION_ANALYZE_ERROR: "❌ Lỗi: ",
    VISION_SERVER_ERROR: "❌ Lỗi kết nối server."
};

const ASSETS = {
    ALICE_ERROR_IMG: '/static/img/alice-error.webp',
    ALICE_LOADING_SVG: '/static/img/alice-loading.svg'
};

const STRINGS = {
    COLOR_WHITE_VN: 'Trắng',
    COLOR_BLACK_VN: 'Đen',
    OPENING_DEFAULT: 'Khởi đầu',
    OPENING_NOT_STARTED: 'Chưa bắt đầu',
    OPENING_DEVELOPING: 'Đang khai triển...',
    OPENING_UNKNOWN: 'Khai cuộc không xác định',
    EVAL_DEFAULT: '0.00',
    SCORE_WHITE_WIN: '1-0',
    SCORE_BLACK_WIN: '0-1',
    SCORE_DRAW: '1/2-1/2'
};

const UI_CONFIG = {
    EVAL_MAX_PAWNS: 10.0,
    MIN_BOT_THINKING_TIME_MS: 1200,
    RESIZE_DEBOUNCE_MS: 150,
    UI_SYNC_DELAY_MS: 50,
    RANDOM_THRESHOLD: 0.5,
    EVAL_OFFSETS: {
        DESKTOP: 45,
        TABLET: 55,
        MOBILE: 48,
        BREAKPOINT_LG: 992,
        BREAKPOINT_MD: 577
    },
    ARROW: {
        COLOR: 'rgba(76, 175, 80, 0.95)',
        COLOR_LINE: 'rgba(76, 175, 80, 0.6)',
        WIDTH: 4,
        Z_INDEX: 100
    }
};

const QUALITY_THRESHOLDS = {
    BRILLIANT: 1.6,
    GREAT: 0.9,
    BEST: -0.1,
    GOOD: 0.2,
    SOLID: -0.4,
    INACCURATE: -0.8,
    MISTAKE: -1.6,
    MISS_WIN_FROM: 2.5,
    MISS_WIN_TO: 0.6
};

const MOVE_QUALITY = {
    BRILLIANT: { label: 'Thiên tài!!', icon: 'brilliant.svg', class: 'stat-brilliant' },
    GREAT: { label: 'Tuyệt vời!', icon: 'great.svg', class: 'stat-good' },
    BEST: { label: 'Tốt nhất', icon: 'best.svg', class: 'stat-best' },
    BOOK: { label: 'Lý thuyết', icon: 'book.svg', class: 'stat-book' },
    GOOD: { label: 'Nước đi tốt', icon: 'good.svg', class: 'stat-good' },
    SOLID: { label: 'Vững chắc', icon: 'solid.svg', class: 'stat-solid' },
    INACCURATE: { label: 'Thiếu chính xác?!', icon: 'inacc.svg', class: 'stat-inacc' },
    MISTAKE: { label: 'Sai lầm?', icon: 'mistake.svg', class: 'stat-mistake' },
    BLUNDER: { label: 'Sai lầm nghiêm trọng??', icon: 'blunder.svg', class: 'stat-blunder' },
    MISS: { label: 'Bỏ lỡ cơ hội thắng', icon: 'miss.svg', class: 'stat-miss' }
};

const EDITOR = {
    DEFAULT_CASTLING: 'KQkq',
    RECREATE_DELAY: 200,
    ON_SHOWN_DELAY: 50,
    SYNC_DELAY: 50,
    RESIZE_STAGES: [150, 400, 800],
    TOUCH_PIECE_SIZE: 45,
    TOUCH_PIECE_OFFSET: 22,
    TOUCH_PIECE_Z_INDEX: 10000,
    TOUCH_PIECE_OPACITY: 0.8,
    SQUARE_SELECTOR: '.square-55d63'
};

const CHAT = {
    HISTORY_KEY: 'alice_chat_history',
    DEFAULT_NICKNAME: 'bạn',
    SENDER_ALICE: 'Alice',
    SENDER_USER: 'user',
    WELCOME_DELAY_MS: 300,
    COACH_TRIGGER_HALF_MOVE: 10,
    MD_STYLE: {
        LI_MARGIN: '20px'
    }
};

const STORAGE = {
    CHAT_HISTORY: 'alice_chat_history'
};

const CLASSES = {
    BLUR_FILTER: 'blur-filter',
    HIDDEN: 'd-none',
    SQUARE_SELECTED: 'square-selected',
    HIGHLIGHT_MOVE: 'highlight-move',
    HIGHLIGHT_CHECK: 'highlight-check',
    NAV_MODE_LINK: '.nav-mode-link',
    NAV_ACTIVE: 'active',
    ROTATED_SCORE: 'rotated-score',
    ROTATED_BOARD: 'rotated-board',
    MOVE_CELL: '.move-cell'
};

export const APP_CONST = {
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
    VISION,
    IDS,
    API,
    MESSAGES,
    ASSETS,
    STRINGS,
    UI_CONFIG,
    QUALITY_THRESHOLDS,
    MOVE_QUALITY,
    EDITOR,
    CHAT,
    STORAGE,
    CLASSES,
    MODES: {
        ANALYZE: 'analyze',
        PLAY: 'play'
    },
    ACTIONS: {
        FIRST: 'first',
        PREV: 'prev',
        NEXT: 'next',
        LAST: 'last',
        CLEAR: 'clear',
        LOAD: 'load'
    },
    SETTINGS: {
        KEYS: {
            FLIP: 'flip',
            BEST_MOVE: 'bestMove',
            NOTATE: 'notate',
            EVAL_BAR: 'evalBar'
        }
    },
    OPENINGS: {
        ITEMS_PER_PAGE: 20,
        TRANSITION_MS: 1800,
        BOOK_THRESHOLD: 2,
        BOARD_INIT_DELAY_MS: 50,
        ANIMATION: {
            PIECE_SYMBOLS: ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'],
            FLOATING_PIECE_COUNT: 20
        }
    }
};

// Backward compatibility during transition
if (typeof window !== 'undefined') {
    window.APP_CONST = APP_CONST;
}
