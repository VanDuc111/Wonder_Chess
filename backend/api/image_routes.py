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
from backend.config import (
    ImageConfig,
    ErrorMessages,
    SuccessMessages
)

image_bp = Blueprint('image_bp', __name__)

if not os.path.exists(ImageConfig.UPLOAD_FOLDER):
    os.makedirs(ImageConfig.UPLOAD_FOLDER)


@image_bp.route('/analyze_image', methods=['POST'])
def analyze_image() -> jsonify:
    """
    Nhận file ảnh từ frontend, lưu tạm, gọi dịch vụ phân tích ảnh để chuyển đổi thành FEN,
    và trả về kết quả cùng ảnh gỡ lỗi (debug image).
    :return:
    """
    if 'file' not in request.files:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.NO_FILE_PART
        })

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            'success': False, 
            'error': ErrorMessages.EMPTY_FILENAME
        })

    if file:
        filename = f"scan_{int(time.time())}.jpg"
        filepath = os.path.join(ImageConfig.UPLOAD_FOLDER, filename)
        file.save(filepath)

        try:
            detected_fen, debug_image_b64, warped_image_b64, error = analyze_image_to_fen(filepath)

            if detected_fen:
                return jsonify({
                    'success': True,
                    'fen': detected_fen,
                    'debug_image': debug_image_b64,
                    'warped_image': warped_image_b64,
                    'message': SuccessMessages.IMAGE_ANALYSIS_SUCCESS
                })
            else:
                return jsonify({'success': False, 'error': error})
        except Exception as e:
            return jsonify({
                'success': False, 
                'error': f"{ErrorMessages.SERVER_ERROR_PREFIX}{str(e)}"
            })
        finally:
            # Luôn luôn xóa file tạm dù thành công hay lỗi
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except:
                pass
