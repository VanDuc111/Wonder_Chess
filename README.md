# WONDER CHESS - INTELLIGENT CHESS ASSISTANT SYSTEM

# Live Demo: [https://wonder-chess.onrender.com](https://wonder-chess.onrender.com/)

> **NOTE:** Since it uses a free Server (Render Free Tier), the site will go into "hibernation" mode if there is no access.
> **The first load may take about 50 seconds to start.** The subsequent requests will be significantly faster!

## GRADUATION THESIS PROJECT

This project represents a comprehensive software engineering effort to design and implement an advanced chess application. The primary objective is to demonstrate proficiency in algorithm design, system architecture optimization, and the integration of heterogeneous AI components.

---

## KEY FEATURES

### 1. Advanced Game Analysis

- **Real-time Evaluation:** A dynamic evaluation bar providing instant feedback on position advantage.
- **Best Move Suggestion:** Visual SVG arrows highlighting the engine's recommended move.
- **Move Annotations:** Automatically classifies moves as **Brilliant (!!)**, **Great (!)**, **Best**, **Good**, **Inaccurate**, **Mistake (?)**, or **Blunder (??)** based on deep evaluation differences.
- **Interactive History:** Navigate through moves using keyboard shortcuts or the vertical PGN list with persistent square highlighting.

### 2. Intelligent Opening Detection

- **Database of 3,000+ Openings:** Automatically identifies opening names and ECO codes in real-time.
- **Book Move Indicators:** Highlights moves that are part of standard opening theory using specific icons.

### 3. Multi-Engine Bot Play

- **Stockfish Integration:** Play against the world's strongest chess engine with adjustable skill levels (0-20).
- **Custom Minimax Engine:** Features a custom-built heuristic engine using Negamax with Alpha-Beta pruning, Zobrist hashing, and Transposition Tables.
- **Time Controls:** Supports various time formats including Blitz and Rapid.

### 4. Computer Vision (Digitization)

- **Webcam Sync:** digitize physical 3D chessboards into 2D digital states using real-time camera feeds.
- **Digital Screenshot Scan:** High-accuracy FEN recognition for digital board screenshots.
- **Hybrid Model:** Trained using Roboflow on both real-world and digital datasets for maximum robustness.

### 5. AI Assistant (Alice)

- **Generative Commentary:** Powered by **Google Gemini API**, Alice provides natural language explanations for the current position and suggestions.
- **Strategic Advice:** Ask Alice about specific threats, plans, or why a certain move was considered a blunder.

---

## TECHNOLOGY STACK

**Backend**

- **Language:** Python 3.8+
- **Framework:** Flask
- **Engines:** `python-chess`, Stockfish (WASM & local binary), Custom Minimax
- **Server:** Waitress (WSGI Production Server)

**Frontend**

- **Core:** JavaScript (ES6+), HTML5, CSS3 (Custom Responsive UI)
- **Libraries:** Chessboard.js, Chess.js, JQuery, Bootstrap 5

**AI & Computer Vision**

- **LLM:** Google Gemini Pro
- **Object Detection:** Roboflow / OpenCV

---

## CẤU TRÚC THƯ MỤC DỰ ÁN / PROJECT STRUCTURE

```
Wonder_Chess/
│
├── backend/                    # Backend - Xử lý logic phía server
│   ├── api/                    # API Routes - Các endpoint REST API
│   │   ├── main_routes.py      # Routes chính (trang chủ, welcome)
│   │   ├── game_routes.py      # Routes xử lý game (di chuyển, reset)
│   │   ├── analysis_routes.py  # Routes phân tích (đánh giá vị trí, gợi ý nước đi)
│   │   └── image_routes.py     # Routes xử lý hình ảnh (số hóa bàn cờ)
│   │
│   ├── engines/                # Chess Engines - Các engine cờ vua
│   │   ├── stockfish_engine.py # Tích hợp Stockfish engine
│   │   └── minimax.py          # Custom Minimax engine với Alpha-Beta pruning
│   │
│   └── services/               # Business Logic - Các service xử lý nghiệp vụ
│       ├── gemini_service.py   # Tích hợp Google Gemini AI (Alice)
│       ├── image_to_fen.py     # Chuyển đổi hình ảnh thành FEN
│       ├── vision_core.py      # Computer vision core logic
│       └── piece_templates/    # Templates nhận diện quân cờ
│
├── frontend/                   # Frontend - Giao diện người dùng
│   ├── static/                 # Static files
│   │   ├── css/                # Stylesheets
│   │   ├── js/                 # JavaScript files
│   │   ├── img/                # Images và assets
│   │   └── scss/               # SCSS source files
│   │
│   └── templates/              # HTML Templates
│       ├── index.html          # Trang chơi cờ chính
│       ├── welcome.html        # Trang chào mừng
│       ├── learn.html          # Trang học cờ
│       ├── openings.html       # Trang tra cứu khai cuộc
│       ├── layout.html         # Layout template chung
│       ├── modals/             # Modal components
│       └── partials/           # Partial templates (header, footer, etc.)
│
├── tests/                      # Tests - Tài liệu test và test cases
│   ├── test_cases.md           # Các test cases cho dự án
│   └── pgns.md                 # PGN files mẫu để test
│
├── run.py                      # Entry point - File chạy ứng dụng
├── requirements.txt            # Dependencies - Danh sách thư viện Python
├── render-build.sh             # Build script cho Render deployment
└── README.md                   # Tài liệu hướng dẫn
```

### Mô tả chi tiết các thư mục chính:

- **`backend/`**: Chứa toàn bộ logic xử lý phía server, bao gồm API routes, chess engines và các services nghiệp vụ
- **`frontend/`**: Chứa giao diện người dùng với HTML templates, CSS, JavaScript và các static assets
- **`tests/`**: Chứa tài liệu test cases và dữ liệu mẫu để kiểm thử ứng dụng
- **`backend/api/`**: Định nghĩa các REST API endpoints cho game, analysis và image processing
- **`backend/engines/`**: Tích hợp các chess engines (Stockfish và custom Minimax)
- **`backend/services/`**: Các services xử lý AI, computer vision và business logic
- **`frontend/static/`**: Files tĩnh (CSS, JS, images) phục vụ cho giao diện
- **`frontend/templates/`**: HTML templates sử dụng Jinja2 template engine

---

## INSTALLATION AND SETUP

### Prerequisites

- Python 3.8 or higher
- Git

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/VanDuc111/Wonder_Chess.git
   cd Wonder_Chess
   ```

2. **Create and Activate Virtual Environment**

   - **Windows:**
     ```bash
     python -m venv .venv
     .\.venv\Scripts\Activate
     ```
   - **macOS/Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Engine Configuration (Stockfish)**
   To use the local Stockfish engine, you must provide its executable:

   - Download the Stockfish binary from [stockfishchess.org](https://stockfishchess.org/download/).
   - Place the executable in the `backend/engines/` directory.
   - Rename it to `stockfish.exe` (Windows) or `stockfish` (Linux).

5. **Environment Configuration**
   Create a `.env` file in the root directory:

   ```env
   GEMINI_API_KEY=your_key_here

   ROBOFLOW_API_KEY=your_key_here
   ROBOFLOW_CHESS_PIECES_MODEL_ID=your_id_here
   ROBOFLOW_CHESS_PIECES_VERSION=1

   ROBOFLOW_BOARD_MODEL_ID=your_id_here
   ROBOFLOW_BOARD_VERSION=1
   ```

6. **Run the Application**
   ```bash
   python run.py
   ```
   Access the application at `http://localhost:5000`.

---

## AUTHOR

**Nguyễn Văn Đức**

- Role: Lead Developer / Researcher
- Contact: [ducca94tk@gmail.com]
- GitHub: [https://github.com/VanDuc111]
