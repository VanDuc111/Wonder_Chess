import os
from dotenv import load_dotenv
from flask import Flask
from flask_compress import Compress
from flask_sqlalchemy import SQLAlchemy

from flask_login import LoginManager
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
login_manager = LoginManager()
oauth = OAuth()

def create_app():
    # Load environment variables
    load_dotenv()
    
    # Initialize Flask app
    app = Flask(__name__,
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    
    # Cấu hình Secret Key (bắt buộc cho Session)
    app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev-secret-key-123")
                
    # Enable Gzip compression
    Compress(app)
    
    # Database Configuration
    database_url = os.environ.get("DATABASE_URL")
    
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        # Fallback for Local environment
        db_user = os.environ.get("DB_USER", "postgres")
        db_password = os.environ.get("DB_PASSWORD")
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")
        db_name = os.environ.get("DB_NAME", "wonder_chess_db")
        app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize Extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'  # redirect page if login required
    oauth.init_app(app)

    # Cấu hình Google OAuth
    oauth.register(
        name='google',
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )

    # Flask-Login User Loader
    from backend.models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Register Blueprints
    from backend.api.main_routes import main_bp
    from backend.api.game_routes import game_bp
    from backend.api.analysis_routes import analysis_bp
    from backend.api.image_routes import image_bp
    from backend.api.auth_routes import auth_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(game_bp, url_prefix='/api/game')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(image_bp, url_prefix='/api/image')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    return app
