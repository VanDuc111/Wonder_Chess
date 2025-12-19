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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    engine_path = os.path.join(base_dir, "stockfish.exe")
    
    if not os.path.exists(engine_path):
        return {"success": False, "error": f"Không tìm thấy Stockfish tại: {engine_path}"}
    
    try:
        # Khởi tạo engine (Synchronous)
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            # Thiết lập độ khó (UCI option: Skill Level)
            # Stockfish hỗ trợ từ 0 (yếu nhất) đến 20 (mạnh nhất)
            engine.configure({"Skill Level": skill_level})
            
            board = chess.Board(fen)
            
            # Yêu cầu Engine tính toán
            # Chúng ta sử dụng limit time để bot không suy nghĩ quá lâu làm lag UI
            result = engine.play(board, chess.engine.Limit(time=time_limit))
            
            # Lấy thêm thông tin đánh giá (score)
            info = engine.analyse(board, chess.engine.Limit(time=0.1))
            score = info.get("score")
            
            # Định dạng điểm số trả về cho Frontend
            score_str = "0.00"
            if score:
                # Lấy điểm số từ góc nhìn của bên đang đi
                score_perspective = score.relative
                if score_perspective.is_mate():
                    mate_moves = score_perspective.mate()
                    score_str = f"M{mate_moves}" if mate_moves > 0 else f"-M{abs(mate_moves)}"
                else:
                    cp = score_perspective.score()
                    if cp is not None:
                        score_str = f"{cp / 100:.2f}"

            return {
                "success": True,
                "best_move": result.move.uci() if result.move else None,
                "search_score": score_str
            }
            
    except Exception as e:
        print(f"Stockfish Error: {e}")
        return {"success": False, "error": str(e)}
