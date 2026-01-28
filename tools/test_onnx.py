from backend.services.image_to_fen import analyze_image_to_fen
import os

def test_inference():
    # Find any image in tests directory or use a dummy
    test_img = 'temp_upload.jpg' # Assuming this might exist from previous runs
    if not os.path.exists(test_img):
        print(f"Test image {test_img} not found. Skipping test.")
        return
        
    print(f"Testing ONNX inference with {test_img}...")
    fen, debug, warped, error = analyze_image_to_fen(test_img)
    
    if error:
        print(f"❌ Test Failed: {error}")
    else:
        print(f"✅ Test Success!")
        print(f"FEN: {fen}")
        if warped:
            print("Warped image generated successfully.")

if __name__ == "__main__":
    test_inference()
