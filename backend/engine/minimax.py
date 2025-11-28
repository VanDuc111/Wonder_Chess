import chess
import chess.polyglot
import time

# --- CẤU HÌNH ENGINE ---
ENGINE_DEPTH = 3
MATE_SCORE = 100000
TRANS_TABLE = {}  # Key: Zobrist Hash (Int), Value: (Depth, Score, Flag, BestMove)

# Hằng số Flag
HASH_EXACT = 0
HASH_ALPHA = 1
HASH_BETA = 2

# Điểm lợi thế đi trước
TEMPO_BONUS = 20

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# --- BẢNG ĐIỂM (Giữ nguyên của bạn) ---
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
    0, -10, 12, 12, 12, 12, -10, 0,
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
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -30, -30, -30, -30, -30, -30, -30,
    -20, -20, -20, -20, -20, -20, -20, -20,
    -10, 0, 20, 20, 20, 20, 0, -10,
    -10, 0, 20, 40, 40, 20, 0, -10,
    -10, 0, 20, 20, 20, 20, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, -10, -10, -10, -10, -10, -10, -10
]


def get_square_value(sq, color, table):
    if color == chess.WHITE:
        return table[sq]
    else:
        return table[63 - sq]


def evaluate_board(board):
    """
    Hàm đánh giá đã sửa:
    1. Tính tổng điểm (Trắng - Đen).
    2. Cộng Tempo.
    3. Đảo dấu theo Negamax.
    """
    if board.is_checkmate():
        return -MATE_SCORE
    if board.is_stalemate() or board.is_insufficient_material() or board.is_repetition() or board.is_fifty_moves():
        return 0

    score = 0

    # Material
    for piece_type, value in PIECE_VALUES.items():
        score += value * (len(board.pieces(piece_type, chess.WHITE)) - len(board.pieces(piece_type, chess.BLACK)))

    # Positional
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if not piece: continue

        table = None
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

        if table:
            val = get_square_value(sq, piece.color, table)
            if piece.color == chess.WHITE:
                score += val
            else:
                score -= val

    # Tempo Bonus
    if board.turn == chess.WHITE:
        score += TEMPO_BONUS
    else:
        score -= TEMPO_BONUS

    # Negamax Adjustment
    if board.turn == chess.BLACK:
        score = -score

    return score


def get_move_score(board, move):
    """
    Hàm sắp xếp nước đi tối ưu (có tính chênh lệch vị trí).
    """
    score = 0
    piece = board.piece_at(move.from_square)
    if not piece: return 0

    # 1. Phong cấp
    if move.promotion:
        if move.promotion == chess.QUEEN: return 2000
        return 1000

    # 2. Ăn quân (MVVLVA)
    if board.is_capture(move):
        victim = board.piece_at(move.to_square)
        victim_val = 0
        if victim:
            victim_val = PIECE_VALUES.get(victim.piece_type, 0)
        elif board.is_en_passant(move):
            victim_val = PIECE_VALUES[chess.PAWN]
        attacker_val = PIECE_VALUES.get(piece.piece_type, 0)
        score += 1000 + victim_val * 10 - attacker_val

    # 3. Chiếu
    if board.gives_check(move):
        score += 500

    # 4. Cải thiện vị trí (Quan trọng để e4, d4 được ưu tiên)
    table = None
    if piece.piece_type == chess.PAWN:
        table = PAWN_TABLE
    elif piece.piece_type == chess.KNIGHT:
        table = KNIGHT_TABLE
    elif piece.piece_type == chess.BISHOP:
        table = BISHOP_TABLE

    if table:
        val_to = get_square_value(move.to_square, piece.color, table)
        val_from = get_square_value(move.from_square, piece.color, table)
        score += (val_to - val_from)

    return score


def clear_transposition_table():
    global TRANS_TABLE
    TRANS_TABLE.clear()
    print("--- Transposition Table Cleared ---")


# --- QUAN TRỌNG: Quiescence Search Tối Ưu ---
def quiescence_search(board, alpha, beta):
    # Đánh giá tĩnh
    stand_pat = evaluate_board(board)

    if stand_pat >= beta:
        return beta
    if alpha < stand_pat:
        alpha = stand_pat

    # Chỉ xét nước ĂN QUÂN hoặc PHONG CẤP.
    # BỎ 'gives_check' để tránh bùng nổ tìm kiếm (đây là lý do chính gây lag)
    noisy_moves = [
        m for m in board.legal_moves
        if board.is_capture(m) or m.promotion
    ]

    # Sắp xếp
    noisy_moves.sort(key=lambda m: get_move_score(board, m), reverse=True)

    for move in noisy_moves:
        board.push(move)
        score = -quiescence_search(board, -beta, -alpha)
        board.pop()

        if score >= beta:
            return beta
        if score > alpha:
            alpha = score

    return alpha


# --- QUAN TRỌNG: Negamax thay vì Alpha-Beta ---
def negamax(board, depth, alpha, beta):
    # Dùng Zobrist Hash thay vì FEN string (Tăng tốc cực lớn)
    board_hash = chess.polyglot.zobrist_hash(board)

    tt_entry = TRANS_TABLE.get(board_hash)
    tt_best_move = None

    if tt_entry and tt_entry[0] >= depth:
        tt_depth, tt_score, tt_flag, tt_move = tt_entry
        tt_best_move = tt_move
        if tt_flag == HASH_EXACT:
            return tt_score
        elif tt_flag == HASH_ALPHA:
            alpha = max(alpha, tt_score)
        elif tt_flag == HASH_BETA:
            beta = min(beta, tt_score)
        if alpha >= beta: return tt_score

    if board.is_game_over():
        if board.is_checkmate():
            return -MATE_SCORE + (100 - depth)
        return 0

    if depth == 0:
        return quiescence_search(board, alpha, beta)

    legal_moves = list(board.legal_moves)
    legal_moves.sort(key=lambda m: get_move_score(board, m), reverse=True)

    # Ưu tiên nước đi tốt từ bảng băm nếu có
    if tt_best_move in legal_moves:
        legal_moves.remove(tt_best_move)
        legal_moves.insert(0, tt_best_move)

    best_value = -float('inf')
    best_move = None

    if not legal_moves:  # Trường hợp stalemate đã xử lý ở is_game_over, nhưng check lại cho chắc
        return evaluate_board(board)

    for move in legal_moves:
        board.push(move)
        # Negamax: Đổi dấu và đổi vị trí alpha/beta
        val = -negamax(board, depth - 1, -beta, -alpha)
        board.pop()

        if val > best_value:
            best_value = val
            best_move = move

        alpha = max(alpha, best_value)
        if alpha >= beta:
            break

    tt_flag = HASH_EXACT
    if best_value <= alpha:
        tt_flag = HASH_ALPHA
    elif best_value >= beta:
        tt_flag = HASH_BETA

    TRANS_TABLE[board_hash] = (depth, best_value, tt_flag, best_move)
    return best_value


def find_best_move(fen, depth=ENGINE_DEPTH):
    board = chess.Board(fen)
    legal_moves = list(board.legal_moves)

    if len(legal_moves) == 0:
        return {'best_move': None, 'search_score': 'Game Over', 'pv': ''}


    if len(legal_moves) == 1:
        return {
            'best_move': legal_moves[0].uci(),
            'search_score': 'Forced',
            'pv': legal_moves[0].uci()
        }


    best_move = None
    best_val = -float('inf')
    alpha = -float('inf')
    beta = float('inf')

    # Sắp xếp nước đi
    legal_moves.sort(key=lambda m: get_move_score(board, m), reverse=True)

    print(f"--- Thinking depth {depth} (Side: {'White' if board.turn == chess.WHITE else 'Black'}) ---")

    for move in legal_moves:
        board.push(move)
        val = -negamax(board, depth - 1, -beta, -alpha)
        board.pop()

        if val > best_val:
            best_val = val
            best_move = move
        alpha = max(alpha, val)


    final_score_visual = best_val
    if board.turn == chess.BLACK:
        final_score_visual = -best_val

    score_str = f"{final_score_visual / 100:.2f}"

    # Xử lý hiển thị Mate
    if abs(best_val) > MATE_SCORE - 1000:
        # 1. Tính "Delta": Đây chính là cái số 98, 99... (Do 100 - depth tạo ra)
        score_adjustment = MATE_SCORE - abs(best_val)

        # 2. Tính lại số Ply (số nửa nước đi) thực tế
        # Vì trong negamax ta dùng (100 - depth), nên giờ ta lấy (100 - adjustment)
        real_mate_in_plies = 100 - score_adjustment

        # 3. Chuyển từ Ply sang Move (1 Move = 2 Ply)
        # Ví dụ: Mate in 1 (Ply) -> M1. Mate in 2 (Ply) -> M1. Mate in 3 (Ply) -> M2.
        mate_in_moves = (real_mate_in_plies + 1) // 2

        # Phòng trường hợp tính ra 0 hoặc âm do độ sâu quá lớn (hiếm gặp)
        if mate_in_moves < 1: mate_in_moves = 1

        if final_score_visual > 0:
            score_str = f"+M{mate_in_moves}"
        else:
            score_str = f"-M{mate_in_moves}"

    return {
        'best_move': best_move.uci() if best_move else None,
        'search_score': score_str,
        'pv': best_move.uci() if best_move else ""
    }