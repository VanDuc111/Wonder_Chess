from flask import Blueprint, jsonify

image_bp = Blueprint('image', __name__)

# @image_bp.route('/valid_moves', methods=['POST'])
# def get_valid_moves():
#     # ... logic tính nước đi hợp lệ ...
#     return jsonify(...)