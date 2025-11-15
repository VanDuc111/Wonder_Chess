import cv2
import os
import numpy as np

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_PROJECT_ID = os.getenv("ROBOFLOW_PROJECT_ID")
ROBOFLOW_VERSION = os.getenv("ROBOFLOW_VERSION")

# Kiểm tra đảm bảo các biến đã được tải (đây là thực hành tốt)
if not all([ROBOFLOW_API_KEY, ROBOFLOW_PROJECT_ID, ROBOFLOW_VERSION]):
    raise ValueError("Roboflow environment variables are not set!")

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


def _find_and_crop_board(img):
    """
    Tìm bàn cờ lớn nhất trong ảnh và cắt nó ra.
    """
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
    board_array = [["" for _ in range(8)] for _ in range(8)]  # mảng 8x8
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