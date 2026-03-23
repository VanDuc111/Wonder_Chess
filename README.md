# WONDER CHESS - INTELLIGENT CHESS ASSISTANT SYSTEM

# Live Demo: [https://wonder-chess.onrender.com](https://wonder-chess.onrender.com/)

---

<div align="center">
  <img src="frontend/static/img/brand-logo.svg" width="120" alt="Logo">
  <h1>WONDER CHESS DIGITIZER</h1>
  <p><strong>Professional Chessboard Digitization & Strategic Analysis System</strong></p>
  <p>Powered by YOLOv8, OpenCV, and Generative AI</p>
</div>

---

## 🛠️ TECHNICAL OVERVIEW

Wonder Chess is an **end-to-end system** designed to digitize physical chessboards in real-time and provide strategic analysis. It bridges the gap between physical boards and digital analysis tools using high-performance computer vision and custom chess engines.

### 🚀 AI & Performance Highlights
- **Custom-trained YOLOv8 Model:** Trained on **4,800+ labeled images** (mixed real-world & digital).
- **High Precision:** Achieves **94.5% mAP50** and **93.8% Precision** in piece detection.
- **Extreme Optimization:** Optimized inference pipeline achieving **60+ FPS** (tested on NVIDIA T4), ensuring a seamless live experience.
- **Real-time Pipeline:** Proprietary vision pipeline converting live video feeds into FEN format with layout stability algorithms.

---

## 🌟 KEY FEATURES

### 1. High-Precision Board Digitization
- **Real-time Scanning:** Converts physical 3D board states into 2D digital FEN notation instantly via webcam.
- **Screenshot Processing:** Digitizes screenshots from any online chess platform with pixel-perfect accuracy.
- **Automatic Perspective Correction:** Robust corner detection and polygon transformation for various camera angles.

### 2. Strategic Analysis Engine
- **Engine Orchestration:** Integrated with **Stockfish (WASM/Local)** and a custom-built **Alpha-Beta Minimax** engine.
- **Move Annotation:** Classifies moves (Brilliant, Best, Blunder, etc.) using deep position evaluation.
- **Dynamic Eval Bar:** Real-time visual feedback on the positional advantage.

### 3. AI Assistant (Alice)
- **NLP Explanations:** Powered by **Google Gemini API**, providing natural language strategic advice.
- **Context-Aware Coaching:** Alice understands the current game phase and offers plans based on positional threats.

---

## 💻 TECHNOLOGY STACK

- **Architecture:** Microservices-driven (Modular AI/Vision backend + High-performance UI)
- **Core Frontend:** Modular ES6+ JavaScript (Clean, dependency-minimized component architecture)
- **Client-Side High Performance:** **WebAssembly (WASM)** integration for in-browser Stockfish 16 execution (30M+ nodes/sec)
- **AI/CV Backend:** Python 3.10+, YOLOv8 (PyTorch), OpenCV, NumPy
- **NLP Orchestration:** Google Gemini Pro API / NLP-driven strategic commentary
- **Styling & UX:** Custom **SCSS Design System** (Glassmorphism, CSS Variables, Responsive Grid)
- **Engines:** Stockfish 16.1 (WASM/Local), Custom Alpha-Beta Minimax


## PROJECT STRUCTURE

```
Wonder_Chess/
│
├── backend/                    # Backend - Python/Flask Server
│   ├── api/                    # REST API Endpoints (Game, Analysis, Vision, Auth)
│   ├── engines/                # Local Engine Binaries & Wrappers
│   ├── services/               # Core Logic (AI, Vision, Engine Services)
│   ├── models/                 # AI Training Models (pt, onnx)
│   ├── config.py               # Application Config
│   └── models.py               # Database Models (SQLAlchemy)
│
├── frontend/                   # Frontend - UI/UX Layer
│   ├── static/                 # Modern SCSS, JS Modules, Assets
│   └── templates/              # Jinja2 HTML Templates (Modals/Partials)
│
├── run.py                      # Application Entry Point
├── requirements.txt            # Python Dependencies
└── README.md                   # Documentation
```

### Module Descriptions:

- **`backend/api/`**: Orchestrates the communication between the UI and server services.
- **`backend/services/`**: The brain of the project, containing high-level logic for AI, Vision, and Game Processing.
- **`backend/engines/`**: Low-level chess engine implementations and binary wrappers.
- **`frontend/static/`**: Contains the "Modern Dark" design system with modular SCSS and JS core.
- **`frontend/templates/`**: Organized structure for clean component-based rendering.


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
   The project uses custom-trained local models (located in `backend/models/`). You only need a **Google Gemini API Key** for the AI Assistant:
   Create a `.env` file in the root directory:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
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
