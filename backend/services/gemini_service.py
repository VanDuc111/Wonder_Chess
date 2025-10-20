# backend/services/gemini_service.py

import os
from google import genai
from google.genai.errors import APIError

API_KEY = os.environ.get("GEMINI_API_KEY")

client = None;
if API_KEY:
    try:
        # Client sẽ được khởi tạo với khóa API tìm thấy
        client = genai.Client(api_key=API_KEY)
        print("DEBUG: Gemini Client khởi tạo thành công.")
    except Exception as e:
        print(f"Lỗi khởi tạo Gemini Client: {e}")
else:
    print("CẢNH BÁO: Không tìm thấy GEMINI_API_KEY trong biến môi trường!")


def stream_gemini_response(prompt_context) -> str:
    """Gửi prompt phân tích cờ vua đến Gemini và trả về câu trả lời."""

    if not client:
        return "Alice chưa được cấu hình (Thiếu API Key). Vui lòng kiểm tra file .env."

    try:
        response = client.models.generate_content_stream(
            model='gemini-2.5-flash',  # Hoặc mô hình bạn đang dùng
            contents=[prompt_context]
        )

        # Generator này sẽ trả về từng chunk (mảnh) của văn bản
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except APIError as e:
        # Lỗi thường gặp: Khóa API không hợp lệ hoặc lỗi kết nối
        print(f"LỖI API GEMINI (Lỗi 500 nếu không được xử lý): {e}")
        return "Xin lỗi, tôi gặp sự cố khi giao tiếp với máy chủ AI. (Lỗi API)"
    except Exception as e:
        print(f"LỖI KHÔNG XÁC ĐỊNH TRONG AI SERVICE: {e}")
        return "Đã xảy ra lỗi không mong muốn."