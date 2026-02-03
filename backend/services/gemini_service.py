"""
Google Gemini API Service
Handles interaction with Google's Gemini AI for chess analysis and chat.
Includes retry logic, safety settings, and streaming support.
"""

import os
import time
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from backend.config import GeminiConfig


# ==================== API CONFIGURATION ====================

API_KEY = os.environ.get("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
    except Exception as e:
        print(f"Client initialization error: {e}")
        API_KEY = None
else:
    print(GeminiConfig.WARNING_MISSING_KEY)


# ==================== SAFETY SETTINGS ====================

# Disable content filters for more natural chess conversation
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}


# ==================== STREAMING FUNCTION ====================

def stream_gemini_response(prompt_context: str):
    """
    Send prompt to Gemini with streaming support and automatic retry.
    
    Args:
        prompt_context: Complete prompt with chess analysis context
        
    Yields:
        str: Text chunks from Gemini's response
        
    Features:
        - Automatic retry with exponential backoff
        - Handles rate limiting and server errors
        - Streams response for better UX
        - Safety settings configured for chess discussion
        
    Retry Strategy:
        - Max retries: 3
        - Initial delay: 2 seconds
        - Backoff multiplier: 2x (2s → 4s → 8s)
        
    Error Handling:
        - ResourceExhausted: API quota exceeded
        - ServiceUnavailable: Server temporarily down
        - DeadlineExceeded: Request timeout
        - Generic Exception: Unexpected errors
    """
    if not API_KEY:
        yield GeminiConfig.ERROR_API_KEY_MISSING
        return
    
    delay_seconds = GeminiConfig.INITIAL_RETRY_DELAY

    for attempt in range(GeminiConfig.MAX_RETRIES):
        try:
            # Initialize model for this attempt
            model = genai.GenerativeModel(GeminiConfig.MODEL_NAME)

            # Generate content with streaming
            response_generator = model.generate_content(
                prompt_context,
                stream=True,
                safety_settings=SAFETY_SETTINGS
            )

            # Stream response chunks
            for chunk in response_generator:
                try:
                    if chunk.text:
                        yield chunk.text
                except ValueError:
                    # Skip chunks without text (safety blocks, etc.)
                    continue

            # Success - exit retry loop
            return

        except (
            google_exceptions.ResourceExhausted,
            google_exceptions.ServiceUnavailable,
            google_exceptions.DeadlineExceeded
        ) as e:
            # Retriable errors - server overload or timeout
            print(f"Gemini overloaded. Retry attempt {attempt + 1}/{GeminiConfig.MAX_RETRIES}...")
            
            if attempt < GeminiConfig.MAX_RETRIES - 1:
                # Wait with exponential backoff
                time.sleep(delay_seconds)
                delay_seconds *= GeminiConfig.RETRY_BACKOFF_MULTIPLIER
            else:
                # Final attempt failed
                yield GeminiConfig.ERROR_SERVER_BUSY

        except Exception as e:
            # Non-retriable error - fail immediately
            print(f"Unexpected Gemini error: {e}")
            yield f"{GeminiConfig.ERROR_TECHNICAL_DIFFICULTY} {str(e)}"
            return
