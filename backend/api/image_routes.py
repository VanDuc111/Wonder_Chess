from flask import Blueprint, jsonify, request
from ..services.image_to_fen import get_fen_from_image
import tempfile
import os
import requests

image_bp = Blueprint('image', __name__)


@image_bp.route('/analyze_image', methods=['POST'])
def analyze_image():
    # Hỗ trợ 2 cách: upload file multipart hoặc gửi JSON/form có trường 'url'
    temp_path = None
    try:
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'Tên file rỗng.'}), 400

            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            file.save(temp_file.name)
            temp_file.close()
            temp_path = temp_file.name

        else:
            # Kiểm tra URL trong form data hoặc JSON
            url = None
            if request.form and 'url' in request.form:
                url = request.form.get('url')
            elif request.json and 'url' in request.json:
                url = request.json.get('url')

            if not url:
                return jsonify({'success': False, 'error': 'Không có file hoặc url được cung cấp.'}), 400

            # Tải ảnh từ url
            resp = requests.get(url, stream=True, timeout=15)
            if resp.status_code != 200:
                return jsonify({'success': False, 'error': f'Không thể tải ảnh từ URL ({resp.status_code}).'}), 400

            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            with open(temp_file.name, 'wb') as f:
                for chunk in resp.iter_content(1024):
                    f.write(chunk)
            temp_path = temp_file.name

        # Gọi hàm xử lý ảnh
        fen = get_fen_from_image(temp_path)

        # Xóa file tạm
        try:
            os.unlink(temp_path)
        except Exception:
            pass

        return jsonify({'success': True, 'fen': fen})

    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass
        return jsonify({'success': False, 'error': f'Lỗi phân tích ảnh: {str(e)}'}), 500