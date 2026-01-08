from datetime import datetime
from backend import db

class User(db.Model):
    """
    Bảng User: Lưu trữ thông tin định danh của người dùng.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Quan hệ 1-n: Một User có thể có nhiều ván đấu (Game)
    # backref='player' giúp từ một ván đấu có thể gọi game.player để biết ai chơi
    games = db.relationship('Game', backref='player', lazy=True)

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
