"""Dịch vụ tương tác với Google Gemini API."""
import os
import time
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# 1. CẤU HÌNH API KEY
API_KEY = os.environ.get("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
    except Exception as e:
        print(f"Client initialization error :{e}")
        API_KEY = None
else:
    print("Warning: Missing GEMINI_API_KEY environment variable.")

# 2. CẤU HÌNH AN TOÀN
# Tắt bớt các bộ lọc để Alice nói chuyện tự nhiên hơn
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}


def stream_gemini_response(prompt_context):
    """
    Gửi prompt đến Gemini, hỗ trợ stream an toàn và tự động thử lại.
    """

    if not API_KEY:
        yield "Gemini API Key missing."
        return
    max_retries = 3
    delay_seconds = 2

    for i in range(max_retries):
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')

            response_generator = model.generate_content(
                prompt_context,
                stream=True,
                safety_settings=SAFETY_SETTINGS
            )

            # 3. VÒNG LẶP XỬ LÝ STREAM
            for chunk in response_generator:
                try:

                    if chunk.text:
                        yield chunk.text
                except ValueError:
                    continue

            return

        except (google_exceptions.ResourceExhausted,
                google_exceptions.ServiceUnavailable,
                google_exceptions.DeadlineExceeded) as e:

            print(f"Gemini quá tải. Thử lại lần {i + 1}...")
            if i < max_retries - 1:
                time.sleep(delay_seconds)
                delay_seconds *= 2
            else:
                yield "Google server is currently busy. Please try again later."

        except Exception as e:
            print(f"Lỗi không xác định: {e}")
            yield f"Alice is experiencing technical difficulties. {str(e)}"
            return
