import cv2
import numpy as np
from roboflow import Roboflow
import os
from dotenv import load_dotenv


try:
    from backend.services.vision_core import find_board_corners, get_board_mapping_matrix, map_point_to_grid
except ImportError:
    from vision_core import find_board_corners, get_board_mapping_matrix, map_point_to_grid

load_dotenv()

# --- CẤU HÌNH ---
API_KEY = os.getenv("ROBOFLOW_API_KEY")
MODEL_ID = os.getenv("ROBOFLOW_PROJECT_ID")

try:
    MODEL_VERSION = int(os.getenv("ROBOFLOW_VERSION", 1))
except:
    MODEL_VERSION = 1

CLASS_TO_FEN = {
    # Quân Đen
    "bp": "p", "br": "r", "bn": "n", "bb": "b", "bq": "q", "bk": "k",
    "black-pawn": "p", "black-rook": "r", "black-knight": "n", "black-bishop": "b", "black-queen": "q", "black-king": "k",
    "bP": "p", "bR": "r", "bN": "n", "bB": "b", "bQ": "q", "bK": "k",
    
    # Quân Trắng
    "wp": "P", "wr": "R", "wn": "N", "wb": "B", "wq": "Q", "wk": "K",
    "white-pawn": "P", "white-rook": "R", "white-knight": "N", "white-bishop": "B", "white-queen": "Q", "white-king": "K",
    "wP": "P", "wR": "R", "wN": "N", "wB": "B", "wQ": "Q", "wK": "K"
}

def analyze_image_to_fen(image_path):
    """
    Hàm chính: Nhận diện bàn cờ 3D và trả về FEN.
    """
    print(f"--- Đang phân tích ảnh: {image_path} ---")

    # 1. Đọc ảnh và Resize nếu quá lớn (Tránh lỗi 413)
    img = cv2.imread(image_path)
    if img is None:
        return None, "Lỗi đọc ảnh."
    
    h, w = img.shape[:2]
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h))
        # Ghi đè ảnh tạm để gửi lên Roboflow
        cv2.imwrite(image_path, img)
        h, w = new_h, new_w

    # 2. Gọi Roboflow (AI Detect)
    try:
        if not API_KEY or not MODEL_ID:
            return None, "Thiếu cấu hình Roboflow API Key hoặc Project ID."

        rf = Roboflow(api_key=API_KEY)
        project = rf.workspace().project(MODEL_ID)
        model = project.version(MODEL_VERSION).model

        prediction = model.predict(image_path, confidence=30, overlap=30).json()
        predictions = prediction.get("predictions", [])
        
        if not predictions:
            return None, "AI không tìm thấy quân cờ."

    except Exception as e:
        return None, f"Lỗi kết nối Roboflow: {str(e)}"

    # 3. Xử lý hình học

    corners = find_board_corners(img)
    
    use_perspective = False
    M = None
    side_len = 0
    
    if corners is not None:
        detected_width = np.linalg.norm(corners[0] - corners[1])
        if detected_width < w *0.4:
            corners = None
        else:
            use_perspective = True
            M, side_len = get_board_mapping_matrix(corners, w, h)

    if not use_perspective:

        all_x = [p['x'] for p in predictions]
        all_y = [p['y'] for p in predictions]
        margin = 60
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)
        board_w = (max_x - min_x) + (margin * 2)


        board_size = board_w

        board_x1 = max(0, min_x - margin)
        board_y1 = max(0, min_y - margin)

        board_h = board_size

        sq_w = board_size / 8
        sq_h = board_size / 8

        # 4. MAPPING
    board_grid = [["1" for _ in range(8)] for _ in range(8)]
    
    for p in predictions:
        class_name = p["class"]
        
        # Lấy điểm CHÂN (Bottom Center) của quân cờ
        # Vì trong ảnh 3D, chân quân cờ mới là vị trí thực tế trên bàn cờ
        foot_x = p["x"]
        foot_y = p["y"] + (p["height"] / 2) 

        row, col = -1, -1

        if use_perspective:
            # Dùng ma trận Homography để map điểm 3D -> 2D
            row, col = map_point_to_grid(foot_x, foot_y, M, side_len)
        else:
            # Dùng lưới chữ nhật đơn giản (Fallback)
            rel_x = foot_x - board_x1
            rel_y = foot_y - board_y1
            col = int(rel_x // sq_w)
            row = int(rel_y // sq_h)
            row = max(0, min(7, row))
            col = max(0, min(7, col))

        # Tìm ký tự FEN
        fen_char = '?'
        # Check case-insensitive
        for k, v in CLASS_TO_FEN.items():
            if k.lower() == class_name.lower():
                fen_char = v
                break
        
        if fen_char != '?':
            board_grid[row][col] = fen_char

    # 5. Tạo chuỗi FEN cuối cùng
    fen_rows = []
    for row in board_grid:
        empty = 0
        line = ""
        for cell in row:
            if cell == "1": empty += 1
            else:
                if empty > 0: line += str(empty); empty = 0
                line += cell
        if empty > 0: line += str(empty)
        fen_rows.append(line)
        
    final_fen = "/".join(fen_rows) + " w KQkq - 0 1"
    
    return final_fen, None