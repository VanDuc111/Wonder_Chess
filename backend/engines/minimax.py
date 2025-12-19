"""
Module: minimax.py
Module cung cấp chức năng engine cờ vua sử dụng thuật toán Negamax với bảng băm (Transposition Table),
tìm kiếm yên tĩnh (Quiescence Search) và sắp xếp nước đi (Move Ordering).
Nó bao gồm các hàm để đánh giá bàn cờ, tìm nước đi tốt nhất dựa trên FEN,
và quản lý bảng băm để tối ưu hóa hiệu suất tìm kiếm.
"""

import chess
import chess.polyglot
import os
import time

# --- CẤU HÌNH ENGINE ---
ENGINE_DEPTH = 6
MATE_SCORE = 100000
TRANS_TABLE = {}  # Key: Zobrist Hash (Int), Value: (Depth, Score, Flag, BestMove)

# Hằng số Flag
HASH_EXACT = 0
HASH_ALPHA = 1
HASH_BETA = 2
NODES_VISITED = 0

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

# --- BẢNG ĐIỂM ---
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
    """
    Lấy giá trị vị trí ô cờ từ bảng điểm.
    Đảo bảng nếu là quân đen.
    """
    if color == chess.WHITE:
        return table[sq]
    else:
        return table[63 - sq]


def evaluate_board(board):
    """
    Hàm đánh giá:
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

    # 2. Ăn quân
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

    # 4. Cải thiện vị trí
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


# ---Quiescence Search ---
def quiescence_search(board, alpha, beta):
    """
    Tìm kiếm yên tĩnh để tránh hiệu ứng "horizon effect".
    Chỉ xét các nước ĂN QUÂN hoặc PHONG CẤP.
    """
    stand_pat = evaluate_board(board)

    if stand_pat >= beta:
        return beta
    if alpha < stand_pat:
        alpha = stand_pat

    # Chỉ xét nước ĂN QUÂN hoặc PHONG CẤP.
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


# --- NEGAMAX ALGORITHM ---
def negamax(board, depth, alpha, beta):
    """
    Thuật toán Negamax với Alpha-Beta Pruning và Transposition Table.
    """
    global NODES_VISITED
    NODES_VISITED += 1

    alpha_orig = alpha

    board_hash = chess.polyglot.zobrist_hash(board)
    tt_entry = TRANS_TABLE.get(board_hash)
    tt_best_move = None
    # --- 1. TRANSPOSITION TABLE LOOKUP ---
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

    # --- 2. MOVE ORDERING ---
    legal_moves = list(board.legal_moves)
    legal_moves.sort(key=lambda m: get_move_score(board, m), reverse=True)

    # Ưu tiên nước đi tốt từ bảng băm nếu có
    if tt_best_move in legal_moves:
        legal_moves.remove(tt_best_move)
        legal_moves.insert(0, tt_best_move)

    best_value = -float('inf')
    best_move = None

    if not legal_moves:
        return evaluate_board(board)

    # --- 3. MAIN SEARCH LOOP ---
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


import random

def find_best_move(fen, max_depth=ENGINE_DEPTH, time_limit=3.0, skill_level=10):
    """
    Tìm nước đi tốt nhất.
    1. Tra cứu Opening Book (chỉ dùng cho level cao).
    2. Nếu level thấp: Giới hạn depth và thêm yếu tố ngẫu nhiên (blunder).
    3. Chạy Iterative Deepening Negamax.
    """
    global NODES_VISITED
    NODES_VISITED = 0
    board = chess.Board(fen)
    legal_moves = list(board.legal_moves)
    
    # --- 1. ĐIỀU CHỈNH ĐỘ KHÓ (SKILL LEVEL MAPPING) ---
    # Convert skill_level (0-20) sang search_depth và blunder_probability
    if skill_level < 5:
        target_max_depth = 2
        blunder_chance = 0.3 # 30% đi nước sai
    elif skill_level < 10:
        target_max_depth = 3
        blunder_chance = 0.15
    elif skill_level < 15:
        target_max_depth = 4
        blunder_chance = 0.05
    else:
        target_max_depth = max_depth
        blunder_chance = 0.0

    # --- 2. OPENING BOOK (Chỉ dùng cho level > 5) ---
    if skill_level > 5:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        book_path = os.path.join(base_dir, "bin", "gm2001.bin")

        if os.path.exists(book_path):
            try:
                with chess.polyglot.open_reader(book_path) as reader:
                    entry = reader.weighted_choice(board)
                    time.sleep(0.3)
                    return {
                        'best_move': entry.move.uci(),
                        'search_score': "0.25",
                        'pv': 'Opening Theory'
                    }
            except:
                pass

    # --- 3. XỬ LÝ CƠ BẢN ---
    if len(legal_moves) == 0:
        return {'best_move': None, 'search_score': 'Game Over', 'pv': ''}
    if len(legal_moves) == 1:
        return {'best_move': legal_moves[0].uci(), 'search_score': 'Forced', 'pv': legal_moves[0].uci()}

    # --- 4. ITERATIVE DEEPENING SEARCH ---
    start_time = time.time()
    best_move_global = None
    best_score_global = -float('inf')
    completed_depth = 0
    top_moves = [] # Lưu danh sách các nước đi tốt để bốc ngẫu nhiên nếu level thấp

    # Chạy từ depth 1 -> target_max_depth
    for current_depth in range(1, target_max_depth + 1):
        if time.time() - start_time > time_limit:
            break

        alpha = -float('inf')
        beta = float('inf')
        current_depth_moves = []
        best_val_this_depth = -float('inf')
        best_move_this_depth = None

        # Move Ordering
        legal_moves.sort(key=lambda m: get_move_score(board, m), reverse=True)
        if best_move_global and best_move_global in legal_moves:
            legal_moves.remove(best_move_global)
            legal_moves.insert(0, best_move_global)

        for move in legal_moves:
            if time.time() - start_time > time_limit: 
                break

            board.push(move)
            val = -negamax(board, current_depth - 1, -beta, -alpha)
            board.pop()

            current_depth_moves.append((move, val))

            if val > best_val_this_depth:
                best_val_this_depth = val
                best_move_this_depth = move
            
            alpha = max(alpha, val)

        # Cập nhật kết quả tốt nhất nếu hoàn thành ít nhất 1 nước đi ở depth này
        if best_move_this_depth:
            best_move_global = best_move_this_depth
            best_score_global = best_val_this_depth
            top_moves = sorted(current_depth_moves, key=lambda x: x[1], reverse=True)
            completed_depth = current_depth
        
        if abs(best_score_global) > MATE_SCORE - 1000:
            break

    # --- 5. GIẢ LẬP SAI LẦM (BLUNDER LOGIC) ---
    final_move = best_move_global
    if skill_level < 15 and len(top_moves) > 1:
        if random.random() < blunder_chance:
            idx = random.randint(1, min(len(top_moves)-1, 3))
            final_move = top_moves[idx][0]
            best_score_global = top_moves[idx][1]

    # --- 6. FORMAT KẾT QUẢ ---
    final_score_visual = best_score_global
    if board.turn == chess.BLACK: final_score_visual = -best_score_global
    
    # Nếu không tìm được nước đi (timeout quá nhanh), mặc định là 0
    if best_score_global == -float('inf'):
        return {
            'best_move': legal_moves[0].uci(),
            'search_score': "0.00",
            'pv': ""
        }

    if abs(best_score_global) > MATE_SCORE - 1000:
        # Tính toán số nước đến mate
        score_adjustment = MATE_SCORE - abs(best_score_global)
        real_mate_in_plies = max(1, 100 - score_adjustment)
        mate_in_moves = (real_mate_in_plies + 1) // 2
        score_str = f"+M{mate_in_moves}" if final_score_visual > 0 else f"-M{mate_in_moves}"
    else:
        score_str = f"{final_score_visual / 100:.2f}"

    return {
        'best_move': final_move.uci() if final_move else legal_moves[0].uci(),
        'search_score': score_str,
        'pv': final_move.uci() if final_move else ""
    }
