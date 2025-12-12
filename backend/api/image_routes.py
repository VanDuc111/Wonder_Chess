"""
Module: image_routes.py
Mô tả: Xử lý các yêu cầu liên quan đến phân tích hình ảnh cờ vua.
Chức năng chính: Nhận file ảnh từ frontend, lưu tạm, gọi dịch vụ phân tích ảnh để chuyển đổi thành FEN,
và trả về kết quả cùng ảnh gỡ lỗi (debug image).
"""
from flask import Blueprint, request, jsonify
import os
import time
from backend.services.image_to_fen import analyze_image_to_fen

image_bp = Blueprint('image_bp', __name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@image_bp.route('/analyze_image', methods=['POST'])
def analyze_image() -> jsonify:
    """
    Nhận file ảnh từ frontend, lưu tạm, gọi dịch vụ phân tích ảnh để chuyển đổi thành FEN,
    và trả về kết quả cùng ảnh gỡ lỗi (debug image).
    :return:
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'There is no file part in the request.'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Empty filename.'})

    if file:
        filename = f"scan_{int(time.time())}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        detected_fen, debug_image_b64, error = analyze_image_to_fen(filepath)

        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except:
            pass

        if detected_fen:
            return jsonify({
                'success': True,
                'fen': detected_fen,
                'debug_image': debug_image_b64,
                'message': 'Thành công!'
            })
        else:
            return jsonify({'success': False, 'error': error})
