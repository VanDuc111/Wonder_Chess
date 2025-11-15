from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.engine.minimax import find_best_move
import chess

analysis_bp = Blueprint('analysis', __name__)


@analysis_bp.route('/chat_analysis', methods=['POST'])
def chat_analysis():
    # 1. Lấy tất cả dữ liệu từ frontend
    data = request.get_json()
    user_question = data.get('user_question')
    fen = data.get('fen')
    pgn = data.get('pgn')
    last_move_san = data.get('last_move_san', 'N/A')
    is_first_message = data.get('is_first_message', False)

    if not user_question or not fen:
        return jsonify({'success': False, 'error': 'Thiếu FEN hoặc câu hỏi người dùng.'}), 400

    # 2. Xây dựng chỉ dẫn chào hỏi
    greeting_instruction = ""
    if is_first_message:
        greeting_instruction = "Hãy bắt đầu câu trả lời của bạn bằng một lời chào thân thiện (ví dụ: 'Chào bạn!')."
    else:
        greeting_instruction = "Người dùng đã biết bạn là ai. Hãy **đi thẳng vào câu trả lời**, không cần chào hỏi."

    # 3. LUÔN LUÔN lấy dữ liệu engine (cho ngữ cảnh)
    engine_results = {'search_score': '0', 'best_move': 'N/A', 'pv': 'N/A'}
    try:
        engine_results_from_find = find_best_move(fen, depth=None)
        engine_results.update(engine_results_from_find)
    except Exception as e:
        print(f"LỖI ENGINE (find_best_move): {e}")

        def error_stream():
            yield f"Rất tiếc, engine cờ vua của tôi đã gặp lỗi khi phân tích thế cờ này. (Lỗi: {e})"

        return Response(stream_with_context(error_stream()), content_type='text/event-stream')

    # 4. LUÔN LUÔN định dạng điểm số
    raw_score = engine_results.get('search_score', '0')
    formatted_score = 'N/A'
    try:
        score_cp = int(raw_score)
        score_pawn = score_cp / 100.0
        formatted_score = f"{score_pawn:+.2f}"
    except ValueError:
        formatted_score = raw_score  # Giữ nguyên nếu là "#+1"

    # 5. LUÔN LUÔN chuyển đổi UCI sang SAN
    best_move_san = "N/A"
    best_move_uci = engine_results.get('best_move')
    if best_move_uci and best_move_uci != "N/A":
        try:
            board = chess.Board(fen)
            move = board.parse_uci(best_move_uci)
            best_move_san = board.san(move)
        except Exception as e:
            print(f"Lỗi chuyển đổi UCI sang SAN: {e}")
            best_move_san = best_move_uci

    # 6. LUÔN LUÔN xây dựng PROMPT ĐẦY ĐỦ
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

    # 7. Gọi Gemini
    def generate_response():
        try:
            for chunk in stream_gemini_response(prompt_context):
                yield chunk
        except Exception as e:
            print(f"Lỗi Streaming từ Gemini: {e}")
            yield f"\n[Lỗi: Không thể nhận phản hồi từ Alice.]"

    return Response(stream_with_context(generate_response()),
                    content_type='text/event-stream')