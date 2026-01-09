from datetime import datetime
from backend import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    """
    Bảng User: Lưu trữ thông tin định danh của người dùng.
    Hỗ trợ cả traditional authentication (username/password) và OAuth (Google).
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    
    # Traditional auth fields
    username = db.Column(db.String(50), unique=True, nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  # NULL for OAuth users
    
    # OAuth fields
    oauth_provider = db.Column(db.String(20), nullable=True)  # 'google', 'facebook', etc.
    oauth_id = db.Column(db.String(255), nullable=True)  # Provider's user ID
    
    # Common fields
    display_name = db.Column(db.String(100), nullable=True)
    avatar_url = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # Quan hệ 1-n: Một User có thể có nhiều ván đấu (Game)
    # backref='player' giúp từ một ván đấu có thể gọi game.player để biết ai chơi
    games = db.relationship('Game', backref='player', lazy=True, cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint(
            '(password_hash IS NOT NULL) OR (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)',
            name='check_auth_method'
        ),
        db.Index('idx_oauth_provider_id', 'oauth_provider', 'oauth_id'),
    )
    
    def __repr__(self):
        return f'<User {self.username or self.email}>'
    
    # ==================== Password Methods (Traditional Auth) ====================
    
    def set_password(self, password):
        """
        Hash và lưu password cho traditional authentication.
        
        Args:
            password (str): Plain text password
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """
        Kiểm tra password có đúng không.
        
        Args:
            password (str): Plain text password to check
            
        Returns:
            bool: True nếu password đúng, False nếu sai
        """
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    # ==================== Factory Methods ====================
    
    @staticmethod
    def create_traditional_user(username, email, password, display_name=None):
        """
        Tạo user mới với traditional authentication (username/password).
        
        Args:
            username (str): Tên đăng nhập
            email (str): Email
            password (str): Mật khẩu (plain text, sẽ được hash)
            display_name (str, optional): Tên hiển thị
            
        Returns:
            User: User instance mới (chưa commit vào DB)
        """
        user = User(
            username=username,
            email=email,
            display_name=display_name or username,
            oauth_provider=None,
            oauth_id=None
        )
        user.set_password(password)
        return user
    
    @staticmethod
    def create_oauth_user(provider, oauth_id, email, name=None, avatar=None):
        """
        Tạo user mới với OAuth authentication (Google, Facebook, etc.).
        
        Args:
            provider (str): OAuth provider name ('google', 'facebook', etc.)
            oauth_id (str): User ID từ OAuth provider
            email (str): Email từ OAuth provider
            name (str, optional): Display name từ OAuth provider
            avatar (str, optional): Avatar URL từ OAuth provider
            
        Returns:
            User: User instance mới (chưa commit vào DB)
        """
        # Generate username từ email nếu không có
        username = email.split('@')[0] if email else None
        
        return User(
            username=username,
            email=email,
            oauth_provider=provider,
            oauth_id=oauth_id,
            display_name=name or username,
            avatar_url=avatar,
            password_hash=None
        )
    
    # ==================== Helper Methods ====================
    
    def is_oauth_user(self):
        """
        Kiểm tra user có phải OAuth user không.
        
        Returns:
            bool: True nếu là OAuth user, False nếu là traditional user
        """
        return self.oauth_provider is not None
    
    def update_last_login(self):
        """Cập nhật thời gian đăng nhập cuối cùng."""
        self.last_login = datetime.utcnow()
    
    def to_dict(self):
        """
        Convert user object sang dictionary (để trả về JSON).
        
        Returns:
            dict: User data (không bao gồm password_hash)
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'oauth_provider': self.oauth_provider,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }

class Game(db.Model):
    """
    Bảng Game: Lưu lịch sử ván đấu.
    """
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    pgn = db.Column(db.Text, nullable=False)
    result = db.Column(db.String(20)) # VD: '1-0', '0-1', '1/2-1/2'
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
