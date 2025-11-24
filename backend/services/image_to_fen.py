import cv2
import os
from typing import List, Dict, Any
import requests
import tempfile

# Roboflow configuration (optional). If not provided, code falls back to template matching.
# NOTE: previously these were read once at import time. To avoid stale/placeholder values
# (e.g., when .env is loaded later or process env differs), we now read env vars on demand
# via _get_roboflow_config().
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_PROJECT_ID = os.getenv("ROBOFLOW_PROJECT_ID")
ROBOFLOW_VERSION = os.getenv("ROBOFLOW_VERSION")

# Legacy flag (kept for backward compat) but we won't rely on its static value.
USE_ROBOFLOW = all([ROBOFLOW_API_KEY, ROBOFLOW_PROJECT_ID, ROBOFLOW_VERSION])

# Giả định kích thước chuẩn mà chúng ta sẽ resize ảnh về
# Kích thước này giúp việc khớp mẫu (template matching) ổn định
STANDARD_BOARD_SIZE = 640
SQUARE_SIZE = STANDARD_BOARD_SIZE // 8  # 80px
PIECE_NAMES = ['bP', 'bK', 'bN', 'bQ', 'bR', 'bB', 'wP', 'wK', 'wN', 'wQ', 'wR', 'wB']

# Ánh xạ tên file (template) sang ký tự FEN
PIECE_TO_FEN = {
    'bP': 'p', 'bK': 'k', 'bN': 'n', 'bQ': 'q', 'bR': 'r', 'bB': 'b',
    'wP': 'P', 'wK': 'K', 'wN': 'N', 'wQ': 'Q', 'wR': 'R', 'wB': 'B',
}


def _get_roboflow_config() -> Dict[str, object]:
    """Đọc cấu hình Roboflow từ biến môi trường tại thời điểm gọi.

    Trả về dict chứa: api_key, project_id, version, use (bool).
    """
    api_key = os.getenv('ROBOFLOW_API_KEY')
    project = os.getenv('ROBOFLOW_PROJECT_ID')
    version = os.getenv('ROBOFLOW_VERSION')
    use = all([api_key, project, version])
    return {'api_key': api_key, 'project': project, 'version': version, 'use': use}


def _load_templates():
    """Tải 12 ảnh mẫu quân cờ và resize chúng."""
    templates = {}
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(base_dir, 'piece_templates')

    for piece_name in PIECE_NAMES:
        path = os.path.join(template_dir, f"{piece_name}.png")
        if not os.path.exists(path):
            print(f"Cảnh báo: Không tìm thấy file template: {path}")
            continue

        # Đọc ảnh template (bao gồm cả kênh alpha - trong suốt)
        template = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if template is None:
            print(f"Lỗi: Không thể đọc file: {path}")
            continue

        # Resize template để phù hợp với kích thước ô cờ (ví dụ: 45x45)
        # (Để lại 1 chút viền, không nên để 50x50)
        template_resized = cv2.resize(template, (SQUARE_SIZE - 5, SQUARE_SIZE - 5))
        templates[piece_name] = template_resized

    return templates


# Tải templates một lần duy nhất khi module được import
TEMPLATES = _load_templates()
TEMPLATE_MATCH_THRESHOLD = 0.8


def _roboflow_detect(image_path: str) -> List[Dict]:
    """
    Gọi Roboflow detect endpoint và trả về danh sách predictions.
    Mỗi prediction thường có keys: 'x','y','width','height','confidence','class'
    """
    cfg = _get_roboflow_config()
    if not cfg['use']:
        return []

    # debug: in ra project/version (không in full api key) để kiểm tra
    try:
        short_key = (cfg['api_key'][:4] + '...' + cfg['api_key'][-4:]) if cfg['api_key'] else None
    except Exception:
        short_key = None
    print(f"Roboflow request -> project={cfg['project']} version={cfg['version']} api_key={short_key}")

    url = f"https://detect.roboflow.com/{cfg['project']}/{cfg['version']}"
    params = {"api_key": cfg['api_key'], "format": "json"}

    with open(image_path, "rb") as fp:
        files = {"file": fp}
        try:
            resp = requests.post(url, params=params, files=files, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("predictions", [])
        except Exception as e:
            # Không làm crash toàn bộ pipeline vì Roboflow có thể không có sẵn
            print(f"Roboflow detection failed: {e}")
            return []


def _find_and_crop_board(img):
    """
    Tìm bàn cờ lớn nhất trong ảnh và cắt nó ra.
    """
    # Nếu có Roboflow, thử phát hiện bounding box bàn cờ trước
    cfg = _get_roboflow_config()
    if cfg['use']:
        try:
            # Lưu tạm ảnh vào file để gọi Roboflow
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
                tmp_path = tf.name
            cv2.imwrite(tmp_path, img)
            preds = _roboflow_detect(tmp_path)
            # Xóa file tạm ngay
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

            # Tìm lớp board hoặc chessboard
            board_preds = [p for p in preds if p.get('class', '').lower() in ('board', 'chessboard', 'chess_board')]
            if board_preds:
                # Chọn prediction có confidence cao nhất
                best = max(board_preds, key=lambda p: p.get('confidence', 0))
                x_c = best.get('x')
                y_c = best.get('y')
                w = best.get('width')
                h = best.get('height')

                if None not in (x_c, y_c, w, h):
                    ih, iw = img.shape[:2]
                    left = int(x_c - w / 2)
                    top = int(y_c - h / 2)
                    right = int(x_c + w / 2)
                    bottom = int(y_c + h / 2)

                    # Clip to image bounds
                    left = max(0, left)
                    top = max(0, top)
                    right = min(iw, right)
                    bottom = min(ih, bottom)

                    if right - left > 10 and bottom - top > 10:
                        return img[top:bottom, left:right]
        except Exception as e:
            print(f"Roboflow board detection error: {e}")

    # 1. Chuyển sang ảnh xám và làm mờ
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # 2. Phát hiện cạnh (Canny)
    edges = cv2.Canny(blur, 50, 150)

    # 3. Tìm các đường viền (contours)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 4. Sắp xếp các đường viền theo diện tích, từ lớn đến nhỏ
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    found_board_contour = None

    # 5. Lặp qua các đường viền để tìm hình 4 cạnh
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        # 0.02 * peri là một giá trị epsilon phổ biến để xấp xỉ hình dạng
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            # Tìm thấy một hình tứ giác. Giả định đây là bàn cờ.
            found_board_contour = approx
            break  # Dừng lại ngay khi tìm thấy

    if found_board_contour is None:
        # Nếu không tìm thấy, có thể toàn bộ ảnh là bàn cờ (trường hợp cũ)
        print("Không tìm thấy đường viền 4 cạnh, giả định toàn bộ ảnh là bàn cờ.")
        return img  # Trả về ảnh gốc

    # 6. Cắt (Crop) bàn cờ ra khỏi ảnh gốc
    x, y, w, h = cv2.boundingRect(found_board_contour)
    cropped_board = img[y:y + h, x:x + w]

    return cropped_board

def get_fen_from_image(image_path):
    """
    Chức năng chính: Chuyển đổi file ảnh bàn cờ 2D thành chuỗi FEN.
    """

    # 1. Đọc và resize ảnh của người dùng
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Không thể đọc file ảnh.")

    cropped_board = _find_and_crop_board(img)

    # Khởi tạo mảng 8x8 với ký tự '1' nghĩa là trống
    board_array = [["1" for _ in range(8)] for _ in range(8)]

    # Nếu Roboflow khả dụng, thử dùng nó để phát hiện quân cờ
    cfg = _get_roboflow_config()
    if cfg['use']:
        try:
            ih, iw = cropped_board.shape[:2]
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
                tmp_board_path = tf.name
            cv2.imwrite(tmp_board_path, cropped_board)
            preds = _roboflow_detect(tmp_board_path)
            try:
                os.unlink(tmp_board_path)
            except Exception:
                pass

            if preds:
                # Chuẩn hoá tên lớp nếu cần
                def _normalize_class_name(cls_name: str) -> str:
                    if not cls_name:
                        return ""
                    s = cls_name.strip()
                    # Nếu người dùng đặt tên như 'wP' hoặc 'bK', giữ nguyên
                    if s in PIECE_TO_FEN:
                        return s
                    sl = s.lower()
                    color = 'w' if 'white' in sl or sl.startswith('w') else 'b' if 'black' in sl or sl.startswith('b') else None
                    # tìm loại quân
                    if 'pawn' in sl or sl.endswith('p'):
                        p = 'P'
                    elif 'king' in sl or sl.endswith('k'):
                        p = 'K'
                    elif 'queen' in sl or sl.endswith('q'):
                        p = 'Q'
                    elif 'rook' in sl or 'castle' in sl or sl.endswith('r'):
                        p = 'R'
                    elif 'bishop' in sl or sl.endswith('b'):
                        p = 'B'
                    elif 'knight' in sl or 'horse' in sl or sl.endswith('n') or 'kn' in sl:
                        p = 'N'
                    else:
                        p = None

                    if color and p:
                        return f"{color}{p}"
                    # fallback: try first two chars uppercase
                    return s[:2]

                # Nếu cần, resize board lên STANDARD_BOARD_SIZE để mapping dễ dàng
                board_resized = cv2.resize(cropped_board, (STANDARD_BOARD_SIZE, STANDARD_BOARD_SIZE))
                scale_x = STANDARD_BOARD_SIZE / float(iw) if iw else 1.0
                scale_y = STANDARD_BOARD_SIZE / float(ih) if ih else 1.0

                # Keep best prediction per square by confidence
                square_best = {}

                for p in preds:
                    cls = _normalize_class_name(p.get('class', ''))
                    if not cls:
                        continue
                    # coordinates from Roboflow are center-based
                    x = p.get('x')
                    y = p.get('y')
                    conf = p.get('confidence', 0)
                    # width/height may be available but not needed for mapping to square
                    if x is None or y is None:
                        continue

                    # scale to resized board
                    x_s = x * scale_x
                    y_s = y * scale_y

                    col = int(x_s // SQUARE_SIZE)
                    row = int(y_s // SQUARE_SIZE)

                    if not (0 <= col < 8 and 0 <= row < 8):
                        continue

                    key = (row, col)
                    prev = square_best.get(key)
                    if prev is None or conf > prev['conf']:
                        square_best[key] = {'conf': conf, 'cls': cls}

                # Fill board_array with detections
                for (row, col), info in square_best.items():
                    cls = info['cls']
                    if cls in PIECE_TO_FEN:
                        board_array[row][col] = PIECE_TO_FEN[cls]
                    else:
                        # try to map two-char code
                        if len(cls) == 2 and cls[0] in ('w', 'b'):
                            board_array[row][col] = PIECE_TO_FEN.get(cls, '1')

                return _convert_array_to_fen(board_array)
        except Exception as e:
            print(f"Roboflow piece detection error: {e}")

    # Nếu không có Roboflow hoặc detections rỗng, dùng template matching hiện tại
    img_resized = cv2.resize(cropped_board, (STANDARD_BOARD_SIZE, STANDARD_BOARD_SIZE))

    # 2. Lặp qua 64 ô
    for r in range(8):
        for c in range(8):
            # Cắt ô cờ
            y1, y2 = r * SQUARE_SIZE, (r + 1) * SQUARE_SIZE
            x1, x2 = c * SQUARE_SIZE, (c + 1) * SQUARE_SIZE
            square_roi = img_resized[y1:y2, x1:x2]

            best_match_score = TEMPLATE_MATCH_THRESHOLD
            best_match_piece = None

            # 3. So sánh ô cờ với 12 ảnh mẫu
            for piece_name, template in TEMPLATES.items():

                # Tách kênh alpha (độ trong suốt) làm mặt nạ (mask)
                # Điều này giúp nhận diện quân cờ PNG trong suốt
                template_bgr = template[:, :, :3]
                mask = None

                if template.shape[2] == 4:
                    mask = template[:, :, 3]

                res = cv2.matchTemplate(square_roi, template_bgr, cv2.TM_CCOEFF_NORMED, mask=mask)
                _, max_val, _, _ = cv2.minMaxLoc(res)

                if max_val > best_match_score:
                    best_match_score = max_val
                    best_match_piece = piece_name

            # 4. Gán quân cờ vào mảng
            if best_match_piece:
                board_array[r][c] = PIECE_TO_FEN[best_match_piece]
            else:
                board_array[r][c] = "1"  # Ký tự trống

    # 5. Chuyển đổi mảng 8x8 thành FEN
    return _convert_array_to_fen(board_array)


def _convert_array_to_fen(board):
    """Chuyển đổi mảng 8x8 (ví dụ: [['r', 'n'], ['1', '1']]) thành FEN."""
    fen = ""
    for r in range(8):
        empty_count = 0
        for c in range(8):
            piece = board[r][c]
            if piece == "1":
                empty_count += 1
            else:
                if empty_count > 0:
                    fen += str(empty_count)
                    empty_count = 0
                fen += piece
        if empty_count > 0:
            fen += str(empty_count)
        if r < 7:
            fen += "/"

    # Hiện tại, chúng ta chỉ trả về phần thế cờ
    # (Bỏ qua lượt đi, quyền nhập thành, v.v.)
    return f"{fen} w KQkq - 0 1"