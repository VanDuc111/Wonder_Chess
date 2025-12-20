import os
import webbrowser
from threading import Timer
from backend.app import app

def open_browser():
    """Automatically opens the browser when the server starts"""
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == "__main__":
    # Force debug mode to True
    app.debug = True
    
    # 1. If reloader is active (child process), open the browser
    # 2. If debug is OFF (no child process), open the browser immediately
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        Timer(1.5, open_browser).start()
    
    # Start the Flask server with the configured debug mode
    app.run(host="0.0.0.0", port=5000, debug=app.debug)
