"""
Module chuyển ảnh bàn cờ 3D thành chuỗi FEN sử dụng Roboflow và OpenCV.
"""
import cv2
import numpy as np
from roboflow import Roboflow
import os
from dotenv import load_dotenv
import base64
import time
from datetime import datetime

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
    "bkn": "n", # Mã đen mới
    "black-pawn": "p", "black-rook": "r", "black-knight": "n", "black-bishop": "b", "black-queen": "q", "black-king": "k",
    "black_pawn": "p", "black_rook": "r", "black_knight": "n", "black_bishop": "b", "black_queen": "q", "black_king": "k",
    "bP": "p", "bR": "r", "bN": "n", "bB": "b", "bQ": "q", "bK": "k", "bKN": "n",

    # Quân Trắng
    "wp": "P", "wr": "R", "wn": "N", "wb": "B", "wq": "Q", "wk": "K",
    "wkn": "N", # Mã trắng mới
    "white-pawn": "P", "white-rook": "R", "white-knight": "N", "white-bishop": "B", "white-queen": "Q", "white-king": "K",
    "white_pawn": "P", "white_rook": "R", "white_knight": "N", "white_bishop": "B", "white_queen": "Q", "white_king": "K",
    "wP": "P", "wR": "R", "wN": "N", "wB": "B", "wQ": "Q", "wK": "K", "wKN": "N",

    # Các nhãn viết hoa/viết thường khác
    "Pawn": "P", "Rook": "R", "Knight": "N", "Bishop": "B", "Queen": "Q", "King": "K",
    "pawn": "p", "rook": "r", "knight": "n", "bishop": "b", "queen": "q", "king": "k"
}


def analyze_image_to_fen(image_path):
    """
    Hàm chính: Nhận diện bàn cờ 3D và trả về FEN.
    """
    print(f"--- Đang phân tích ảnh: {image_path} ---")

    # 1. Đọc ảnh và Resize nếu quá lớn (Tránh lỗi 413)
    img = cv2.imread(image_path)
    if img is None:
        return None, None, "Lỗi đọc ảnh."

    h, w = img.shape[:2]
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h))
        cv2.imwrite(image_path, img)
        h, w = new_h, new_w

    # 2. Gọi Roboflow (AI Detect)
    try:
        if not API_KEY or not MODEL_ID:
            return None, None, "Thiếu cấu hình Roboflow API Key hoặc Project ID."

        rf = Roboflow(api_key=API_KEY)
        project = rf.workspace().project(MODEL_ID)
        model = project.version(MODEL_VERSION).model

        prediction = model.predict(image_path, confidence=10, overlap=30).json()
        predictions = prediction.get("predictions", [])

        if not predictions:
            print(f"❌ Roboflow v{MODEL_VERSION} không tìm thấy kết quả.")
            return None, None, "AI không tìm thấy quân cờ hoặc bàn cờ."
        
        # Log detected classes
        print(f" Detected: {list(set([p['class'] for p in predictions]))}")

    except Exception as e:
        print(f"❌ Lỗi kết nối Roboflow: {str(e)}")
        return None, None, f"Lỗi kết nối Roboflow: {str(e)}"

    # Tách riêng quân cờ và bàn cờ
    piece_preds = []
    board_box = None

    BOARD_ALIASES = ['chessboard', 'board', 'chess-board', 'chess_board', 'table']
    for p in predictions:
        cls_name = p['class'].lower()
        if any(alias in cls_name for alias in BOARD_ALIASES):
            # Nếu tìm thấy nhiều bàn cờ, lấy cái có confidence cao nhất hoặc to nhất
            if board_box is None or p['confidence'] > board_box['confidence']:
                board_box = p
        else:
            piece_preds.append(p)

    # Biến lưu tọa độ cắt (Offset)
    offset_x = 0
    offset_y = 0

    # Khởi tạo các biến hình học để dùng chung
    corners = None
    use_perspective = False
    M = None
    side_len = 0
    board_x1, board_y1, board_size, sq_w, sq_h = 0, 0, 0, 0, 0
    is_2d_mode = False

    if board_box:
        print(f"✅ Phát hiện bàn cờ (Confidence: {board_box['confidence']:.2f}) -> Đang cắt ảnh...")

        # Tính tọa độ cắt (Bounding Box của class chessboard)
        bx, by = board_box['x'], board_box['y']
        bw, bh = board_box['width'], board_box['height']

        x1 = int(bx - bw / 2)
        y1 = int(by - bh / 2)
        x2 = int(bx + bw / 2)
        y2 = int(by + bh / 2)

        # --- SỬA LỖI AN TOÀN (SAFE CROP) ---
        # 1. Giới hạn tọa độ trong khung hình (Clamp)
        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(x1 + 1, min(x2, w))  # Đảm bảo x2 luôn lớn hơn x1 ít nhất 1px
        y2 = max(y1 + 1, min(y2, h))  # Đảm bảo y2 luôn lớn hơn y1 ít nhất 1px

        # 2. Kiểm tra kích thước vùng cắt hợp lệ
        crop_w = x2 - x1
        crop_h = y2 - y1

        if crop_w > 10 and crop_h > 10:  
            try:
                # Thêm padding 5% để OpenCV dễ tìm góc viền bàn cờ hơn
                pad_w = int(crop_w * 0.05)
                pad_h = int(crop_h * 0.05)
                
                # Tính toán tọa độ cắt mới có lề
                nx1 = max(0, x1 - pad_w)
                ny1 = max(0, y1 - pad_h)
                nx2 = min(w, x2 + pad_w)
                ny2 = min(h, y2 + pad_h)

                img_crop = img[ny1:ny2, nx1:nx2]
                if img_crop.size > 0:
                    img = img_crop
                    offset_x = nx1
                    offset_y = ny1
                    h, w = img.shape[:2]

                    # --- KHỞI TẠO GÓC TỪ ROBOLOW (AI) ---
                    # Tính toán tọa độ 4 góc của bàn cờ so với ảnh đã bị cắt (có padding)
                    # Điều này giúp ta luôn có "khung xương" bàn cờ kể cả khi OpenCV thất bại
                    ai_x1 = pad_w
                    ai_y1 = pad_h
                    ai_x2 = w - pad_w
                    ai_y2 = h - pad_h
                    corners = np.array([
                        [ai_x1, ai_y1], [ai_x2, ai_y1], 
                        [ai_x2, ai_y2], [ai_x1, ai_y2]
                    ], dtype="float32")
                    use_perspective = True
                    M, side_len = get_board_mapping_matrix(corners, w, h)

                    # --- NHẬN DIỆN CHẾ ĐỘ 2D/SCREENSHOT ---
                    aspect_ratio = (x2 - x1) / (y2 - y1)
                    if 0.92 < aspect_ratio < 1.08 and board_box['confidence'] > 0.7:
                        print(f"💡 Chế độ: Bàn cờ 2D/Screenshot (Aspect: {aspect_ratio:.2f}).")
                        is_2d_mode = True
                        # Khử lề 2% cho 2D để bỏ qua nhãn tọa độ
                        m_w, m_h = w * 0.02, h * 0.02
                        corners = np.array([
                            [m_w, m_h], [w - m_w, m_h], 
                            [w - m_w, h - m_h], [m_w, h - m_h]
                        ], dtype="float32")
                        M, side_len = get_board_mapping_matrix(corners, w, h)
                    else:
                        print(f"💡 Chế độ: Bàn cờ 3D/Ảnh thực tế (Aspect: {aspect_ratio:.2f}).")
                        is_2d_mode = False

                    # Dịch chuyển tọa độ quân cờ về hệ tọa độ ảnh cắt
                    for p in piece_preds:
                        p['x'] -= offset_x
                        p['y'] -= offset_y

            except Exception as e:
                print(f"⚠️ Lỗi khi cắt ảnh (OpenCV): {e}. Dùng ảnh gốc.")
        else:
            print(f"⚠️ Vùng bàn cờ quá nhỏ ({crop_w}x{crop_h}). Dùng ảnh gốc.")

    else:
        print("⚠️ Không tìm thấy class 'chessboard'. Dùng toàn bộ ảnh.")

    # 3. Xử lý hình học

    # --- XỬ LÝ HÌNH HỌC (Tinh chỉnh góc bằng OpenCV) ---
    if not is_2d_mode:
        # Thử tìm góc chính xác hơn bằng OpenCV
        refined_corners = find_board_corners(img)
        
        if refined_corners is not None:
            detected_width = np.linalg.norm(refined_corners[0] - refined_corners[1])
            if detected_width > w * 0.5:
                from backend.services.vision_core import is_quad_too_distorted
                if not is_quad_too_distorted(refined_corners):
                    print("✅ OpenCV tinh chỉnh được góc bàn cờ.")
                    corners = refined_corners
                    M, side_len = get_board_mapping_matrix(corners, w, h)
                else:
                    print("⚠️ Góc OpenCV quá méo, giữ nguyên khung AI.")
        else:
            print("⚠️ OpenCV không tìm thấy góc, sử dụng khung bàn cờ từ AI.")

    # Nếu hoàn toàn không có thông tin góc (Trường hợp AI & OpenCV đều thất bại)
    if not use_perspective:
        if not is_2d_mode:
            print("💡 Fallback 3D: Dùng lưới nội bộ (trừ lề lấn background).")
            # Padding 10% để chắc chắn loại bỏ phần nền gỗ bị AI bắt nhầm
            board_x1 = w * 0.1
            board_y1 = h * 0.1
            board_size = w * 0.8
            sq_w = board_size / 8
            sq_h = board_size / 8
            corners = np.array([
                [board_x1, board_y1], [board_x1 + board_size, board_y1], 
                [board_x1 + board_size, board_y1 + board_size], [board_x1, board_y1 + board_size]
            ], dtype="float32")
        else:
            print("💡 Fallback 2D: Lưới toàn khung.")
            board_x1, board_y1 = 0, 0
            board_size = w
            sq_w, sq_h = w / 8, h / 8
            corners = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype="float32")

    # 4. MAPPING (Sử dụng dict để quản lý xung đột ô cờ)
    # Cấu trúc: { (row, col): { 'char': 'P', 'conf': 0.9 } }
    occupied_squares = {}
    
    board_grid = [["1" for _ in range(8)] for _ in range(8)]
    debug_img = img.copy()

    # --- VẼ KHUNG VÀ LƯỚI BÀN CỜ ---
    if corners is not None:
        # 1. Vẽ khung bàn cờ (Boundary) - Màu xanh Neon
        cv2.polylines(debug_img, [corners.astype(int)], True, (0, 255, 0), 3)

        # 2. Vẽ lưới 8x8
        if use_perspective and M is not None:
            try:
                M_inv = np.linalg.inv(M)
                sq_size = side_len / 8
                for i in range(1, 8): # Chỉ vẽ các đường bên trong (1-7)
                    # Đường Ngang
                    p1 = np.array([[[0, i * sq_size]]], dtype='float32')
                    p2 = np.array([[[side_len, i * sq_size]]], dtype='float32')
                    tp1 = cv2.perspectiveTransform(p1, M_inv)[0][0]
                    tp2 = cv2.perspectiveTransform(p2, M_inv)[0][0]
                    cv2.line(debug_img, tuple(tp1.astype(int)), tuple(tp2.astype(int)), (0, 255, 0), 1)
                    
                    # Đường Dọc
                    p3 = np.array([[[i * sq_size, 0]]], dtype='float32')
                    p4 = np.array([[[i * sq_size, side_len]]], dtype='float32')
                    tp3 = cv2.perspectiveTransform(p3, M_inv)[0][0]
                    tp4 = cv2.perspectiveTransform(p4, M_inv)[0][0]
                    cv2.line(debug_img, tuple(tp3.astype(int)), tuple(tp4.astype(int)), (0, 255, 0), 1)
            except Exception as e:
                print(f"⚠️ Lỗi khi vẽ lưới grid: {e}")
        elif not use_perspective:
            # Fallback grid cho trường hợp không có perspective
            for i in range(1, 8):
                # Ngang
                cv2.line(debug_img, (int(board_x1), int(board_y1 + i * sq_h)), 
                         (int(board_x1 + board_size), int(board_y1 + i * sq_h)), (0, 255, 0), 1)
                # Dọc
                cv2.line(debug_img, (int(board_x1 + i * sq_w), int(board_y1)), 
                         (int(board_x1 + i * sq_w), int(board_y1 + board_size)), (0, 255, 0), 1)

    for p in piece_preds:
        class_name = p["class"]
        conf = p.get("confidence", 0)

        # Lấy điểm quy chiếu để xác định ô cờ
        if is_2d_mode:
            # Ảnh 2D dùng tâm (Center)
            ref_x = p["x"]
            ref_y = p["y"]
        else:
            # Ảnh 3D dùng chân (Bottom)
            ref_x = p["x"]
            ref_y = p["y"] + (p["height"] / 2) * 0.9 
        
        row, col = -1, -1

        if use_perspective:
            row, col = map_point_to_grid(ref_x, ref_y, M, side_len)
        else:
            rel_x = ref_x - board_x1
            rel_y = ref_y - board_y1
            col = int(rel_x // sq_w)
            row = int(rel_y // sq_h)
            row = max(0, min(7, row))
            col = max(0, min(7, col))

        # Tìm ký tự FEN
        fen_char = '?'
        for k, v in CLASS_TO_FEN.items():
            if k.lower() == class_name.lower():
                fen_char = v
                break

        if fen_char != '?':
            # LOGIC XỬ LÝ XUNG ĐỘT Ô CỜ
            pos = (row, col)
            is_king = fen_char.lower() == 'k'
            
            should_place = False
            if pos not in occupied_squares:
                should_place = True
            else:
                existing_char = occupied_squares[pos]['char']
                existing_conf = occupied_squares[pos]['conf']
                existing_is_king = existing_char.lower() == 'k'
                
                # 1. Quân Vua cũ luôn thắng (trừ khi quân mới cũng là vua và conf cao hơn)
                if existing_is_king and not is_king:
                    should_place = False
                # 2. Quân Vua mới thắng quân thường cũ
                elif is_king and not existing_is_king:
                    should_place = True
                # 3. Cùng loại (Vua-Vua hoặc Thường-Thường) -> Thắng nhờ Confidence
                elif conf > existing_conf:
                    should_place = True
            
            if should_place:
                occupied_squares[pos] = {'char': fen_char, 'conf': conf}
                board_grid[row][col] = fen_char
                print(f"  - Mapped {class_name} ({fen_char}) to [r:{row}, c:{col}] (Conf: {conf:.2f})")
            else:
                print(f"  - ⚠️ Skipped {class_name} at [r:{row}, c:{col}] - overlap with higher priority {occupied_squares[pos]['char']}")
        else:
            print(f"  - ⚠️ Unsupported piece class: {class_name}")

        x, y = int(p['x']), int(p['y'])
        w_p, h_p = int(p['width']), int(p['height'])

        # Vẽ Box đỏ
        top_left = (int(x - w_p / 2), int(y - h_p / 2))
        bottom_right = (int(x + w_p / 2), int(y + h_p / 2))
        cv2.rectangle(debug_img, top_left, bottom_right, (0, 0, 255), 2)

        # Vẽ tâm vàng
        cv2.circle(debug_img, (x, y), 3, (0, 255, 255), -1)

        # Thêm nhãn class
        cv2.putText(debug_img, class_name, (top_left[0], top_left[1] - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

    # --- LƯU ẢNH DEBUG VÀO FILE ---
    try:
        debug_dir = os.path.join("tests", "debug_results")
        if not os.path.exists(debug_dir):
            os.makedirs(debug_dir)
        
        # 1. Lưu ảnh hiện tại
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        debug_filename = f"debug_{timestamp}.jpg"
        debug_path = os.path.join(debug_dir, debug_filename)
        cv2.imwrite(debug_path, debug_img)
        print(f" Đã lưu ảnh debug: {debug_path}")

        # 2. Dọn dẹp ảnh cũ (> 24h)
        now = time.time()
        for f in os.listdir(debug_dir):
            f_path = os.path.join(debug_dir, f)
            if os.path.isfile(f_path) and now - os.path.getmtime(f_path) > 86400: # 24h
                os.remove(f_path)
                print(f" Đã xóa ảnh debug cũ: {f}")
    except Exception as e:
        print(f"⚠️ Lỗi khi lưu/dọn dẹp ảnh debug: {e}")

        # 4. Mã hóa ảnh thành Base64 để gửi qua JSON
    _, buffer = cv2.imencode('.jpg', debug_img)
    debug_base64 = base64.b64encode(buffer).decode('utf-8')

    # 5. Tạo chuỗi FEN cuối cùng
    fen_rows = []
    for row in board_grid:
        empty = 0
        line = ""
        for cell in row:
            if cell == "1":
                empty += 1
            else:
                if empty > 0: line += str(empty); empty = 0
                line += cell
        if empty > 0: line += str(empty)
        fen_rows.append(line)

    final_fen = "/".join(fen_rows) + " w KQkq - 0 1"
    print(f" Final FEN: {final_fen}")

    return final_fen, debug_base64, None
