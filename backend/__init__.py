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
    
    # Database & OAuth Configuration (Optional)
    db_url = os.environ.get("DATABASE_URL")
    db_name = os.environ.get("DB_NAME")
    
    # Only initialize DB if configuration exists
    is_db_configured = db_url or db_name
    
    if is_db_configured:
        if db_url and db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url or f'postgresql://{os.environ.get("DB_USER", "postgres")}:{os.environ.get("DB_PASSWORD")}@{os.environ.get("DB_HOST", "localhost")}:{os.environ.get("DB_PORT", "5432")}/{db_name}'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {"pool_pre_ping": True, "pool_recycle": 300}

        db.init_app(app)
        login_manager.init_app(app)
        login_manager.login_view = 'auth.login'
        oauth.init_app(app)

        # Configure Google OAuth if keys exist
        google_id = os.environ.get("GOOGLE_CLIENT_ID")
        google_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
        if google_id and google_secret:
            oauth.register(
                name='google',
                client_id=google_id,
                client_secret=google_secret,
                server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
                client_kwargs={'scope': 'openid email profile'}
            )

        # Flask-Login User Loader
        try:
            from backend.models import User
            @login_manager.user_loader
            def load_user(user_id):
                return User.query.get(int(user_id))
        except ImportError:
            pass
    else:
        app.logger.warning("Database not configured. Running in standalone mode (Login/Register disabled).")


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

    # Only register auth if DB is configured
    if is_db_configured:
        try:
            from backend.api.auth_routes import auth_bp
            app.register_blueprint(auth_bp, url_prefix='/api/auth')
        except ImportError:
            pass

    
    return app
