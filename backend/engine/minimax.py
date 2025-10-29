import chess
import time
import random

ENGINE_DEPTH = 3
# Giá trị quân cờ theo tiêu chuẩn:
MATE_SCORE = 1000000
MAX_DEPTH_FOR_MATE = 500
TRANS_TABLE = {}

# Hằng số cờ (flag)
HASH_EXACT = 0    # Giá trị tìm kiếm chính xác (score)
HASH_ALPHA = 1    # Giá trị là ngưỡng trên (upper bound) (eval <= alpha)
HASH_BETA = 2     # Giá trị là ngưỡng dưới (lower bound) (eval >= beta)

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000  # Rất cao để tránh bị chiếu hết
}

# Giá trị của tốt
PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    4, 4, -24, -30, -30, 8, 8, 8,
    12, 8, 0, -10, -10, 0, 4, 6,
    8, 14, 12, 20, 20, 8, 6, 4,
    10, 16, 16, 30, 30, 12, 10, 8,
    20, 40, 40, 60, 60, 40, 40, 20,
    40, 60, 60, 80, 80, 60, 60, 40,
    0, 0, 0, 0, 0, 0, 0, 0
]

KNIGHT_TABLE = [
0,-10, 12, 12, 12, 12,-10, 0,
6, 12, 24, 30, 26, 24, 12, 6,
12, 24, 30, 36, 36, 38, 24, 12,
12, 24, 36, 40, 40, 36, 24, 12,
12, 24, 36, 42, 42, 36, 24, 12,
12, 24, 36, 40, 40, 36, 24, 12,
6, 12, 24, 36, 36, 24, 12, 6,
0, 6, 12, 12, 12, 12, 6, 0
]

BISHOP_TABLE = [
6, 0, 0, 0, 0, 0, 0, 6,
10, 30, 12, 12, 12, 12, 30, 10,
0, 20, 30, 12, 12, 30, 20, 0,
16, 12, 32, 32, 32, 32, 12, 16,
0, 30, 24, 32, 32, 24, 30, 0,
0, 12, 30, 24, 24, 30, 12, 0,
0, 18, 20, 20, 20, 20, 18, 0,
6, 0, 0, 0, 0, 0, 0, 6
]

ROOK_TABLE = [
6, 10, 12, 14, 14, 12, 10, 6,
8, 10, 10, 16, 16, 10, 10, 8,
6, 8, 10, 12, 12, 10, 8, 6,
4, 6, 8, 10, 10, 8, 6, 4,
4, 6, 8, 10, 10, 8, 6, 4,
6, 8, 10, 12, 12, 10, 8, 6,
20, 20, 20, 20, 20, 20, 20, 20,
18, 18, 18, 18, 18, 18, 18, 18
]

QUEEN_TABLE = [
14, 14, 14, 14, 14, 14, 14, 14,
14, 16, 16, 16, 16, 16, 16, 14,
14, 16, 18, 18, 18, 18, 16, 14,
14, 16, 18, 18, 18, 18, 16, 14,
16, 18, 20, 20, 20, 20, 18, 16,
16, 18, 20, 20, 20, 20, 18, 16,
18, 20, 20, 20, 20, 20, 20, 18,
18, 18, 18, 18, 18, 18, 18, 18
]

KING_TABLE = [
-30,-40,-40,-50,-50,-40,-40,-30,
-30,-30,-30,-30,-30,-30,-30,-30,
-20,-20,-20,-20,-20,-20,-20,-20,
-10, 0, 20, 20, 20, 20, 0,-10,
-10, 0, 20, 40, 40, 20, 0,-10,
-10, 0, 20, 20, 20, 20, 0,-10,
-10, 0, 0, 0, 0, 0, 0,-10,
-10,-10,-10,-10,-10,-10,-10,-10
]

def get_square_value(sq, color, table):
    """
    Lấy giá trị vị trí cho ô cờ.
    Nếu là quân Đen, lật bảng lại (a8 thành 0, h1 thành 63).
    """
    if color == chess.WHITE:
        return table[sq]
    else:
        # Lật bàn cờ: ô 0 (a1) của Trắng tương đương ô 63 (h8) của Đen
        return table[63 - sq]

def evaluate_board(board):
    """
    Đánh giá bàn cờ từ góc độ của người chơi hiện tại (Trắng là dương, Đen là âm).
    """
    if board.is_checkmate():
        # Trả về điểm cực cao hoặc cực thấp tùy thuộc vào ai đang bị chiếu hết
        if board.turn == chess.WHITE:
            return -MATE_SCORE  # Trắng bị chiếu hết (điểm cực thấp)
        else:
            return MATE_SCORE  # Đen bị chiếu hết (điểm cực cao)

    if board.is_stalemate() or board.is_insufficient_material():
        return 0  # Hòa

    score = 0

    # 1. TÍNH TỔNG GIÁ TRỊ VẬT CHẤT (MATERIAL)
    for piece_type, value in PIECE_VALUES.items():
        score += value * (len(board.pieces(piece_type, chess.WHITE)) - len(board.pieces(piece_type, chess.BLACK)))

    # 2. TÍNH TỔNG GIÁ TRỊ VỊ TRÍ (POSITIONAL)
    # Lặp qua tất cả 64 ô cờ
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue

        table = None
        # Xác định bảng PST tương ứng
        if piece.piece_type == chess.PAWN:
            table = PAWN_TABLE
        elif piece.piece_type == chess.KNIGHT:
            table = KNIGHT_TABLE
        elif piece.piece_type == chess.BISHOP:
            table = BISHOP_TABLE
        elif piece.piece_type == chess.ROOK:
            table = ROOK_TABLE
        elif piece.piece_type == chess.QUEEN:
            table = QUEEN_TABLE
        elif piece.piece_type == chess.KING:
            table = KING_TABLE

        if table is None:
            continue

            # Lấy giá trị vị trí đã được lật (nếu là quân Đen)
        value = get_square_value(sq, piece.color, table)

        if piece.color == chess.WHITE:
            score += value  # Cộng lợi thế của Trắng
        else:
            score -= value  # Trừ lợi thế của Đen (Tính từ góc nhìn của Trắng)

    return score

def get_move_score(board, move):
    """
    Chấm điểm sơ bộ cho nước đi để sắp xếp.
    Điểm càng cao, nước đi càng được ưu tiên.
    """
    if move.promotion:
        return 100  # Ưu tiên phong cấp
    if board.is_capture(move):
        return 50   # Ưu tiên bắt quân
    if board.gives_check(move):
        return 25   # Ưu tiên chiếu
    return 0


def clear_transposition_table():
    """
    Xóa sạch Bảng băm (Transposition Table) để chuẩn bị cho ván cờ mới.
    """
    global TRANS_TABLE
    TRANS_TABLE = {}
    print("--- Transposition Table Cleared ---")

# =====================================================================
# THUẬT TOÁN ALPHA-BETA PRUNING
# =====================================================================

def alpha_beta(board, depth, alpha, beta, is_maximizing_player):
    """
    Thuật toán Minimax với Cắt tỉa Alpha-Beta.
    alpha: Điểm số tốt nhất mà Maximizer (Bot) tìm thấy trên đường đi.
    beta: Điểm số tốt nhất mà Minimizer (Đối thủ) tìm thấy trên đường đi.
    """
    # === TRA CỨU BẢNG BĂM ===
    fen = board.fen()
    if fen in TRANS_TABLE:
        tt_entry = TRANS_TABLE[fen]
        tt_depth, tt_score, tt_flag = tt_entry

        # Chỉ sử dụng kết quả nếu độ sâu tìm kiếm đã được thực hiện bằng hoặc lớn hơn
        if tt_depth >= depth:
            if tt_flag == HASH_EXACT:
                return tt_score
            if tt_flag == HASH_ALPHA and tt_score <= alpha:
                return alpha  # Cắt tỉa Alpha
            if tt_flag == HASH_BETA and tt_score >= beta:
                return beta  # Cắt tỉa Beta

    if depth == 0 or board.is_game_over():
        score = quiescence_search(board, alpha, beta, is_maximizing_player)

        # Nếu tìm thấy chiếu hết, điều chỉnh điểm số dựa trên độ sâu (depth)
        # Điểm càng gần MATE_SCORE, chuỗi chiếu hết càng NGẮN (tức là tốt hơn)
        if abs(score) == MATE_SCORE:
            # Nếu Bot thắng: MATE_SCORE - (depth còn lại + 1) -> càng gần MATE_SCORE càng tốt
            if score > 0:
                return score - depth - 1
                # Nếu Bot thua: -MATE_SCORE + (depth còn lại + 1) -> càng gần -MATE_SCORE càng tốt
            else:
                return score + depth + 1

        return score

    original_alpha = alpha
    original_beta = beta

    legal_moves = sorted(
        list(board.legal_moves),
        key=lambda move: get_move_score(board, move),  # Chấm điểm
        reverse=True  # Điểm cao nhất lên trước
    )

    if is_maximizing_player:  # Lượt của Bot (Trắng)
        max_eval = -float('inf')

        for move in legal_moves:
            board.push(move)
            # Gọi đệ quy, đảo ngược vai trò
            eval = alpha_beta(board, depth - 1, alpha, beta, False)
            board.pop()

            max_eval = max(max_eval, eval)
            alpha = max(alpha, max_eval)  # Cập nhật alpha

            # CẮT TỈA: Nếu alpha >= beta, nhánh còn lại sẽ không được khám phá
            if beta <= alpha:
                break
        final_score = max_eval

    else:  # Lượt của Đối thủ (Đen)
        min_eval = float('inf')

        for move in legal_moves:
            board.push(move)
            # Gọi đệ quy, đảo ngược vai trò
            eval = alpha_beta(board, depth - 1, alpha, beta, True)
            board.pop()

            if abs(eval) > MATE_SCORE - MAX_DEPTH_FOR_MATE:
                # Nếu là điểm Mate, CẬP NHẬT để chuỗi chiếu hết dài hơn bị phạt
                if eval > 0:  # Bot thắng
                    eval -= 1
                else:  # Bot thua
                    eval += 1

            min_eval = min(min_eval, eval)
            beta = min(beta, min_eval)

            # CẮT TỈA: Nếu alpha >= beta, nhánh còn lại sẽ không được khám phá
            if beta <= alpha:
                break
        final_score = min_eval

    # Lưu vào bảng băm
    tt_flag = HASH_EXACT
    if is_maximizing_player:
        if final_score <= original_alpha:
            tt_flag = HASH_ALPHA  # Kết quả là ngưỡng trên (Upper Bound)
        elif final_score >= original_beta:
            tt_flag = HASH_BETA  # Kết quả là ngưỡng dưới (Lower Bound)
    else:  # Minimizing player
        if final_score <= original_alpha:
            tt_flag = HASH_ALPHA  # Kết quả là ngưỡng trên (Lower Bound cho đối thủ)
        elif final_score >= original_beta:
            tt_flag = HASH_BETA  # Kết quả là ngưỡng dưới (Upper Bound cho đối thủ)

    # Lưu trữ vị trí (FEN), độ sâu, điểm và cờ
    TRANS_TABLE[fen] = (depth, final_score, tt_flag)

    # =======================================================

    return final_score  # Trả về điểm cuối cùng


# =====================================================================
# HÀM CHỌN NƯỚC ĐI TỐT NHẤT (SỬ DỤNG ALPHA-BETA)
# =====================================================================



def find_best_move(fen, depth=ENGINE_DEPTH, time_limit=None):
    global TRANS_TABLE
    # TRANS_TABLE = {}
    board = chess.Board(fen)

    # Nếu game over
    if board.is_game_over():
        # Lấy kết quả
        result_str = board.result()

        friendly_score = "Game Over"
        best_move = "N/A"
        pv = "N/A"

        if board.is_checkmate():
            pv = "Checkmate"
            if result_str == "1-0":
                friendly_score = "#+1"  # Trắng thắng
            else:
                friendly_score = "#-1"  # Đen thắng
        elif board.is_stalemate():
            friendly_score = "0.00"
            pv = "Stalemate (Draw)"
        else:  # Các trường hợp hòa khác
            friendly_score = "0.00"
            pv = f"Draw ({result_str})"


        return {
            'search_score': friendly_score,
            'best_move': best_move,
            'pv': pv
        }

    is_maximizing_player = (board.turn == chess.WHITE)

    best_move = None
    best_eval = -float('inf') if is_maximizing_player else float('inf')

    legal_moves = sorted(
        list(board.legal_moves),
        key=lambda move: get_move_score(board, move),  # Chấm điểm
        reverse=True  # Điểm cao nhất lên trước
    )

    # Khởi tạo alpha và beta cho cấp độ gốc
    alpha = -float('inf')
    beta = float('inf')

    for move in legal_moves:
        board.push(move)

        # Gọi Alpha-Beta, đảo ngược vai trò
        eval = alpha_beta(board, depth - 1, alpha, beta, not is_maximizing_player)

        board.pop()  # Hoàn tác

        # Cập nhật nước đi tốt nhất
        if is_maximizing_player:
            if eval > best_eval:
                best_eval = eval
                best_move = move
            alpha = max(alpha, best_eval)
        else:
            if eval < best_eval:
                best_eval = eval
                best_move = move
            beta = min(beta, best_eval)

    if best_move:

        final_eval = best_eval
            # if board.turn == chess.WHITE else -best_eval
        # best_move_score_text = f"{final_eval:.2f}"
        best_move_score_text = str(final_eval)
        return {
            'search_score': best_move_score_text,
            'best_move': best_move.uci(),  # Nước đi tốt nhất
            'pv': best_move.uci()  # Tạm thời chỉ là nước đi tốt nhất (có thể cải thiện sau)
        }

        # Trả về dictionary lỗi nếu không tìm thấy nước đi nào
    return {
        'search_score': '0.00',  # Đặt điểm tìm kiếm là 0.00
        'best_move': None,
        'pv': 'No legal moves found.'
    }


def quiescence_search(board, alpha, beta, is_maximizing_player):
    """
    Tìm kiếm tĩnh: Chỉ xem xét các nước đi ồn ào (bắt quân, chiếu Vua, phong cấp).
    """

    # Đánh giá cơ bản (Nếu vị trí đã tĩnh)
    stand_pat = evaluate_board(board)

    if is_maximizing_player:
        if stand_pat >= beta:
            return beta
        alpha = max(alpha, stand_pat)
    else:
        if stand_pat <= alpha:
            return alpha
        beta = min(beta, stand_pat)

    # Lọc ra chỉ các nước đi ồn ào (noisy moves)
    # Bao gồm bắt quân, chiếu Vua (check), và phong cấp
    noisy_moves_list = [
        move for move in board.legal_moves
        if board.is_capture(move) or board.gives_check(move) or move.promotion
    ]

    legal_moves = sorted(
        noisy_moves_list,
        key=lambda move: get_move_score(board, move),  # Dùng lại hàm chấm điểm
        reverse=True
    )

    for move in legal_moves:
        board.push(move)

        # Gọi đệ quy cho tìm kiếm tĩnh
        eval = quiescence_search(board, alpha, beta, not is_maximizing_player)

        board.pop()

        # Cập nhật Alpha-Beta
        if is_maximizing_player:
            if eval >= beta:
                return beta
            alpha = max(alpha, eval)
        else:
            if eval <= alpha:
                return alpha
            beta = min(beta, eval)

    return alpha if is_maximizing_player else beta