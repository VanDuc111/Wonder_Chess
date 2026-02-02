import re
import chess
from typing import Dict, Any, Tuple

class ChessAnalysisManager:
    """
    Service chuyên trách việc phân tích dữ liệu cờ vua và chuẩn bị dữ liệu cho AI.
    Giúp tách biệt logic tính toán khỏi HTTP layer (Route).
    """

    @staticmethod
    def parse_score(score_str: Any) -> float:
        """
        Chuyển đổi điểm số từ Engine (dạng chuỗi) sang float để tính toán.
        Hỗ trợ: +1.50, -0.80, +M2, -M5, 0.00
        """
        s = str(score_str).strip()
        if not s:
            return 0.0
            
        # 1. Kiểm tra Mate (+M1, -M5, M2...)
        mate_match = re.search(r'([+-])?M\d+', s, re.IGNORECASE)
        if mate_match:
            # Nếu có dấu trừ thì là thế thua tuyệt đối (-100), ngược lại là thắng (100)
            return -100.0 if mate_match.group(1) == '-' else 100.0
        
        # 2. Trích xuất số thực cho các trường hợp điểm số thông thường
        num_match = re.search(r'[+-]?\d+\.?\d*', s)
        try:
            return float(num_match.group()) if num_match else 0.0
        except (ValueError, AttributeError):
            return 0.0

    def calculate_evaluation_diff(self, current_fen: str, current_score: Any, prev_score: Any) -> Tuple[float, str, str]:
        """
        Tính toán chênh lệch đánh giá dựa trên lượt đi.
        Trả về: (giá trị_diff, tên_người_vừa_đi, tên_người_đến_lượt)
        """
        cur_v = self.parse_score(current_score)
        prev_v = self.parse_score(prev_score)
        
        try:
            board = chess.Board(current_fen)
            # Người vừa đi là người có màu ngược với lượt hiện tại (turn)
            was_white_move = (board.turn == chess.BLACK)
            
            # Nếu trắng vừa đi: diff = cur - prev (tăng là tốt cho trắng)
            # Nếu đen vừa đi: diff = prev - cur (giảm là tốt cho đen -> prev lớn hơn cur)
            diff = (cur_v - prev_v) if was_white_move else (prev_v - cur_v)
            
            last_player = "Trắng" if was_white_move else "Đen"
            current_turn = "Trắng" if board.turn == chess.WHITE else "Đen"
            
            return diff, last_player, current_turn
        except Exception:
            return 0.0, "N/A", "N/A"

    @staticmethod
    def uci_to_san(fen: str, uci_move: str) -> str:
        """Chuyển đổi nước đi từ UCI sang SAN."""
        if not uci_move or uci_move == "N/A":
            return "N/A"
        try:
            board = chess.Board(fen)
            move = board.parse_uci(uci_move)
            return board.san(move)
        except Exception:
            return uci_move

    def get_move_quality_label(self, diff: float) -> str:
        """Xác định nhãn chất lượng nước đi dựa trên chênh lệch."""
        if diff > 1.5: return "Thiên tài!!"
        if diff > 0.8: return "Tuyệt vời!"
        if diff > 0.1: return "Tốt"
        if diff > -0.1: return "Tốt nhất/Ổn định"
        if diff > -0.3: return "Thiếu chính xác"
        if diff > -0.7: return "Sai lầm?"
        return "Sai lầm nghiêm trọng??"

    def prepare_analysis_context(self, data: Dict[str, Any], engine_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tổ hợp mọi dữ liệu thô thành ngữ cảnh đã được xử lý (Processed Context).
        Đây là nơi tập trung toàn bộ logic "Senior" mà không cần API Key.
        """
        fen = data.get('fen')
        current_score = data.get('current_score') or engine_results.get('search_score', '0')
        prev_score = data.get('prev_score', '0.00')
        
        diff, last_player, current_turn = self.calculate_evaluation_diff(fen, current_score, prev_score)
        
        # Format diff string thân thiện
        diff_str = "Cực kỳ lớn" if abs(diff) > 50 else f"{diff:+.2f}"
        
        return {
            "fen": fen,
            "pgn": data.get('pgn', 'N/A'),
            "last_move_san": data.get('last_move_san', 'N/A'),
            "best_move_san": self.uci_to_san(fen, engine_results.get('best_move')),
            "diff": diff,
            "diff_str": diff_str,
            "quality_label": self.get_move_quality_label(diff),
            "last_player": last_player,
            "current_turn": current_turn,
            "formatted_score": str(current_score),
            "opening_name": data.get('opening_name', 'N/A'),
            "move_count": data.get('move_count', 0),
            "engine_pv": engine_results.get('pv', 'N/A')
        }
