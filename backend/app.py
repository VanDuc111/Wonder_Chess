from dotenv import load_dotenv
load_dotenv()
from flask import Flask, render_template, jsonify, request
from backend.api.game_routes import game_bp
from backend.api.analysis_routes import analysis_bp
from backend.api.image_routes import image_bp

# Khởi tạo ứng dụng Flask

app = Flask(__name__,
            static_folder='../frontend/static',
            template_folder='../frontend/templates')

app.register_blueprint(game_bp, url_prefix='/api/game')
app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
app.register_blueprint(image_bp, url_prefix='/api/image')

@app.route('/')
def home():
    return render_template('index.html')
