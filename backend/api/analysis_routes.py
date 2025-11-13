from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.engine.minimax import find_best_move, ENGINE_DEPTH
analysis_bp = Blueprint('analysis', __name__)


@analysis_bp.route('/chat_analysis', methods=['POST'])
def chat_analysis():
    data = request.get_json()
    user_question = data.get('user_question')
    fen = data.get('fen')
    pgn = data.get('pgn')
    last_move_san = data.get('last_move_san', 'N/A')

    if not fen or not user_question:
        return jsonify({'success': False, 'error': 'Thiếu FEN hoặc câu hỏi người dùng.'}), 400
    engine_results = {
        'search_score': '0',
        'best_move': 'N/A',
        'pv': 'Engine Failed'
    }

    try:
        engine_results = find_best_move(fen, depth=ENGINE_DEPTH)
    except Exception as e:
        print(f"Lỗi xử lý Engine: {e}")
        pass

        # === PHẦN SỬA LỖI ĐỊNH DẠNG ĐIỂM SỐ ===
    raw_score = engine_results.get('search_score', '0')
    formatted_score = 'N/A'  # Giá trị mặc định

    try:
        score_cp = int(raw_score)

        score_pawn = score_cp / 100.0

        formatted_score = f"{score_pawn:+.2f}"

    except ValueError:
        if raw_score.startswith('#'):
            formatted_score = f"Mate ({raw_score})"
        else:
            formatted_score = raw_score

        # 2. XÂY DỰNG PROMPT CHO GEMINI
    prompt_context = f"""
    Bạn là **Alice**, một **Trợ lý Cờ vua Cấp độ Đại kiện tướng (Grandmaster Level)**.
    Nhiệm vụ của bạn là **trả lời câu hỏi cờ vua của người dùng** một cách thân thiện, chuyên nghiệp và khích lệ.
    **HƯỚNG DẪN QUAN TRỌNG:** Người dùng đã biết bạn là ai. Hãy **đi thẳng vào câu trả lời**,
     không cần bất kỳ lời chào hỏi nào (như "Chào bạn!", "Rất vui được hỗ trợ...", "Tôi là Alice...").

    **Ngữ cảnh (Context) cho bạn:**
    Đây là dữ liệu phân tích của bàn cờ MÀ NGƯỜI DÙNG ĐANG XEM.
    - Lịch sử PGN ván cờ: {pgn}
    - Nước đi VỪA MỚI XẢY RA (dẫn đến FEN hiện tại): {last_move_san}
    - Vị trí (FEN) (Sau nước đi đó): {fen}
    - Đánh giá thế cờ (Score): {formatted_score}
    - Nước đi tốt nhất tiếp theo (Best Move): {engine_results['best_move']}
    - Chuỗi nước đi chính (PV): {engine_results['pv']}

    ---
    **HƯỚNG DẪN TRẢ LỜI (RẤT QUAN TRỌNG):**

    **Ưu tiên 1: Trả lời trực tiếp câu hỏi của người dùng.**
    Đọc kỹ "{user_question}".
    * **Nếu câu hỏi là về KIẾN THỨC CHUNG** (ví dụ: "Khai cuộc Ruy Lopez là gì?", "luật bắt Tốt qua đường là gì?", "ai là vua cờ?")
    , hãy trả lời câu hỏi đó mà **KHÔNG** đề cập đến FEN, Đánh giá thế cờ
    , hay Nước đi tốt nhất (vì chúng không liên quan).
    * **Nếu câu hỏi là về PHÂN TÍCH BÀN CỜ** (ví dụ: "Nước nào tốt nhất cho tôi?", "Ai đang thắng?", "Nước đi của tôi có tốt không?")
    , thì lúc đó bạn MỚI được sử dụng "Dữ liệu Phân tích Engine" ở trên để giải thích.
    * **TRƯỜNG HỢP ĐẶC BIỆT: Nếu hỏi về "điểm số" (ví dụ: "điểm số hiện tại?", "sao lại là +0.16?", "giải thích điểm"):**
      Người dùng đã thấy con số {formatted_score}. **ĐỪNG** chỉ lặp lại nó hoặc giải thích "0.16 = 0.16 Tốt".
      Thay vào đó, hãy:
      1. Nhìn vào "Nước đi VỪA MỚI XẢY RA ({last_move_san})".
      2. Giải thích **mục đích** của nước đi đó. (ví dụ: "Nước {last_move_san} vừa rồi là một nước đi phát triển, nhằm kiểm soát trung tâm...")
      3. Giải thích **tại sao** điểm số là {formatted_score}. (ví dụ: "...và Engine đánh giá đây là một nước đi tốt, giúp củng cố lợi thế.")
      4. Đề cập đến **"Nước đi TỐT NHẤT tiếp theo ({engine_results['best_move']})"** như một cách để đối phó hoặc phát huy lợi thế.
    **Ưu tiên 2: Giọng điệu.**
    Luôn thân thiện, chuyên nghiệp và khích lệ. Sử dụng **bold** (dấu **) để nhấn mạnh các thuật ngữ quan trọng.

    **Giải thích điểm số (Chỉ khi được hỏi):**
    * Điểm 1.00 tương đương lợi thế 1 Tốt cho Trắng.
    * Điểm số âm là lợi thế cho Đen.

    ---
    **Câu hỏi của người dùng:** "{user_question}"
    """

    def generate_response():
        try:
            # Gọi hàm streaming mới
            for chunk in stream_gemini_response(prompt_context):
                # Gửi từng phần dữ liệu văn bản (text)
                # Dùng format 'data: chunk\n\n' là chuẩn cho Server-Sent Events (SSE)
                yield chunk
        except Exception as e:
            print(f"Lỗi Streaming từ Gemini: {e}")
            # Có thể gửi một thông báo lỗi cuối cùng
            yield f"\n[Lỗi: Không thể nhận phản hồi từ Alice.]"


    # 4. TRẢ VỀ FLASK RESPONSE VỚI STREAMING
    # Sử dụng `stream_with_context` để đảm bảo context Flask được giữ
    return Response(stream_with_context(generate_response()),
                    # Content-Type chuẩn cho streaming text/event
                    content_type='text/event-stream')