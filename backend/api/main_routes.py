from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    return render_template('index.html')

@main_bp.route('/openings')
def openings_page():
    return render_template('openings.html')

@main_bp.route('/learn')
def learn_page():
    return render_template('learn.html')
