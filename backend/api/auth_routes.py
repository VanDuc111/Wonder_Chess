from flask import Blueprint, request, jsonify, url_for, redirect, session
from flask_login import login_user, logout_user, login_required, current_user
from backend import db, oauth
from backend.models import User
import datetime

auth_bp = Blueprint('auth', __name__)

# ==================== TRADITIONAL AUTH ====================

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Đăng ký tài khoản truyền thống."""
    data = request.get_json()
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email đã được sử dụng.'}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username đã tồn tại.'}), 400

    try:
        new_user = User.create_traditional_user(username, email, password)
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return jsonify({
            'success': True, 
            'message': 'Đăng ký thành công!',
            'user': new_user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Đăng nhập truyền thống."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if user and not user.is_oauth_user() and user.check_password(password):
        login_user(user, remember=True)
        user.update_last_login()
        db.session.commit()
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
    
    return jsonify({'success': False, 'message': 'Email hoặc mật khẩu không chính xác.'}), 401

# ==================== GOOGLE OAUTH ====================

@auth_bp.route('/google/login')
def google_login():
    """Khởi tạo luồng đăng nhập Google."""
    # url_for('auth.google_authorize', _external=True) tạo link callback tuyệt đối
    # Quan trọng: _external=True cần thiết cho OAuth
    redirect_uri = url_for('auth.google_authorize', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/callback/google')
def google_authorize():
    """Tiếp nhận dữ liệu trả về từ Google."""
    token = oauth.google.authorize_access_token()
    # Lấy thông tin user từ OpenID Connect (id_token)
    user_info = token.get('userinfo')
    
    if not user_info:
        return jsonify({'success': False, 'message': 'Không lấy được thông tin từ Google.'}), 400
        
    email = user_info.get('email')
    google_id = user_info.get('sub') # Google User ID
    name = user_info.get('name')
    picture = user_info.get('picture')
    
    # 1. Tìm user theo google_id
    user = User.query.filter_by(oauth_provider='google', oauth_id=google_id).first()
    
    # 2. Nếu chưa có, tìm theo email (để link tài khoản nếu họ đã đký truyền thống trước đó)
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            # Link google account vào user hiện tại
            user.oauth_provider = 'google'
            user.oauth_id = google_id
            if not user.avatar_url: user.avatar_url = picture
        else:
            # Tạo user mới hoàn toàn
            user = User.create_oauth_user('google', google_id, email, name, picture)
            db.session.add(user)
    
    user.update_last_login()
    db.session.commit()
    
    login_user(user, remember=True)
    
    # Sau khi login thành công, redirect về trang chủ của frontend
    return redirect('/')

# ==================== COMMON AUTH = :D ====================

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Đã đăng xuất.'})

@auth_bp.route('/status')
def auth_status():
    """Kiểm tra trạng thái đăng nhập hiện tại."""
    if current_user.is_authenticated:
        return jsonify({
            'is_authenticated': True,
            'user': current_user.to_dict()
        })
    return jsonify({'is_authenticated': False}), 200
