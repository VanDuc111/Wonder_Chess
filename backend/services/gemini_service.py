import os
import time
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

API_KEY = os.environ.get("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        print("DEBUG: Gemini Client (genai) khởi tạo thành công.")
    except Exception as e:
        print(f"Lỗi khởi tạo Gemini Client: {e}")
        API_KEY = None  # Vô hiệu hóa nếu cấu hình lỗi
else:
    print("CẢNH BÁO: Không tìm thấy GEMINI_API_KEY trong biến môi trường!")


def stream_gemini_response(prompt_context):
    """
    Gửi prompt đến Gemini, hỗ trợ stream và tự động thử lại (retry) khi bị quá tải (503).
    """

    if not API_KEY:
        yield "[Lỗi: Alice chưa được cấu hình (Thiếu API Key).]"
        return  # Dừng hàm generator

    # Cấu hình logic thử lại
    max_retries = 3
    delay_seconds = 2  # Bắt đầu với 2 giây

    for i in range(max_retries):
        try:
            # 1. Khởi tạo model (KHÔNG CÓ safety_settings)
            model = genai.GenerativeModel('gemini-2.5-flash')

            # 2. Gọi API để stream
            response_generator = model.generate_content(
                prompt_context,
                stream=True
                # KHÔNG có safety_settings
            )

            # 3. Stream (yield) từng chunk về cho Flask
            for chunk in response_generator:
                if chunk.text:
                    yield chunk.text

            # 4. Nếu stream thành công, thoát khỏi vòng lặp và kết thúc
            return

        except (google_exceptions.ResourceExhausted,
                google_exceptions.ServiceUnavailable,
                google_exceptions.DeadlineExceeded) as e:
            # 5. XỬ LÝ LỖI 503 (Overloaded / Quá tải)

            print(f"LỖI 503 (Overloaded) từ Gemini. Đang thử lại lần {i + 1}/{max_retries}...")

            if i < max_retries - 1:
                # Nếu chưa phải lần thử cuối, chờ và thử lại
                time.sleep(delay_seconds)
                delay_seconds *= 2  # Gấp đôi thời gian chờ
            else:
                # Nếu là lần thử cuối cùng, báo lỗi
                print("Hết số lần thử. Báo lỗi.")
                yield "[Lỗi AI: Máy chủ Gemini hiện đang quá tải. Vui lòng thử lại sau ít phút.]"

        except Exception as e:
            # 6. Bắt tất cả các lỗi khác (bao gồm cả 'dangerous_content' nếu nó vẫn xảy ra)
            print(f"LỖI KHÔNG XÁC ĐỊNH TRONG AI SERVICE: {e}")
            yield f"[Lỗi AI: {e}]"
            return