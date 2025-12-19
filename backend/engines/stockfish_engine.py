import chess
import chess.engine
import os

def get_stockfish_move(fen, skill_level=10, time_limit=1.0):
    """
    Giao tiếp với Stockfish engine qua giao thức UCI.
    :param fen: Chuỗi FEN hiện tại của bàn cờ.
    :param skill_level: Cấp độ kỹ năng (0-20).
    :param time_limit: Giới hạn thời gian suy nghĩ (giây).
    :return: Dictionary chứa nước đi và điểm số.
    """
    # Đường dẫn tới file thực thi Stockfish
    import platform
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if platform.system() == "Windows":
        engine_path = os.path.join(base_dir, "stockfish.exe")
    else:
        # Trên Linux (Render), script cài đặt đặt tên là 'stockfish'
        engine_path = os.path.join(base_dir, "stockfish")
        # Nếu không tìm thấy trong thư mục engines, thử tìm trong PATH hệ thống
        if not os.path.exists(engine_path):
            import shutil
            engine_path = shutil.which("stockfish") or engine_path
    
    if not os.path.exists(engine_path):
        return {"success": False, "error": f"Không tìm thấy Stockfish tại: {engine_path}"}
    
    try:
        # Khởi tạo engine (Synchronous)
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            # --- TỐI ƯU CHO RENDER FREE (0.1 CPU / 512MB RAM) ---
            engine.configure({
                "Threads": 1,      # Chỉ dùng 1 luồng để tránh treo CPU
                "Hash": 16,        # Chỉ dùng 16MB RAM cho bảng băm (mặc định thường là 16-1024MB)
                "Skill Level": skill_level
            })
            
            board = chess.Board(fen)
            
            # Yêu cầu Engine tính toán
            # Giới hạn thời gian suy nghĩ cực ngắn (tối đa 0.5s) để trả về kết quả nhanh
            search_time = min(0.5, time_limit) 
            result = engine.play(board, chess.engine.Limit(time=search_time))
            
            # Lấy thông tin đánh giá nhanh
            info = engine.analyse(board, chess.engine.Limit(time=0.1))
            score = info.get("score")
            
            # Định dạng điểm số trả về cho Frontend (Luôn từ góc nhìn Trắng)
            score_str = "0.00"
            if score:
                white_score = score.white()
                if white_score.is_mate():
                    mate_moves = white_score.mate()
                    score_str = f"+M{mate_moves}" if mate_moves > 0 else f"-M{abs(mate_moves)}"
                else:
                    cp = white_score.score()
                    if cp is not None:
                        score_str = f"{cp / 100:+.2f}"

            return {
                "success": True,
                "best_move": result.move.uci() if result.move else None,
                "search_score": score_str
            }
            
    except Exception as e:
        print(f"Stockfish Error: {e}")
        return {"success": False, "error": str(e)}
