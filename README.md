# WONDER CHESS - INTELLIGENT CHESS ASSISTANT SYSTEM

# Live Demo: [https://wonder-chess.onrender.com](https://wonder-chess.onrender.com/)

> ** NOTE: ** > Since it uses a free Server (Render Free Tier), the site will go into "hibernation" mode if there is no
access.

> **The first load may take about 50 seconds to start.** Hope you get the expected display, the next will be very fast!

## GRADUATION THESIS PROJECT

This project represents a comprehensive software engineering effort to design and implement an advanced chess
application. The primary objective is to demonstrate proficiency in algorithm design, system architecture optimization,
and the integration of heterogeneous AI components (Custom Heuristic Engine, Computer Vision, and Large Language
Models).

---

## PROJECT OVERVIEW

Wonder Chess serves as a bridge between traditional chess engines and modern interactive learning tools. Unlike standard
chess applications that rely on pre-compiled binaries (like Stockfish), this project features a chess engine built
entirely from scratch using Python, optimized for performance and accuracy.

Key functional modules include:

1. **Custom Chess Engine:** Handles move generation, validation, and position evaluation.
2. **Computer Vision Module:** Digitizes real-world physical chessboards via camera feeds in real-time.
3. **AI Assistant (Alice):** Provides natural language explanations for chess moves using Google Gemini API.

---

## CORE TECHNICAL CONTRIBUTIONS

### 1. Custom Python Chess Engine

A fully functional chess engine implemented in Python, focusing on algorithmic optimization.

* **Search Algorithm:** Implemented **Negamax** with **Alpha-Beta Pruning** to reduce the search space effectively.
* **State Management:** Utilized **Zobrist Hashing** (64-bit integer hashing) instead of string-based FEN for state
  representation, enabling O(1) complexity for state comparison.
* **Memory Optimization:** Implemented **Transposition Tables** to cache search results, preventing redundant
  calculations for recurring board states.
* **Heuristics & Evaluation:**
    * **Move Ordering:** Applied MVVLVA (Most Valuable Victim - Least Valuable Aggressor) to prioritize high-impact
      moves, improving Alpha-Beta cutoff rates.
    * **Quiescence Search:** Mitigated the "Horizon Effect" by extending search depth for dynamic positions (captures
      and checks).
    * **PeSTO Evaluation:** Integrated Piece-Square Tables and Tempo bonuses for accurate positional assessment.

### 2. Computer Vision & Real-time Analysis

A hybrid computer vision system capable of mapping 3D physical coordinates to a 2D digital representation.

* **Object Detection:** Utilized a custom-trained **Roboflow** model (Deep Learning) to identify chess pieces and their
  bounding boxes.
* **Geometric Processing:** Implemented classical Computer Vision techniques using **OpenCV**:
    * **Perspective Transform (Homography):** Corrects camera distortion and maps coordinates from an angled view to a
      top-down orthogonal view.
    * **Smart Grid Fallback:** An adaptive algorithm that calculates the chessboard grid based on piece clustering when
      the board edges are occluded.
* **Data Strategy:** The model is trained on a hybrid dataset containing both 3D real-world images and 2D digital
  screenshots to ensure robustness across different domains.

### 3. Generative AI Integration

* **Natural Language Processing:** Integrated **Google Gemini API** to act as a logic layer between the raw engine data
  and the user.
* **Contextual Analysis:** The system converts engine evaluations (e.g., "Score: +2.5, Best: Nf3") into instructional
  commentary (e.g., "White has a significant advantage due to central control. Developing the Knight to f3 prepares for
  castling...").

---

## PERFORMANCE BENCHMARKS

The following table illustrates the performance improvements achieved through algorithmic optimization (tested at Search
Depth 3 on complex middlegame positions):

| Metric | Initial Implementation | Optimized Version | Improvement |
| :--- | :--- | :--- | :--- |
| **Search Algorithm** | Minimax | **Negamax + Alpha-Beta** | Algorithmic Efficiency |
| **State Hashing** | String (FEN) | **Zobrist (Int64)** | Memory & Speed |
| **Execution Time** | ~18.5 seconds | **~0.6 seconds** | **~30x Faster** |
| **Search Stability** | Vulnerable to Horizon Effect | **Stable via Quiescence** | Accuracy |

---

## TECHNOLOGY STACK

**Backend**

* **Language:** Python 3.x
* **Framework:** Flask
* **Server:** Waitress (Multi-threaded WSGI production server)

**Frontend**

* **Core:** HTML5, CSS3, JavaScript (ES6+)
* **Libraries:** Chessboard.js (UI), Chess.js (Client-side validation), Bootstrap 5

**AI & Data**

* **Engine Logic:** `python-chess` (Move generation), `numpy`
* **Computer Vision:** `roboflow`, `opencv-python`
* **LLM:** Google Generative AI (Gemini)

---

## SYSTEM ARCHITECTURE

1. **Client Layer:** Handles user interaction, camera streaming, and board rendering.
2. **API Layer (Flask):** Routes requests for game logic, image analysis, and chat.
3. **Service Layer:**
    * *Engine Service:* Executes the Negamax algorithm.
    * *Vision Service:* Processes images to FEN strings.
    * *Chat Service:* Communicates with Gemini API.

---

## INSTALLATION AND SETUP

### Prerequisites

* Python 3.8 or higher
* Git

### Steps

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/your-username/wonder-chess.git](https://github.com/your-username/wonder-chess.git)
   cd wonder-chess
   ```

2. **Create and Activate Virtual Environment**
    * Windows:
        ```bash
        python -m venv .venv
        .\.venv\Scripts\Activate
        ```
    * macOS/Linux:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file in the root directory and configure the following keys:
   ```env
   GOOGLE_API_KEY=your_google_gemini_api_key
   ROBOFLOW_API_KEY=your_roboflow_private_key
   ROBOFLOW_PROJECT_ID=your_model_id
   ROBOFLOW_VERSION=2
   ```

5. **Run the Application**
   ```bash
   python run.py
   ```
   The server will start at `http://localhost:5000`.

---

## AUTHOR

**[Nguyễn Văn Đức]**

* Role: Lead Developer / Researcher
* Contact: [ducca94tk@gmail.com]
* GitHub: [https://github.com/VanDuc111]

