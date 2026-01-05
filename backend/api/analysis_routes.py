"""
Module: analysis_routes.py
Mô tả: Xử lý các yêu cầu phân tích trận đấu sử dụng AI (Gemini).
Chức năng chính: Nhận câu hỏi từ người dùng, kết hợp với dữ liệu Engine (FEN, Score, Best Move)
để tạo ra prompt và gửi đến Gemini, sau đó stream câu trả lời về frontend.
"""

from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.engines.minimax import find_best_move
from backend.engines.stockfish_engine import get_stockfish_move
import chess

analysis_bp = Blueprint('analysis', __name__)


@analysis_bp.route('/chat_analysis', methods=['POST'])
def chat_analysis() -> Response:
    """
        API phân tích bàn cờ và trò chuyện với Alice (Gemini).
        Input: JSON chứa câu hỏi người dùng, FEN, PGN, nước đi cuối.
        Output: Stream text câu trả lời từ Gemini.
        """
    # 1. Lấy tất cả dữ liệu đầu vào
    data = request.get_json()
    user_question = data.get('user_question')
    fen = data.get('fen')
    pgn = data.get('pgn')
    last_move_san = data.get('last_move_san', 'N/A')
    is_first_message = data.get('is_first_message', False)

    if not user_question or not fen:
        return jsonify({'success': False, 'error': 'Thiếu FEN hoặc câu hỏi người dùng.'}), 400

    # 2. Xây dựng chỉ dẫn chào hỏi
    if is_first_message:
        greeting_instruction = "Hãy bắt đầu câu trả lời của bạn bằng một lời chào thân thiện (ví dụ: 'Chào bạn!')."
    else:
        greeting_instruction = "Người dùng đã biết bạn là ai. Hãy **đi thẳng vào câu trả lời**, không cần chào hỏi."

    # 3. LUÔN LUÔN lấy dữ liệu engine (cho ngữ cảnh)
    engine_results = {'search_score': '0', 'best_move': 'N/A', 'pv': 'N/A'}
    engine_error_message = None
    
    # Ưu tiên lấy điểm số từ frontend để đồng bộ tuyệt đối
    frontend_score = data.get('current_score')
    move_count = data.get('move_count', 0)
    
    if fen:
        try:
            board = chess.Board(fen)
            if not board.is_valid():
                engine_error_message = "Invalid FEN: Board state is illegal.."
            else:
                # Đồng bộ trình độ Engine với hệ thống Evaluation Bar (Skill 20)
                engine_results_from_sf = get_stockfish_move(fen, skill_level=20, time_limit=0.5)
                
                if engine_results_from_sf.get('success'):
                    engine_results.update(engine_results_from_sf)
                else:
                    engine_results_from_find = find_best_move(fen)
                    engine_results.update(engine_results_from_find)

        except ValueError:
            engine_error_message = "Invalid FEN structure."
        except Exception as e:
            print(f"Engine Error: {e}")
            engine_error_message = f"Engine calculation error: {str(e)}"
    else:
        engine_error_message = "FEN is empty."

    # 4.Định dạng điểm số
    frontend_prev_score = data.get('prev_score', '0.00')
    opening_name = data.get('opening_name', 'N/A')
    raw_score = frontend_score if frontend_score is not None else engine_results.get('search_score', '0')
    formatted_score = raw_score

    # Phân tích xu hướng (để Alice biết nước đi tốt hay xấu dựa trên chênh lệch)
    try:
        def parse(s):
            s = str(s)
            if 'M' in s: return 100 if '+' in s else -100
            return float(s)
        
        cur_v = parse(formatted_score)
        prev_v = parse(frontend_prev_score)
        board_now = chess.Board(fen)
        was_white_move = (board_now.turn == chess.BLACK) 
        diff = (cur_v - prev_v) if was_white_move else (prev_v - cur_v)
        
        current_turn_name = "Trắng" if board_now.turn == chess.WHITE else "Đen"
        last_player_name = "Trắng" if was_white_move else "Đen"
    except:
        diff = 0
        current_turn_name = "N/A"
        last_player_name = "N/A"

    # 5. Chuyển đổi nước đi tốt nhất sang SAN (UCI -> SAN)
    best_move_san = "N/A"
    best_move_uci = engine_results.get('best_move')
    if best_move_uci and best_move_uci != "N/A" and fen and not engine_error_message:
        try:
            board = chess.Board(fen)
            move = board.parse_uci(best_move_uci)
            best_move_san = board.san(move)
        except Exception as e:
            best_move_san = best_move_uci

    # Chỉ hiển thị khai cuộc nếu trong 10 nước đi đầu (5 full moves)
    opening_context = f"Dựa trên khai cuộc **{opening_name}**, " if (move_count <= 10 and opening_name != "N/A") else ""

    # 6. Xây dựng Prompt
    prompt_context = f"""
    Bạn là **Alice**, một **Trợ lý Cờ vua Đại kiện tướng (GM)** sắc sảo, thân thiện và am hiểu sâu sắc về luật chơi.
    {greeting_instruction}

    **CÁCH TIẾP CẬN TRẢ LỜI:**
    Ưu tiên số 1 là trả lời trực tiếp và chính xác câu hỏi của người dùng: "{user_question}".

    1. **Nếu người dùng hỏi về LUẬT CHƠI hoặc KIẾN THỨC CHUNG (ví dụ: cách quân mã di chuyển, nhập thành là gì, tên một khai cuộc):**
       - Hãy tập trung trả lời chi tiết và dễ hiểu về quy tắc đó. 
       - **KHÔNG CẦN** phân tích bàn cờ hiện tại trừ khi câu hỏi có liên quan. 
       - Bạn có thể bỏ qua các quy tắc về "Đánh giá nước đi" bên dưới nếu chúng làm loãng câu trả lời.

    2. **Nếu người dùng hỏi về THẾ TRẬN HIỆN TẠI hoặc đặt câu hỏi chung chung/không rõ ràng:**
       - Hãy áp dụng các **QUY TẮC PHÂN TÍCH** dưới đây để hỗ trợ người dùng.

    **QUY TẮC PHÂN TÍCH (Chỉ áp dụng khi phân tích ván đấu):**
    - **IN ĐẬM NƯỚC ĐI:** Luôn viết hoa và **in đậm** mọi nước đi (ví dụ: **e4**, **Nxh6**, **{last_move_san}**, **{best_move_san}**).
    - **NGẮN GỌN:** Trả lời trong khoảng **4-5 câu**.
    - **ĐÁNH GIÁ NƯỚC ĐI:** Dựa vào chênh lệch `{diff:+.2f}`, gọi **{last_move_san}** là:
        - **Thiên tài!!** (>1.5), **Tuyệt vời!** (>0.8), **Tốt nhất** (Diff gần 0 hoặc dương), **Tốt** (>0.1), **Ổn định** (>-0.2), **Bỏ lỡ thắng** (abs thắng->hòa), **Sai lầm nghiêm trọng??** (<-1.5), **Sai lầm?** (<-0.7), **Thiếu chính xác** (<-0.3).
    - **CẤU TRÚC PHÂN TÍCH:**
        - Nêu ưu thế hiện tại: **{formatted_score}** (Cân bằng/Đen ưu/Trắng ưu).
        - Nhận xét nước **{last_move_san}** của {last_player_name}.
        - Gợi ý nước tốt nhất cho {current_turn_name} là **{best_move_san}**.

    **DỮ LIỆU CỦA VÁN ĐẤU HIỆN TẠI (Tham khảo nếu cần):**
    - Vừa đi (của {last_player_name}): **{last_move_san}** (Chênh lệch: {diff:+.2f})
    - Điểm số engine: **{formatted_score}**
    - Gợi ý nước tiếp: **{best_move_san}**
    - Biến hóa (PV): {engine_results.get('pv', 'N/A')}
    - Khai cuộc: {opening_name}
    
    Câu hỏi của người dùng: "{user_question}"
    """

    # 7. Gọi Gemini và stream phản hồi
    def generate_response():
        try:
            for chunk in stream_gemini_response(prompt_context):
                yield chunk
        except Exception as e:
            print(f"Gemini Streaming Error: {e}")
            yield f"\n[System Error: Alice is not responding. Details: {str(e)}]"

    return Response(stream_with_context(generate_response()),
                    content_type='text/event-stream')
