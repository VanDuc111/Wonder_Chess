"""
Module: analysis_routes.py
Mô tả: Xử lý các yêu cầu phân tích trận đấu sử dụng AI (Gemini).
Chức năng chính: Nhận câu hỏi từ người dùng, kết hợp với dữ liệu Engine (FEN, Score, Best Move)
để tạo ra prompt và gửi đến Gemini, sau đó stream câu trả lời về frontend.
"""

from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.engines.minimax import find_best_move
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
    if fen:
        try:
            board = chess.Board(fen)
            if not board.is_valid():
                engine_error_message = "Invalid FEN: Board state is illegal.."
            else:
                # Gọi Engine
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
    raw_score = engine_results.get('search_score', '0')
    formatted_score = raw_score

    if raw_score != 'N/A' and 'M' not in str(raw_score):
        try:
            float_score = float(raw_score)
            formatted_score = f"{float_score:+.2f}"
        except:
            formatted_score = raw_score

    # 5. Chuyển đổi nước đi tốt nhất sang SAN (UCI -> SAN)
    best_move_san = "N/A"
    best_move_uci = engine_results.get('best_move')
    if best_move_uci and best_move_uci != "N/A" and fen and not engine_error_message:
        try:
            board = chess.Board(fen)
            move = board.parse_uci(best_move_uci)
            best_move_san = board.san(move)
        except Exception as e:
            print(f"SAN Conversion Error: {e}")
            best_move_san = best_move_uci

    # 6. Xây dựng Prompt
    if engine_error_message:
        error_instruction = f"""
            ⚠️ **CẢNH BÁO TỪ HỆ THỐNG:** Hiện tại Engine đang gặp lỗi: "{engine_error_message}".
            -> **NHIỆM VỤ CỦA BẠN:** Hãy thông báo khéo léo cho người dùng biết rằng hình ảnh bàn cờ có thể bị mờ, thiếu quân hoặc sai luật. Khuyên họ kiểm tra lại hoặc chụp ảnh khác.
            -> Đừng cố phân tích sâu thế cờ nếu nó bị lỗi, hãy trả lời dựa trên kiến thức chung nếu có thể.
            """
    else:
        # Nếu không lỗi, để trống (hoặc có thể thêm hướng dẫn phân tích sâu nếu muốn)
        error_instruction = "Dữ liệu Engine hợp lệ. Hãy phân tích chi tiết dựa trên Điểm số và Nước đi tốt nhất."

    prompt_context = f"""
    Bạn là **Alice**, một **Trợ lý Cờ vua Cấp độ Đại kiện tướng (GM)**, với giọng điệu phân tích sắc sảo, chuyên nghiệp và "người" hơn.
    {greeting_instruction}

    **HƯỚNG DẪN PHÂN TÍCH (RẤT QUAN TRỌNG):**

    1.  **PHÂN TÍCH HAI CHIỀU (TỐT & XẤU):**
        * **Nếu điểm số rất TỆ** (ví dụ: `{formatted_score}` nhỏ hơn -1.5 hoặc lớn hơn 1.5): Hãy gọi nước đi trước đó (`{last_move_san}`) là một **"sai lầm nghiêm trọng" (blunder)**.
        * **Nếu điểm số rất TỐT**: Hãy gọi nước đi trước đó (`{last_move_san}`) là một **"nước đi tuyệt vời" (brilliant move)** hoặc **"sắc sảo" (sharp move)**.
        * **Nếu điểm số CÂN BẰNG**: Hãy gọi đó là một "nước đi phát triển tốt" hoặc "hợp lý".

    2.  **KHÔNG DẬP KHUÔN:** **Tuyệt đối không** được nói câu "điểm -2.76 tương đương gần 3 Tốt". Hãy diễn giải ý nghĩa của điểm số (ví dụ: "Đen đang có lợi thế thắng rõ rệt.").

    3.  **DÙNG ĐÚNG KÝ HIỆU (SAN):** Luôn sử dụng Ký hiệu Đại số Tiêu chuẩn (SAN) (ví dụ: **Nxh6**), KHÔNG dùng 'g8h6'.

    **NGỮ CẢNH (Context) CHO BẠN:**
    (AI sẽ tự quyết định có dùng cái này hay không dựa trên HƯỚNG DẪN TRẢ LỜI)
    - Nước đi VỪA MỚI XẢY RA (SAN): **{last_move_san}**
    - Vị trí (FEN) (SAU nước đi đó): {fen}
    - Đánh giá thế cờ (Score): **{formatted_score}**
    - Nước đi TỐT NHẤT tiếp theo (SAN): **{best_move_san}**
    - Chuỗi nước đi chính (PV - có thể là UCI): {engine_results.get('pv', 'N/A')}
    {error_instruction}

    ---
    **HƯỚG DẪN TRẢ LỜI:**

    Đọc kỹ "{user_question}":

    * **Nếu là KIẾN THỨC CHUNG** (ví dụ: "Ruy Lopez là gì?", "xin chào"):
        Trả lời câu hỏi đó mà **KHÔNG** đề cập đến "NGỮ CẢNH" (FEN, Score, Best Move).

    * **Nếu là PHÂN TÍCH BÀN CỜ** (ví dụ: "Nước nào tốt nhất?", "trắng đi gì tiếp?", "Ai đang thắng?"):
        Sử dụng "NGỮ CẢNH" ở trên để giải thích, tuân thủ các "HƯỚNG DẪN PHÂN TÍCH".

    * **TRƯỜNG HỢP ĐẶC BIỆT: Nếu hỏi về "điểm số"** (ví dụ: "giải thích điểm số?"):
        Người dùng đã thấy con số {formatted_score}. ĐỪNG lặp lại nó.
        Hãy tuân thủ các bước sau:
        1. Nhìn vào "Nước đi VỪA MỚI XẢY RA ({last_move_san})".
        2. Giải thích **tại sao** nó dẫn đến điểm số {formatted_score} (gọi nó là 'sai lầm' hoặc 'nước đi tuyệt vời').
        3. Đề cập đến **"Nước đi TỐT NHẤT tiếp theo ({best_move_san})"**.
    ---
    **Câu hỏi của người dùng:** "{user_question}"
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
