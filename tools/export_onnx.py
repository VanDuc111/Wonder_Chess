from ultralytics import YOLO
import os

def export_models():
    models_dir = os.path.join('backend', 'models')
    board_path = os.path.join(models_dir, 'chessboard_detector_best.pt')
    pieces_path = os.path.join(models_dir, 'chess_pieces_detector_best.pt')
    
    print("--- Exporting models to ONNX ---")
    
    if os.path.exists(board_path):
        print(f"Exporting {board_path}...")
        model = YOLO(board_path)
        model.export(format='onnx', imgsz=640)
    else:
        print(f"File not found: {board_path}")
        
    if os.path.exists(pieces_path):
        print(f"Exporting {pieces_path}...")
        model = YOLO(pieces_path)
        model.export(format='onnx', imgsz=640)
    else:
        print(f"File not found: {pieces_path}")

if __name__ == "__main__":
    export_models()
