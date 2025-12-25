import os
from dotenv import load_dotenv
from flask import Flask

def create_app():
    # Load environment variables
    load_dotenv()
    
    # Initialize Flask app
    # We set instance_relative_config=True to allow for per-instance configuration
    app = Flask(__name__,
                static_folder='../frontend/static',
                template_folder='../frontend/templates')
    
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
