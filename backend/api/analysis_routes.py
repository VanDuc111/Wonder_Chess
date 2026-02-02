"""
Module: analysis_routes.py
Mô tả: API điều phối phân tích bàn cờ. Kết nối dữ liệu từ Engine và AnalysisManager 
để tạo ngữ cảnh cho AI API, giúp Alice đưa ra nhận xét chuyên sâu và chính xác.
"""

from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.services.analysis_manager import ChessAnalysisManager
from backend.engines.minimax import find_best_move
from backend.engines.stockfish_engine import get_stockfish_move
import chess

analysis_bp = Blueprint('analysis', __name__)
analysis_manager = ChessAnalysisManager()

@analysis_bp.route('/chat_analysis', methods=['POST'])
def chat_analysis() -> Response:
    """
    API phân tích bàn cờ và trò chuyện với Alice (Gemini).
    Skinny Route: Chỉ chịu trách nhiệm kết nối Dữ liệu, Engine và AI.
    """
    data = request.get_json()
    user_question = data.get('user_question')
    fen = data.get('fen')
    is_first_message = data.get('is_first_message', False)

    if not user_question or not fen:
        return jsonify({'success': False, 'error': 'Thiếu FEN hoặc câu hỏi người dùng.'}), 400

    # 1. Khởi tạo hướng dẫn chào hỏi
    greeting_instruction = (
        "Hãy chào ngắn gọn và thân thiện (ví dụ: 'Chào bạn! Alice đây.'). Tuyệt đối KHÔNG dùng những câu văn mẫu như '64 ô huyền diệu'." if is_first_message 
        else "Hãy đi thẳng vào câu trả lời, không cần chào hỏi."
    )

    # 2. Thu thập dữ liệu từ Engine
    engine_results = {'search_score': '0', 'best_move': 'N/A', 'pv': 'N/A'}
    try:
        # Ưu tiên Stockfish cho độ chính xác cao
        engine_sf = get_stockfish_move(fen, skill_level=20, time_limit=0.5)
        if engine_sf.get('success'):
            engine_results.update(engine_sf)
        else:
            engine_results.update(find_best_move(fen))
    except Exception as e:
        print(f"Engine Warning: {e}")

    # 3. Sử dụng AnalysisManager để xử lý logic "nặng" (Calculations & Formatting)
    ctx = analysis_manager.prepare_analysis_context(data, engine_results)

    # 4. Xây dựng Prompt
    prompt_context = f"""
    Bạn là **Alice**, một **Trợ lý Cờ vua Đại kiện tướng (GM)** sắc sảo, thân thiện và am hiểu sâu sắc về văn hóa cờ vua.
    {greeting_instruction}

    **CÂU HỎI NGƯỜI DÙNG:** "{user_question}"

    **CÁCH TIẾP CẬN TRẢ LỜI:**
    1. **Nếu câu hỏi về LUẬT CHƠI, KỸ THUẬT (ví dụ: "Nhập thành là gì?", "Quân mã đi thế nào?") hay KIẾN THỨC CHUNG:**
       - Hãy tập trung giải thích kiến thức đó một cách chi tiết và dễ hiểu nhất.
       - **BỎ QUA** phần phân tích bàn cờ hiện tại trừ khi người dùng yêu cầu hoặc kiến thức đó liên quan trực tiếp đến thế trận hiện tại.
       - Viết trong khoảng 4-5 câu.

    2. **Nếu câu hỏi về KHAI CUỘC (ví dụ: "Đây là khai cuộc gì?", "Khai cuộc này có mục tiêu gì?"):**
       - Xác định: **{ctx['opening_name']}**.
       - Giải thích ngắn gọn chiến lược của khai cuộc này và các nước đi tiếp theo thường thấy.

    3. **Nếu câu hỏi về THẾ TRẬN HIỆN TẠI hoặc đặt câu hỏi chung chung:**
       - Áp dụng dữ liệu phân tích dưới đây để nhận xét ván đấu theo phong thái Pro.

    **DỮ LIỆU PHÂN TÍCH TRẬN ĐẤU (Ngữ cảnh):**
    - Thế trận: {ctx['formatted_score']} ({ctx['last_player']} vừa đi **{ctx['last_move_san']}**)
    - Chênh lệch: {ctx['diff_str']} -> **{ctx['quality_label']}**
    - Lịch sử (PGN): {ctx['pgn']}
    - Gợi ý tốt nhất: **{ctx['best_move_san']}**
    - Biến hóa (PV): {ctx['engine_pv']}

    **QUY TẮC BẮT BUỘC:**
    - Trả lời trong khoảng 4-5 câu.
    - Luôn **in đậm** mọi nước đi (ví dụ: **e4**, **{ctx['best_move_san']}**).
    - Nếu phân tích nước đi, hãy nêu rõ vì sao nước đó tốt hay xấu dựa trên chênh lệch `{ctx['diff']:+.2f}`.
    """

    # 5. Stream phản hồi từ Gemini
    def generate_response():
        try:
            for chunk in stream_gemini_response(prompt_context):
                yield chunk
        except Exception as e:
            yield f"\n[Error: {str(e)}]"

    return Response(stream_with_context(generate_response()), content_type='text/event-stream')
