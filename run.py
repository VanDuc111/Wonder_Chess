import os
import webbrowser
from threading import Timer
from backend import create_app

app = create_app()

with app.app_context():
    from backend import db
    from backend import models
    db.create_all()

def open_browser():
    """Automatically opens the browser when the server starts"""
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == "__main__":
    # Configure for deployment (Render uses PORT env var)
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "True").lower() == "true"
    
    # Only open browser if running locally on port 5000 and not in a production environment
    is_render = os.environ.get("RENDER") is not None
    if not is_render and (os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not debug_mode):
        Timer(1.5, open_browser).start()
    
    # Start the Flask server
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
