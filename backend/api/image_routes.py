from flask import Blueprint, jsonify, request
from ..services.image_to_fen import get_fen_from_image
import tempfile
import os

image_bp = Blueprint('image', __name__)


@image_bp.route('/analyze_image', methods=['POST'])
def analyze_image():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Không có file nào được tải lên.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Tên file rỗng.'}), 400

    if file:
        # Tạo một file tạm thời an toàn
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        file.save(temp_file.name)
        temp_file.close()

        try:
            # Gọi hàm xử lý ảnh
            fen = get_fen_from_image(temp_file.name)

            # Xóa file tạm
            os.unlink(temp_file.name)

            return jsonify({'success': True, 'fen': fen})

        except Exception as e:
            # Xóa file tạm nếu có lỗi
            os.unlink(temp_file.name)
            return jsonify({'success': False, 'error': f'Lỗi phân tích ảnh: {str(e)}'}), 500

    return jsonify({'success': False, 'error': 'Lỗi không xác định.'}), 500