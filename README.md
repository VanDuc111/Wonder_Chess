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

## PROJECT STRUCTURE

```
Wonder_Chess/
│
├── backend/                    # Backend - Server-side logic processing
│   ├── api/                    # API Routes - REST API endpoints
│   │   ├── main_routes.py      # Main routes (home, welcome)
│   │   ├── game_routes.py      # Game handling routes (moves, reset)
│   │   ├── analysis_routes.py  # Analysis routes (position evaluation, move suggestions)
│   │   └── image_routes.py     # Image processing routes (board digitization)
│   │
│   ├── engines/                # Chess Engines
│   │   ├── stockfish_engine.py # Stockfish engine integration
│   │   └── minimax.py          # Custom Minimax engine with Alpha-Beta pruning
│   │
│   └── services/               # Business Logic - Service layer
│       ├── gemini_service.py   # Google Gemini AI integration (Alice)
│       ├── image_to_fen.py     # Image to FEN conversion
│       ├── vision_core.py      # Computer vision core logic
│       └── piece_templates/    # Piece recognition templates
│
├── frontend/                   # Frontend - User interface
│   ├── static/                 # Static files
│   │   ├── css/                # Stylesheets
│   │   ├── js/                 # JavaScript files
│   │   ├── img/                # Images and assets
│   │   └── scss/               # SCSS source files
│   │
│   └── templates/              # HTML Templates
│       ├── index.html          # Main chess playing page
│       ├── welcome.html        # Welcome page
│       ├── learn.html          # Learning page
│       ├── openings.html       # Opening reference page
│       ├── layout.html         # Base layout template
│       ├── modals/             # Modal components
│       └── partials/           # Partial templates (header, footer, etc.)
│
├── tests/                      # Tests - Test documentation and test cases
│   ├── test_cases.md           # Project test cases
│   └── pgns.md                 # Sample PGN files for testing
│
├── run.py                      # Entry point - Application startup file
├── requirements.txt            # Dependencies - Python package list
├── render-build.sh             # Build script for Render deployment
└── README.md                   # Documentation guide
```

### Main Directory Descriptions:

- **`backend/`**: Contains all server-side logic, including API routes, chess engines, and business services
- **`frontend/`**: Contains the user interface with HTML templates, CSS, JavaScript, and static assets
- **`tests/`**: Contains test case documentation and sample data for testing the application
- **`backend/api/`**: Defines REST API endpoints for game, analysis, and image processing
- **`backend/engines/`**: Integrates chess engines (Stockfish and custom Minimax)
- **`backend/services/`**: Services handling AI, computer vision, and business logic
- **`frontend/static/`**: Static files (CSS, JS, images) for the interface
- **`frontend/templates/`**: HTML templates using Jinja2 template engine

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
