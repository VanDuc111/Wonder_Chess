"""Module: game_routes.py
API routes liên quan đến trò chơi cờ vua.
Bao gồm nhận diện nước đi hợp lệ, thực hiện nước đi, yêu cầu bot chơi, đánh giá thế cờ và xóa bộ nhớ đệm của engine.
"""

from flask import Blueprint, jsonify, request, Response
import chess
import chess.engine
from backend.engines.stockfish_engine import get_stockfish_move

from backend.engines.minimax import (
    find_best_move,
    evaluate_board,
    MATE_SCORE,
    clear_transposition_table
)

from backend.config import (
    ChessConfig,
    EngineConfig,
    ErrorMessages,
    SuccessMessages,
    HTTPStatus
)

game_bp = Blueprint('game', __name__)


@game_bp.route('/valid_moves', methods=['POST'])
def get_valid_moves() -> Response:
    """
    Nhận FEN và ô cờ nguồn (source square), trả về danh sách các ô đích hợp lệ.
    API này giúp Frontend hiển thị các chấm gợi ý nước đi.
    """
    data = request.json
    source_square = data.get('square')
    fen = data.get('fen', ChessConfig.STARTING_FEN)

    if not source_square or not fen:
        return jsonify({'success': False, 'error': ErrorMessages.MISSING_SQUARE_OR_FEN}), HTTPStatus.BAD_REQUEST

    try:
        board = chess.Board(fen)
        source_square_index = chess.parse_square(source_square)
        target_squares = []

        for move in board.legal_moves:
            if move.from_square == source_square_index:
                target_squares.append(chess.square_name(move.to_square))

        return jsonify({'success': True, 'moves': target_squares})

    except ValueError:
        return jsonify({'success': False, 'error': ErrorMessages.INVALID_FEN_OR_SQUARE}), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR


@game_bp.route('/make_move', methods=['POST'])
def make_move() -> Response:
    """
    Thực hiện một nước đi của người chơi.
    Input: FEN hiện tại và nước đi (ví dụ 'e2e4').
    Output: Chuỗi FEN mới sau khi đi.
    """
    data = request.json
    move_uci = data.get('move')
    fen = data.get('fen', ChessConfig.STARTING_FEN)

    if not move_uci or not fen:
        return jsonify({'success': False, 'error': ErrorMessages.MISSING_MOVE_OR_FEN}), HTTPStatus.BAD_REQUEST

    try:
        board = chess.Board(fen)
        move = board.parse_uci(move_uci)

        if move not in board.legal_moves:
            return jsonify({'success': False, 'error': ErrorMessages.ILLEGAL_MOVE}), HTTPStatus.BAD_REQUEST

        board.push(move)
        return jsonify({'success': True, 'fen': board.fen()})

    except ValueError:
        return jsonify({'success': False, 'error': ErrorMessages.INVALID_UCI_OR_FEN}), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR


@game_bp.route('/bot_move', methods=['POST'])
def bot_move() -> Response:
    """
    Yêu cầu Engine tính toán và thực hiện nước đi tốt nhất.
    Hỗ trợ cả Stockfish và Engine tùy chỉnh.
    """
    data = request.get_json()
    fen = data.get('fen')
    engine_choice = data.get('engine', 'stockfish')
    skill_level = data.get('skill_level', EngineConfig.DEFAULT_SKILL_LEVEL)
    time_limit_raw = data.get('time_limit', '0')
    
    # Chuyển đổi thời gian từ phút (string) sang giây (float) cho Engine
    try:
        time_limit_min = float(time_limit_raw)
        if time_limit_min <= 0:
            time_limit_sec = EngineConfig.DEFAULT_THINK_TIME
        else:
            # Nếu là game có thời gian, bot suy nghĩ tối đa để cân bằng
            time_limit_sec = min(
                EngineConfig.MAX_BOT_THINK_TIME, 
                time_limit_min * EngineConfig.MINUTES_TO_SECONDS
            )
    except:
        time_limit_sec = EngineConfig.DEFAULT_THINK_TIME

    if not fen:
        return jsonify({'success': False, 'error': ErrorMessages.FEN_REQUIRED}), HTTPStatus.BAD_REQUEST

    try:
        # Lựa chọn Engine
        if engine_choice == 'stockfish':
            engine_results = get_stockfish_move(fen, skill_level=skill_level, time_limit=time_limit_sec)
        else:
            # Engine tùy chỉnh (Minimax)
            engine_results = find_best_move(fen, time_limit=time_limit_sec, skill_level=skill_level)
            engine_results['success'] = True if engine_results.get('best_move') else False

        if engine_results.get('success') and engine_results.get('best_move'):
            # Thực hiện nước đi trên bàn cờ ảo để lấy FEN mới
            temp_board = chess.Board(fen)
            temp_board.push_uci(engine_results['best_move'])
            new_fen = temp_board.fen()

            return jsonify({
                'success': True,
                'move_uci': engine_results['best_move'],
                'fen': new_fen,
                'evaluation': engine_results.get('search_score', ChessConfig.DEFAULT_SCORE)
            })
        else:
            error_msg = engine_results.get('error', ErrorMessages.BOT_NO_MOVE)
            return jsonify({'success': False, 'error': error_msg}), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR


@game_bp.route('/evaluate', methods=['POST'])
def get_engine_score() -> Response:
    """
    Đánh giá nhanh thế cờ hiện tại (dùng cho thanh Bar lợi thế).
    Sử dụng Time-boxed Search để phản hồi tức thì mà vẫn đảm bảo độ chính xác tương đối.
    """
    data = request.get_json()
    fen = data.get('fen')

    if not fen:
        return jsonify({'success': False, 'error': ErrorMessages.FEN_REQUIRED_DOT}), HTTPStatus.BAD_REQUEST

    try:
        # Sử dụng Stockfish để đánh giá
        results = get_stockfish_move(
            fen, 
            skill_level=EngineConfig.MAX_SKILL_LEVEL, 
            time_limit=EngineConfig.EVALUATION_TIME_LIMIT
        )

        if results.get('success'):
            return jsonify({
                'success': True,
                'engine_results': {
                    'search_score': results['search_score'],
                    'best_move': results.get('best_move'),
                    'pv': results.get('best_move') # Stockfish basic info
                }
            })
        else:
            # Fallback về Minimax nếu Stockfish lỗi
            results = find_best_move(
                fen, 
                max_depth=EngineConfig.FALLBACK_MAX_DEPTH, 
                time_limit=EngineConfig.FALLBACK_TIME_LIMIT
            )
            return jsonify({
                'success': True,
                'engine_results': {
                    'search_score': results['search_score'],
                    'best_move': results['best_move'],
                    'pv': results['pv']
                }
            })

    except Exception as e:
        print(f"EVALUATE ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'engine_results': {'search_score': ChessConfig.DEFAULT_SCORE}
        }), HTTPStatus.INTERNAL_SERVER_ERROR


@game_bp.route('/clear_cache', methods=['POST'])
def api_clear_cache() -> Response:
    """
    Xóa bộ nhớ đệm (Transposition Table) của Engine.
    Thường gọi khi bắt đầu ván mới để tránh nước đi cũ ảnh hưởng.
    """
    try:
        clear_transposition_table()
        return jsonify({'success': True, 'message': SuccessMessages.CACHE_CLEARED})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR
