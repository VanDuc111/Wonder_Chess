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
    
    # URL for local access
    local_url = f"http://127.0.0.1:{port}"
    
    # Print welcome message
    print("\n" + "="*50)
    print(f"🚀 WONDER CHESS SERVER IS STARTING...")
    print(f"🌍 Local URL: {local_url}")
    print("="*50 + "\n")
    
    # Only open browser if running locally and not in a production environment
    is_render = os.environ.get("RENDER") is not None
    if not is_render and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        # Launch browser in a separate thread to not block the server start
        Timer(2.0, open_browser).start()
    
    # Start the Flask server
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
