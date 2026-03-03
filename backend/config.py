"""
Backend Configuration Module
Centralized configuration for all backend services and API routes.
"""

# ==================== CHESS CONSTANTS ====================

class ChessConfig:
    """Chess game related constants"""
    STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    DEFAULT_SCORE = "0.00"
    DEFAULT_BEST_MOVE = "N/A"
    DEFAULT_PV = "N/A"


# ==================== ENGINE CONFIGURATION ====================

class EngineConfig:
    """Chess engine computation settings"""
    
    # Skill Levels
    DEFAULT_SKILL_LEVEL = 10
    MAX_SKILL_LEVEL = 20
    
    # Time Limits (in seconds)
    DEFAULT_THINK_TIME = 1.0  # For unlimited time games
    MAX_BOT_THINK_TIME = 2.0  # Maximum time bot can think in timed games
    EVALUATION_TIME_LIMIT = 0.7  # Increased from 0.5 for stability
    CHAT_ANALYSIS_TIME_LIMIT = 1.0  # Alice chat analysis needs more depth
    
    # Fallback Minimax Settings
    FALLBACK_MAX_DEPTH = 10 # Increased from 8
    FALLBACK_TIME_LIMIT = 0.3 # Increased from 0.1
    
    # Time Conversion
    MINUTES_TO_SECONDS = 60


# ==================== AI/CHAT CONFIGURATION ====================

class AIConfig:
    """AI assistant (Alice) configuration"""
    
    # Response Length
    MIN_RESPONSE_SENTENCES = 4
    MAX_RESPONSE_SENTENCES = 5
    
    # Greeting Instructions
    GREETING_FIRST_MESSAGE = (
        "Hãy chào ngắn gọn và thân thiện (ví dụ: 'Chào bạn! Alice đây.'). "
        "Tuyệt đối KHÔNG dùng những câu văn mẫu như '64 ô huyền diệu'."
    )
    GREETING_SUBSEQUENT = "Hãy đi thẳng vào câu trả lời, không cần chào hỏi."
    
    # Default Engine Results
    DEFAULT_ENGINE_RESULTS = {
        'search_score': '0',
        'best_move': 'N/A',
        'pv': 'N/A'
    }


# ==================== ANALYSIS CONFIGURATION ====================

class AnalysisConfig:
    """Chess move analysis and evaluation thresholds"""
    
    # Move Quality Thresholds (in pawns)
    # Improvements
    BRILLIANT_THRESHOLD = 1.6      # Very rare, huge improvement
    GREAT_THRESHOLD = 0.9          # Significant improvement or forced best move
    GOOD_THRESHOLD = 0.2           # Noticeable improvement
    
    # Neutral/Stable
    BEST_THRESHOLD = -0.1          # Top engine choice (stable)
    SOLID_THRESHOLD = -0.4         # Acceptable but not best
    
    # Errors
    INACCURACY_THRESHOLD = -0.8    # Slight error
    MISTAKE_THRESHOLD = -1.6       # Significant error
    # Below MISTAKE_THRESHOLD is BLUNDER
    
    # Special: Missed Win
    # Drop from a large winning advantage to a drawish/lost state
    MISS_WIN_FROM_THRESHOLD = 2.5
    MISS_WIN_TO_THRESHOLD = 0.6
    
    # Score Parsing
    MATE_SCORE_ABSOLUTE = 1000000.0    # Absolute value for mate positions
    EXTREME_DIFF_THRESHOLD = 50    # Threshold for "extremely large" difference
    
    # Move Quality Labels (Vietnamese)
    LABEL_BRILLIANT = "Thiên tài!!"
    LABEL_GREAT = "Tuyệt vời!"
    LABEL_BEST = "Tốt nhất"
    LABEL_BOOK = "Lý thuyết"
    LABEL_GOOD = "Nước đi tốt"
    LABEL_SOLID = "Vững chắc"
    LABEL_INACCURACY = "Thiếu chính xác?!"
    LABEL_MISTAKE = "Sai lầm?"
    LABEL_BLUNDER = "Sai lầm nghiêm trọng??"
    LABEL_MISS = "Bỏ lỡ cơ hội thắng"
    
    LABEL_EXTREME_DIFF = "Cực kỳ lớn"
    
    # Player Names (Vietnamese)
    PLAYER_WHITE = "Trắng"
    PLAYER_BLACK = "Đen"
    PLAYER_NA = "N/A"


# ==================== GEMINI API CONFIGURATION ====================

class GeminiConfig:
    """Google Gemini API settings"""
    
    # Model Selection
    MODEL_NAME = 'gemini-2.5-flash'
    
    # Retry Logic
    MAX_RETRIES = 3
    INITIAL_RETRY_DELAY = 2  # seconds
    RETRY_BACKOFF_MULTIPLIER = 2  # Exponential backoff
    
    # Error Messages
    ERROR_API_KEY_MISSING = "Gemini API Key missing."
    ERROR_SERVER_BUSY = "Google server is currently busy. Please try again later."
    ERROR_TECHNICAL_DIFFICULTY = "Alice is experiencing technical difficulties."
    
    # Warnings
    WARNING_MISSING_KEY = "Warning: Missing GEMINI_API_KEY environment variable."


# ==================== VISION PROCESSING CONFIGURATION ====================

class VisionConfig:
    """Computer vision parameters for chessboard detection"""
    
    # Image Preprocessing
    GAUSSIAN_BLUR_KERNEL = (7, 7)
    GAUSSIAN_BLUR_SIGMA = 0
    MAX_IMAGE_DIM = 1024
    
    # YOLO Inference
    YOLO_IMGSZ = 640
    BOARD_CONF_THRESHOLD = 0.5
    PIECE_CONF_THRESHOLD = 0.5
    IOU_THRESHOLD = 0.7
    
    # Board Crop & Aspect
    BOARD_CROP_MIN_SIZE = 10
    BOARD_ASPECT_MIN = 0.90
    BOARD_ASPECT_MAX = 1.10
    BOARD_CONF_2D_THRESHOLD = 0.7
    PAD_RATIO_2D = 0.15
    PAD_RATIO_3D = 0.20
    REFINED_WIDTH_RATIO = 0.5
    FALLBACK_3D_PAD = 0.1
    
    # Piece anchor
    Y_OFFSET_3D_ANCHOR = 0.95
    
    # Adaptive Threshold
    ADAPTIVE_BLOCK_SIZE = 21
    ADAPTIVE_C_CONSTANT = 5
    
    # Morphological Operations
    DILATION_KERNEL_SIZE = (3, 3)
    DILATION_ITERATIONS = 1
    
    # Contour Detection
    MAX_CONTOURS_TO_CHECK = 10
    MIN_BOARD_AREA_RATIO = 0.2  # Board must occupy at least 20% of image
    
    # Polygon Approximation
    EPSILON_FACTORS = [0.02, 0.05, 0.1]  # Try multiple epsilon values
    REQUIRED_CORNERS = 4  # Quadrilateral
    
    # Grid Mapping
    CHESS_GRID_SIZE = 8  # 8x8 board
    MIN_GRID_INDEX = 0
    MAX_GRID_INDEX = 7
    
    # Distortion Detection
    ANGLE_TOLERANCE_DEGREES = 15  # Max deviation from 90° for rectangle
    RIGHT_ANGLE_DEGREES = 90
    
    # Debug Messages
    MSG_BOARD_FOUND = "✅ OpenCV tìm thấy hình tứ giác (Area: {ratio:.2f})"
    MSG_BOARD_NOT_FOUND = "⚠️ Không tìm thấy bàn cờ bằng thuật toán Contour."


# ==================== HTTP STATUS CODES ====================

class HTTPStatus:
    """HTTP response status codes"""
    OK = 200
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    INTERNAL_SERVER_ERROR = 500


# ==================== IMAGE PROCESSING ====================

class ImageConfig:
    """Image upload and processing settings"""
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    MAX_FILE_SIZE_MB = 5
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ==================== ERROR MESSAGES ====================

class ErrorMessages:
    """Centralized error messages for API responses"""
    
    # Game Routes
    MISSING_SQUARE_OR_FEN = "Missing square or fen parameter."
    INVALID_FEN_OR_SQUARE = "Invalid FEN or Square format."
    MISSING_MOVE_OR_FEN = "Missing move or fen parameter."
    ILLEGAL_MOVE = "Illegal move."
    INVALID_UCI_OR_FEN = "Invalid UCI move or FEN."
    FEN_REQUIRED = "FEN is required"
    FEN_REQUIRED_DOT = "FEN is required."
    BOT_NO_MOVE = "Bot could not find a move (Game Over?)"
    
    # Analysis Routes
    MISSING_FEN_OR_QUESTION = "Thiếu FEN hoặc câu hỏi người dùng."
    
    # Auth Routes
    EMAIL_IN_USE = "Email đã được sử dụng."
    USERNAME_EXISTS = "Username đã tồn tại."
    INVALID_CREDENTIALS = "Email hoặc mật khẩu không chính xác."
    GOOGLE_INFO_ERROR = "Không lấy được thông tin từ Google."
    LOGOUT_SUCCESS = "Đã đăng xuất."
    
    # Image Routes
    NO_FILE_PART = "There is no file part in the request."
    EMPTY_FILENAME = "Empty filename."
    INVALID_FILE_TYPE = "Invalid file type."
    FILE_TOO_LARGE = "File too large."
    SERVER_ERROR_PREFIX = "Lỗi server: "


# ==================== SUCCESS MESSAGES ====================

class SuccessMessages:
    """Centralized success messages"""
    SIGNUP_SUCCESS = "Đăng ký thành công!"
    IMAGE_ANALYSIS_SUCCESS = "Thành công!"
    CACHE_CLEARED = "Engine cache cleared."


# ==================== OAUTH PROVIDERS ====================

class OAuthProviders:
    """OAuth provider identifiers"""
    GOOGLE = 'google'


# ==================== EXPORT ALL CONFIGS ====================

# For backward compatibility and easy imports
__all__ = [
    'ChessConfig',
    'EngineConfig',
    'AIConfig',
    'AnalysisConfig',
    'GeminiConfig',
    'VisionConfig',
    'HTTPStatus',
    'ImageConfig',
    'ErrorMessages',
    'SuccessMessages',
    'OAuthProviders'
]
