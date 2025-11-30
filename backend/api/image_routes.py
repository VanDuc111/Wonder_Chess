from flask import Blueprint, request, jsonify
import os
import time
from backend.services.image_to_fen import analyze_image_to_fen

image_bp = Blueprint('image_bp', __name__)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@image_bp.route('/analyze_image', methods=['POST'])
def analyze_image():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Không có file được gửi lên'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Tên file rỗng'})

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