import cv2
import numpy as np
import onnxruntime as ort

class YOLOv8ONNX:
    def __init__(self, model_path, imgsz=640, conf_threshold=0.25, iou_threshold=0.45):
        self.imgsz = imgsz
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        # Load the ONNX model
        self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        
        # Get class names from metadata if available (standard for YOLOv8 export)
        # For simplicity, we'll let the user pass them or we'll extract them elsewhere.
        # However, YOLOv8 ONNX often has the metadata embedded.
        self.names = None # Will be set by service if needed

    def preprocess(self, img):
        h, w = img.shape[:2]
        # Letterbox resize
        scale = min(self.imgsz / h, self.imgsz / w)
        new_w, new_h = int(w * scale), int(h * scale)
        img_resized = cv2.resize(img, (new_w, new_h))
        
        # Create canvas
        canvas = np.full((self.imgsz, self.imgsz, 3), 114, dtype=np.uint8)
        canvas[(self.imgsz - new_h) // 2 : (self.imgsz - new_h) // 2 + new_h,
               (self.imgsz - new_w) // 2 : (self.imgsz - new_w) // 2 + new_w, :] = img_resized
        
        # HWC to CHW, BGR to RGB, Normalize
        img_input = canvas.transpose(2, 0, 1)[::-1] # BGR to RGB
        img_input = np.ascontiguousarray(img_input).astype(np.float32) / 255.0
        img_input = img_input[None] # Add batch dimension
        
        return img_input, (h, w), (new_h, new_w)

    def postprocess(self, output, orig_shape, new_shape):
        preds = np.squeeze(output) # (8400, 4+num_classes) maybe, or (4+num_classes, 8400)
        # YOLOv8 output is usually (1, 4+num_classes, 8400)
        if preds.shape[0] > preds.shape[1]:
            preds = preds.T # Ensure shape is (num_values, 8400)
            
        boxes = preds[:4, :]
        scores = preds[4:, :]
        
        max_scores = np.max(scores, axis=0)
        class_ids = np.argmax(scores, axis=0)
        
        mask = max_scores > self.conf_threshold
        boxes = boxes[:, mask]
        scores = max_scores[mask]
        class_ids = class_ids[mask]
        
        if len(boxes) == 0:
            return []

        # Convert xywh to xyxy
        x, y, w, h = boxes
        x1 = x - w / 2
        y1 = y - h / 2
        x2 = x + w / 2
        y2 = y + h / 2
        
        # Scale back to original image
        orig_h, orig_w = orig_shape
        new_h, new_w = new_shape
        pad_h = (self.imgsz - new_h) / 2
        pad_w = (self.imgsz - new_w) / 2
        
        x1 = (x1 - pad_w) / (new_w / orig_w)
        y1 = (y1 - pad_h) / (new_h / orig_h)
        x2 = (x2 - pad_w) / (new_w / orig_w)
        y2 = (y2 - pad_h) / (new_h / orig_h)
        
        boxes_xyxy = np.stack([x1, y1, x2, y2], axis=1)
        
        # NMS
        indices = cv2.dnn.NMSBoxes(boxes_xyxy.tolist(), scores.tolist(), self.conf_threshold, self.iou_threshold)
        
        results = []
        if len(indices) > 0:
            for i in indices.flatten():
                box = boxes_xyxy[i]
                results.append({
                    'box': box, # [x1, y1, x2, y2]
                    'conf': scores[i],
                    'class': class_ids[i]
                })
        return results

    def predict(self, img, conf=None):
        if conf:
            self.conf_threshold = conf
            
        img_input, orig_shape, new_shape = self.preprocess(img)
        outputs = self.session.run(None, {self.input_name: img_input})
        results = self.postprocess(outputs[0], orig_shape, new_shape)
        
        return results
