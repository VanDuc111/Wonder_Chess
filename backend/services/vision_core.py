"""
Module xử lý hình ảnh liên quan đến bàn cờ
- Tìm góc bàn cờ trong ảnh
- Tính ma trận biến đổi phối cảnh (Homography)
- Ánh xạ điểm từ ảnh gốc sang tọa độ ô cờ
"""
import cv2
import numpy as np


def order_points(pts):
    """
    Sắp xếp 4 điểm góc theo thứ tự: 
    Trên-Trái, Trên-Phải, Dưới-Phải, Dưới-Trái
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # TL
    rect[2] = pts[np.argmax(s)]  # BR
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # TR
    rect[3] = pts[np.argmax(diff)]  # BL
    return rect


def find_board_corners(image):
    """
    Bước 1: Tìm 4 góc của bàn cờ sử dụng Canny Edge & Contours
    """
    # 1. Tiền xử lý (Xám -> Mờ -> Cạnh)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)

    # 2. Tìm đường bao (Contours)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Sắp xếp lấy contour lớn nhất (Giả định bàn cờ là vật thể to nhất)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    screen_cnt = None
    for c in contours:
        # Làm mượt đường bao
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        # Nếu đường bao có 4 điểm -> Khả năng cao là bàn cờ (hình chữ nhật)
        if len(approx) == 4:
            screen_cnt = approx
            break

    if screen_cnt is None:
        print("Không tìm thấy bàn cờ (Contours 4 cạnh)")
        return None

    # Trả về 4 điểm góc
    return screen_cnt.reshape(4, 2)


def get_board_mapping_matrix(corners, img_w, img_h):
    """
    Bước 2: Tính ma trận biến đổi từ ảnh nghiêng sang ảnh phẳng
    """
    rect = order_points(corners)

    # Kích thước ảnh đích (vuông)
    # Ta lấy max width/height để ảnh không bị méo
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    # Kích thước bàn cờ chuẩn (Vuông)
    side = max(maxWidth, maxHeight)

    # Tọa độ đích (Top-down view)
    dst = np.array([
        [0, 0],
        [side - 1, 0],
        [side - 1, side - 1],
        [0, side - 1]], dtype="float32")

    # Tính ma trận Homography
    M = cv2.getPerspectiveTransform(rect, dst)
    return M, side


def map_point_to_grid(x, y, M, side_len):
    """
    Bước 3: Ánh xạ 1 điểm (x,y) từ ảnh gốc sang tọa độ ô cờ (row, col)
    Sử dụng ma trận M đã tính được.
    """
    # Biến đổi điểm
    point_vector = np.array([[[x, y]]], dtype='float32')
    transformed_point = cv2.perspectiveTransform(point_vector, M)[0][0]

    tx, ty = transformed_point

    # Chia lưới
    sq_size = side_len / 8

    col = int(tx // sq_size)
    row = int(ty // sq_size)

    # Giới hạn trong 0-7
    row = max(0, min(7, row))
    col = max(0, min(7, col))

    return row, col
