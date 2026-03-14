import chess
import chess.engine
import os
import threading
import atexit
import platform
import shutil

class StockfishEngineManager:
    """
    Singleton manager for persistent Stockfish engine process.
    Reuses the same process to avoid expensive startup/shutdown overhead.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __init__(self):
        self.engine = None
        self.engine_path = self._find_engine_path()
        
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance

    def _find_engine_path(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if platform.system() == "Windows":
            path = os.path.join(base_dir, "stockfish.exe")
        else:
            path = os.path.join(base_dir, "stockfish")
            if not os.path.exists(path):
                path = shutil.which("stockfish") or path
        return path

    def get_engine(self):
        """Ensures the engine process is running and configured."""
        with self._lock:
            if self.engine is None:
                if not os.path.exists(self.engine_path):
                    return None
                
                try:
                    self.engine = chess.engine.SimpleEngine.popen_uci(self.engine_path)
                    self.engine.configure({
                        "Threads": 1,      # Minimize CPU usage
                        "Hash": 16,        # Minimize RAM usage
                    })
                    # Register cleanup
                    atexit.register(self.shutdown)
                except Exception as e:
                    print(f"Failed to start Stockfish: {e}")
                    self.engine = None
            return self.engine

    def shutdown(self):
        """Kills the Stockfish process."""
        with self._lock:
            if self.engine:
                try:
                    self.engine.quit()
                except:
                    pass
                self.engine = None

def get_stockfish_move(fen, skill_level=10, time_limit=1.0):
    """
    Persistent-process Stockfish communication.
    Uses the singleton manager to avoid CPU-heavy process spawning.
    """
    manager = StockfishEngineManager.get_instance()
    engine = manager.get_engine()
    
    if not engine:
        return {"success": False, "error": f"Stockfish not found at {manager.engine_path}"}
    
    try:
        # Use common lock to prevent concurrent commands to the same engine instance
        with manager._lock:
            board = chess.Board(fen)
            
            # Configure engine for current search
            engine.configure({"Skill Level": skill_level})
            
            # Request move and analysis info
            # We use play() which is efficient for getting both the move and score in one call
            result = engine.play(board, chess.engine.Limit(time=min(0.5, time_limit)))
            
            # Extract score from result info or fallback to quick analysis if info missing
            score_str = "0.00"
            if result.info and "score" in result.info:
                score_str = _parse_score(result.info["score"])
            else:
                info = engine.analyse(board, chess.engine.Limit(time=0.1))
                score_str = _parse_score(info.get("score"))

            return {
                "success": True,
                "best_move": result.move.uci() if result.move else None,
                "search_score": score_str
            }
            
    except Exception as e:
        print(f"Stockfish Communication Error: {e}")
        # Reset engine instance on crash to attempt restart next time
        manager.shutdown()
        return {"success": False, "error": str(e)}

def _parse_score(score):
    """Helper to convert engine score to string (view from White)."""
    if not score:
        return "0.00"
    
    white_score = score.white()
    if white_score.is_mate():
        mate_moves = white_score.mate()
        return f"+M{mate_moves}" if mate_moves > 0 else f"-M{abs(mate_moves)}"
    
    cp = white_score.score()
    if cp is not None:
        return f"{cp / 100:+.2f}"
    return "0.00"
