"""
Game API Routes
Handles chess game operations: move validation, move execution, bot moves, and evaluation.
Routes are thin controllers that delegate business logic to service layer.
"""

from flask import Blueprint, jsonify, request, Response
import chess
from backend.services.engine_service import engine_service
from backend.engines.minimax import clear_transposition_table
from backend.config import (
    ChessConfig,
    EngineConfig,
    ErrorMessages,
    SuccessMessages,
    HTTPStatus
)

game_bp = Blueprint('game', __name__)


# ==================== MOVE VALIDATION ====================

@game_bp.route('/valid_moves', methods=['POST'])
def get_valid_moves() -> Response:
    """
    Get list of valid destination squares for a piece.
    Used by frontend to display move hints.
    """
    data = request.json
    source_square = data.get('square')
    fen = data.get('fen', ChessConfig.STARTING_FEN)

    if not source_square or not fen:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.MISSING_SQUARE_OR_FEN
        }), HTTPStatus.BAD_REQUEST

    try:
        board = chess.Board(fen)
        source_square_index = chess.parse_square(source_square)
        target_squares = []

        for move in board.legal_moves:
            if move.from_square == source_square_index:
                target_squares.append(chess.square_name(move.to_square))

        return jsonify({'success': True, 'moves': target_squares})

    except ValueError:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.INVALID_FEN_OR_SQUARE
        }), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# ==================== MOVE EXECUTION ====================

@game_bp.route('/make_move', methods=['POST'])
def make_move() -> Response:
    """
    Execute a player's move and return new board state.
    Validates move legality before execution.
    """
    data = request.json
    move_uci = data.get('move')
    fen = data.get('fen', ChessConfig.STARTING_FEN)

    if not move_uci or not fen:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.MISSING_MOVE_OR_FEN
        }), HTTPStatus.BAD_REQUEST

    try:
        board = chess.Board(fen)
        move = board.parse_uci(move_uci)

        if move not in board.legal_moves:
            return jsonify({
                'success': False, 
                'error': ErrorMessages.ILLEGAL_MOVE
            }), HTTPStatus.BAD_REQUEST

        board.push(move)
        return jsonify({'success': True, 'fen': board.fen()})

    except ValueError:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.INVALID_UCI_OR_FEN
        }), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# ==================== BOT MOVE ====================

@game_bp.route('/bot_move', methods=['POST'])
def bot_move() -> Response:
    """
    Request bot to calculate and execute best move.
    Automatically selects appropriate engine based on environment.
    """
    data = request.get_json()
    fen = data.get('fen')
    engine_choice = data.get('engine', 'stockfish')
    skill_level = data.get('skill_level', EngineConfig.DEFAULT_SKILL_LEVEL)
    time_limit_raw = data.get('time_limit', '0')

    if not fen:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.FEN_REQUIRED
        }), HTTPStatus.BAD_REQUEST

    try:
        # Parse time limit using service
        time_limit_sec = engine_service.parse_time_limit(time_limit_raw)
        
        # Get best move from appropriate engine
        engine_results = engine_service.get_best_move(
            fen=fen,
            engine_choice=engine_choice,
            skill_level=skill_level,
            time_limit=time_limit_sec
        )

        if engine_results.get('success') and engine_results.get('best_move') != ChessConfig.DEFAULT_BEST_MOVE:
            # Execute move to get new FEN
            board = chess.Board(fen)
            board.push_uci(engine_results['best_move'])

            return jsonify({
                'success': True,
                'move_uci': engine_results['best_move'],
                'fen': board.fen(),
                'evaluation': engine_results['search_score']
            })
        else:
            error_msg = engine_results.get('error', ErrorMessages.BOT_NO_MOVE)
            return jsonify({
                'success': False, 
                'error': error_msg
            }), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# ==================== POSITION EVALUATION ====================

@game_bp.route('/evaluate', methods=['POST'])
def get_engine_score() -> Response:
    """
    Quick position evaluation for advantage bar.
    Uses time-boxed search for instant response.
    Automatically uses Minimax on production to avoid RAM issues.
    """
    data = request.get_json()
    fen = data.get('fen')

    if not fen:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.FEN_REQUIRED_DOT
        }), HTTPStatus.BAD_REQUEST

    try:
        # Get evaluation from appropriate engine (guaranteed format)
        engine_results = engine_service.evaluate_position(fen)
        
        return jsonify({
            'success': True,
            'engine_results': engine_results
        })

    except Exception as e:
        print(f"EVALUATE ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'engine_results': {
                'search_score': ChessConfig.DEFAULT_SCORE
            }
        }), HTTPStatus.INTERNAL_SERVER_ERROR


# ==================== CACHE MANAGEMENT ====================

@game_bp.route('/clear_cache', methods=['POST'])
def api_clear_cache() -> Response:
    """
    Clear engine transposition table.
    Called when starting new game to avoid stale data.
    """
    try:
        clear_transposition_table()
        return jsonify({
            'success': True, 
            'message': SuccessMessages.CACHE_CLEARED
        })
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR
