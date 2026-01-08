import os
from dotenv import load_dotenv
from flask import Flask
from flask_compress import Compress
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    # Load environment variables
    load_dotenv()
    
    # Initialize Flask app
    app = Flask(__name__,
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
                
    # Enable Gzip compression
    Compress(app)
    
    # Database Configuration
    db_user = os.environ.get("DB_USER", "postgres")
    db_password = os.environ.get("DB_PASSWORD")
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PORT", "5432")
    db_name = os.environ.get("DB_NAME")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy with the app
    db.init_app(app)
    
    # Register Blueprints
    from backend.api.main_routes import main_bp
    from backend.api.game_routes import game_bp
    from backend.api.analysis_routes import analysis_bp
    from backend.api.image_routes import image_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(game_bp, url_prefix='/api/game')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(image_bp, url_prefix='/api/image')
    
    return app
