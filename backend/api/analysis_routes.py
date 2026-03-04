"""
Analysis API Routes
Coordinates chessboard analysis and Alice (Gemini AI) chat responses.
Skinny route design that connects Engine results with AnalysisManager context.
"""

from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.services.gemini_service import stream_gemini_response
from backend.services.analysis_manager import ChessAnalysisManager
from backend.services.engine_service import engine_service
from backend.config import (
    EngineConfig,
    AIConfig,
    ErrorMessages,
    HTTPStatus
)

analysis_bp = Blueprint('analysis', __name__)
analysis_manager = ChessAnalysisManager()


@analysis_bp.route('/chat_analysis', methods=['POST'])
def chat_analysis() -> Response:
    """
    API for board analysis and chatting with Alice (Gemini AI).
    Combines engine evaluations with AI reasoning for expert feedback.
    """
    data = request.get_json()
    user_question = data.get('user_question')
    fen = data.get('fen')
    is_first_message = data.get('is_first_message', False)

    # Basic Validation
    if not user_question or not fen:
        return jsonify({
            'success': False, 
            'error': ErrorMessages.MISSING_FEN_OR_QUESTION
        }), HTTPStatus.BAD_REQUEST

    # 1. Determine conversation context (greeting or response)
    greeting_instruction = (
        AIConfig.GREETING_FIRST_MESSAGE if is_first_message 
        else AIConfig.GREETING_SUBSEQUENT
    )

    # 2. Gather engine data using abstracted service layer (guaranteed format)
    try:
        engine_results = engine_service.get_best_move(
            fen=fen,
            engine_choice='stockfish',
            time_limit=EngineConfig.CHAT_ANALYSIS_TIME_LIMIT,
            skill_level=EngineConfig.MAX_SKILL_LEVEL
        )
    except Exception as e:
        print(f"Engine Service Warning during chat_analysis: {e}")
        engine_results = AIConfig.DEFAULT_ENGINE_RESULTS.copy()
        engine_results['success'] = False

    # 3. Process context via AnalysisManager (heavy lifting calculations)
    ctx = analysis_manager.prepare_analysis_context(data, engine_results)

    # 4. Construct instruction prompt for Alice
    prompt_context = f"""
    Bạn là **Alice**, một **Trợ lý Cờ vua Đại kiện tướng (GM)** sắc sảo, thân thiện và am hiểu sâu sắc về văn hóa cờ vua.
    {greeting_instruction}

    **CÂU HỎI NGƯỜI DÙNG:** "{user_question}"

    **CÁCH TIẾP CẬN TRẢ LỜI:**
    1. **Nếu câu hỏi về LUẬT CHƠI, KỸ THUẬT (ví dụ: "Nhập thành là gì?", "Quân mã đi thế nào?") hay KIẾN THỨC CHUNG:**
       - Hãy tập trung giải thích kiến thức đó một cách chi tiết và dễ hiểu nhất.
       - **BỎ QUA** phần phân tích bàn cờ hiện tại trừ khi người dùng yêu cầu hoặc kiến thức đó liên quan trực tiếp đến thế trận hiện tại.
       - Viết trong khoảng {AIConfig.MIN_RESPONSE_SENTENCES}-{AIConfig.MAX_RESPONSE_SENTENCES} câu.

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
    - Trả lời trong khoảng {AIConfig.MIN_RESPONSE_SENTENCES}-{AIConfig.MAX_RESPONSE_SENTENCES} câu.
    - Luôn **in đậm** mọi nước đi (ví dụ: **e4**, **{ctx['best_move_san']}**).
    - Nếu phân tích nước đi, hãy nêu rõ vì sao nước đó tốt hay xấu dựa trên chênh lệch `{ctx['diff']:+.2f}`.
    """

    # 5. Handle streaming response from Gemini service
    def generate_response():
        try:
            for chunk in stream_gemini_response(prompt_context):
                yield chunk
        except Exception as e:
            yield f"\n[Error connecting to AI: {str(e)}]"

    return Response(stream_with_context(generate_response()), content_type='text/event-stream')
