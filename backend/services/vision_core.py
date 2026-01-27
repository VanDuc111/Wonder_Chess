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
    Bước 1: Tìm 4 góc của bàn cờ sử dụng Adaptive Threshold & Contour Approximation.
    Tối ưu cho việc tìm hình tứ giác (hình thang) của bàn cờ trong ảnh 3D.
    """
    # 1. Tiền xử lý (Xám -> Mờ -> Nhị phân hóa thích nghi)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Làm mượt ảnh để giảm nhiễu từ các ô cờ và quân cờ
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    
    # Adaptive Threshold giúp tách biệt bàn cờ khỏi nền ngay cả khi ánh sáng không đều
    # Ta sử dụng kích thước block lớn (11-21) để bắt được các cạnh lớn của bàn cờ
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 21, 5)

    # Dilation giúp nối liền các đoạn cạnh bị đứt quãng do quân cờ che khuất
    kernel = np.ones((3,3), np.uint8)
    thresh = cv2.dilate(thresh, kernel, iterations=1)

    # 2. Tìm đường bao (Contours)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Sắp xếp lấy các contour lớn nhất
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

    img_area = image.shape[0] * image.shape[1]
    
    for c in contours:
        # Tính chu vi và làm mượt đường bao
        peri = cv2.arcLength(c, True)
        
        # Thử nghiệm với các giá trị epsilon khác nhau để tìm ra 4 góc
        for eps_factor in [0.02, 0.05, 0.1]:
            approx = cv2.approxPolyDP(c, eps_factor * peri, True)

            # Nếu đường bao có 4 điểm và diện tích chiếm ít nhất 20% vùng ảnh
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                if area > img_area * 0.2:
                    print(f"✅ OpenCV tìm thấy hình tứ giác (Area: {area/img_area:.2f})")
                    return approx.reshape(4, 2)

    print("⚠️ Không tìm thấy bàn cờ bằng thuật toán Contour.")
    return None


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


def is_quad_too_distorted(pts, angle_tolerance=15):
    """
    Kiểm tra xem hình tứ giác có bị méo quá mức so với hình chữ nhật không.
    Dành cho ảnh 2D/Screenshot để tránh các đường grid bị vẹo.
    """
    if pts is None or len(pts) != 4:
        return True
    
    rect = order_points(pts)
    
    def get_angle(p1, p2, p3):
        # Tính góc giữa 3 điểm p1, p2, p3 (góc tại p2)
        v1 = p1 - p2
        v2 = p3 - p2
        cos_theta = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        angle = np.degrees(np.arccos(np.clip(cos_theta, -1.0, 1.0)))
        return angle

    # Kiểm tra 4 góc của tứ giác
    angles = [
        get_angle(rect[3], rect[0], rect[1]), # Góc TL
        get_angle(rect[0], rect[1], rect[2]), # Góc TR
        get_angle(rect[1], rect[2], rect[3]), # Góc BR
        get_angle(rect[2], rect[3], rect[0])  # Góc BL
    ]
    
    for a in angles:
        if abs(a - 90) > angle_tolerance:
            return True # Có ít nhất 1 góc quá nhọn hoặc quá tù
            
    return False
