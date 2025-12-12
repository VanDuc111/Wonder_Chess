"""
script để debug nhận diện quân cờ trên ảnh sử dụng Roboflow API.
Nó sẽ vẽ lưới bàn cờ và bounding box của các quân cờ lên ảnh, sau đó lưu ảnh kết quả.
"""
import os
import cv2
import numpy as np
from roboflow import Roboflow
from dotenv import load_dotenv

# 1. Load Config
load_dotenv()
API_KEY = os.getenv("ROBOFLOW_API_KEY")
MODEL_ID = os.getenv("ROBOFLOW_PROJECT_ID")
MODEL_VERSION = os.getenv("ROBOFLOW_VERSION")

# Map tên class sang FEN
CLASS_TO_FEN = {
    "bp": "p", "br": "r", "bn": "n", "bb": "b", "bq": "q", "bk": "k",
    "BP": "p", "BR": "r", "BN": "n", "BB": "b", "BQ": "q", "BK": "k",
    "wp": "P", "wr": "R", "wn": "N", "wb": "B", "wq": "Q", "wk": "K",
    "WP": "P", "WR": "R", "WN": "N", "WB": "B", "WQ": "Q", "WK": "K"
}


def resize_image_if_needed(image_path, max_size=1024):
    """
    Hàm phụ trợ: Thu nhỏ ảnh nếu kích thước vượt quá max_size (để tránh lỗi 413)
    Trả về: Đường dẫn tới file ảnh (gốc hoặc đã resize)
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Không thể đọc file ảnh: {image_path}")

    height, width = img.shape[:2]

    if max(height, width) <= max_size:
        return image_path, img

    # Tính toán tỉ lệ resize
    scale = max_size / max(height, width)
    new_width = int(width * scale)
    new_height = int(height * scale)

    print(f"⚠️ Ảnh quá lớn ({width}x{height}), đang resize về ({new_width}x{new_height})...")

    resized_img = cv2.resize(img, (new_width, new_height))

    # Lưu ảnh tạm để gửi lên API
    temp_path = "temp_resized_debug.jpg"
    cv2.imwrite(temp_path, resized_img)

    return temp_path, resized_img


def debug_image(image_path):
    print(f"--- Đang xử lý ảnh: {image_path} ---")

    try:
        # 1. XỬ LÝ ẢNH TRƯỚC (RESIZE)

        path_to_send, img_to_draw = resize_image_if_needed(image_path)

        # 2. GỬI ẢNH LÊN ROBOFLOW
        print("Loading Roboflow model...")
        rf = Roboflow(api_key=API_KEY)
        project = rf.workspace().project(MODEL_ID)
        model = project.version(MODEL_VERSION).model

        print("Đang gửi request lên API...")
        # Gửi file ảnh
        response = model.predict(path_to_send, confidence=40, overlap=30).json()
        predictions = response['predictions']

        # 3. VẼ LƯỚI VÀ KẾT QUẢ LÊN ẢNH
        height, width, _ = img_to_draw.shape
        sq_w = width / 8
        sq_h = height / 8

        # Vẽ lưới màu xanh lá
        for i in range(1, 8):
            x = int(i * sq_w)
            cv2.line(img_to_draw, (x, 0), (x, height), (0, 255, 0), 2)
            y = int(i * sq_h)
            cv2.line(img_to_draw, (0, y), (width, y), (0, 255, 0), 2)

        # Vẽ bounding box màu đỏ
        print("\n--- CHI TIẾT NHẬN DIỆN ---")
        for p in predictions:
            x, y = int(p['x']), int(p['y'])
            w, h = int(p['width']), int(p['height'])
            class_name = p['class']

            x_min = int(x - w / 2)
            y_min = int(y - h / 2)
            x_max = int(x + w / 2)
            y_max = int(y + h / 2)

            cv2.rectangle(img_to_draw, (x_min, y_min), (x_max, y_max), (0, 0, 255), 2)
            cv2.circle(img_to_draw, (x, y), 5, (0, 0, 255), -1)

            # Tính ô cờ
            col = int(x // sq_w)
            row = int(y // sq_h)
            row = max(0, min(7, row))
            col = max(0, min(7, col))

            fen_char = CLASS_TO_FEN.get(class_name, '?')

            cv2.putText(img_to_draw, f"{fen_char} ({row},{col})", (x_min, y_min - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            print(f"Quân: {class_name} | Tọa độ: ({x}, {y}) -> Ô: Row {row}, Col {col}")

        # 4. Xuất file kết quả
        output_filename = "debug_result.jpg"
        cv2.imwrite(output_filename, img_to_draw)
        print(f"\n✅ Đã lưu ảnh debug tại: {output_filename}")

        # Dọn dẹp file tạm nếu có
        if path_to_send == "temp_resized_debug.jpg" and os.path.exists(path_to_send):
            os.remove(path_to_send)

    except Exception as e:
        print(f"\n❌ LỖI: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    IMAGE_TO_TEST = "test_chess.jpg"

    if os.path.exists(IMAGE_TO_TEST):
        debug_image(IMAGE_TO_TEST)
    else:
        print(f"Lỗi: Không tìm thấy file {IMAGE_TO_TEST}")
