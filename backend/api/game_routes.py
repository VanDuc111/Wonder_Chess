from flask import Blueprint, jsonify, request
import chess
import chess.engine

from backend.engine.minimax import (
    find_best_move,
    evaluate_board,
    MATE_SCORE,
    clear_transposition_table
)

game_bp = Blueprint('game', __name__)
# FEN thế cờ ban đầu
STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

@game_bp.route('/valid_moves', methods=['POST'])
def get_valid_moves():
    """
        Nhận FEN và ô cờ nguồn (source square), trả về các ô đích hợp lệ.
        """
    data = request.json
    source_square = data.get('square')  # Ví dụ: 'e2'
    fen = data.get('fen', STARTING_FEN)

    # Kiểm tra dữ liệu đầu vào
    if not source_square or not fen:
        return jsonify({'success': False, 'error': 'Thiếu tham số square hoặc fen.'}), 400

    try:
        # 1. Khởi tạo đối tượng Board từ FEN
        board = chess.Board(fen)

        # 2. Chuyển đổi tên ô cờ ('e2') sang chỉ số cờ vua (Square: 12)
        source_square_index = chess.parse_square(source_square)

        # 3. Lọc ra các nước đi hợp lệ bắt đầu từ ô nguồn
        target_squares = []
        for move in board.legal_moves:
            if move.from_square == source_square_index:
                # Thêm ô đích (target square) vào danh sách (ví dụ: 'e4')
                target_squares.append(chess.square_name(move.to_square))

        return jsonify({'success': True, 'moves': target_squares})

    except ValueError as e:
        # Xử lý FEN không hợp lệ
        return jsonify({'success': False, 'error': f'FEN không hợp lệ: {e}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Lỗi server: {e}'}), 500


@game_bp.route('/make_move', methods=['POST'])
def make_move():
    """
    Nhận FEN và nước đi (ví dụ: 'e2e4'), trả về FEN mới sau nước đi.
    """
    data = request.json
    move_uci = data.get('move')  # Nước đi ở định dạng UCI (ví dụ: 'e2e4', 'g1f3')
    fen = data.get('fen', STARTING_FEN)

    if not move_uci or not fen:
        return jsonify({'success': False, 'error': 'Thiếu tham số move hoặc fen.'}), 400

    try:
        board = chess.Board(fen)

        # 1. Chuyển đổi nước đi UCI thành đối tượng Move và kiểm tra tính hợp lệ
        move = board.parse_uci(move_uci)

        if move not in board.legal_moves:
            return jsonify({'success': False, 'error': 'Nước đi không hợp lệ.'}), 400

        # 2. Thực hiện nước đi và lấy FEN mới
        board.push(move)
        new_fen = board.fen()

        return jsonify({'success': True, 'fen': new_fen})

    except ValueError:
        return jsonify({'success': False, 'error': 'Nước đi hoặc FEN không hợp lệ.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Lỗi server: {e}'}), 500


@game_bp.route('/bot_move', methods=['POST'])
def bot_move():
    data = request.get_json()
    fen = data.get('fen')

    if not fen:
        return jsonify({'success': False, 'error': 'FEN is required'}), 400

    try:
        engine_results = find_best_move(fen)
        if engine_results.get('best_move'):
            temp_board = chess.Board(fen)
            temp_board.push_uci(engine_results['best_move'])
            new_fen = temp_board.fen()

            return jsonify({
                'success': True,
                'move_uci': engine_results['best_move'],
                'fen': new_fen,
                'evaluation': engine_results['search_score']
            })
        else:
            return jsonify({'success': False, 'error': engine_results.get('pv', 'Bot could not find a move')}), 500

    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid time_limit format'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@game_bp.route('/evaluate', methods=['POST'])
def get_engine_score():
    """
    Đánh giá thế cờ hiện tại từ FEN.
    :return: JSON với điểm số đánh giá.
    """
    data = request.get_json()
    fen = data.get('fen')

    if not fen:
        return jsonify({'success': False, 'error': 'Thiếu tham số fen.'}), 400

    try:
        results = find_best_move(fen, max_depth = 10, time_limit=0.1)


        return jsonify({
            'success': True,
            'engine_results': {
                'search_score': results['search_score'],  # Lấy luôn string đã format (+0.25, -M1...)
                'best_move': results['best_move'],  # Có thể dùng để gợi ý nhẹ nếu muốn
                'pv': results['pv']
            }
        })

    except Exception as e:
        print(f"LỖI EVALUATE: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'engine_results': {'search_score': '0.00'}
        }), 500

@game_bp.route('/clear_cache', methods=['POST'])
def api_clear_cache():
    """
    Endpoint này được gọi từ frontend khi một ván cờ MỚI bắt đầu.
    """
    try:
        clear_transposition_table()
        return jsonify({'success': True, 'message': 'Engine cache cleared.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500