import cv2
import numpy as np
import onnxruntime as ort

class YOLOv8ONNX:
    def __init__(self, model_path, imgsz=640, conf_threshold=0.25, iou_threshold=0.45):
        self.imgsz = imgsz
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model_path = model_path
        
        # Tối ưu hóa cho môi trường ít RAM (như Render 512MB)
        self.options = ort.SessionOptions()
        self.options.intra_op_num_threads = 1
        self.options.inter_op_num_threads = 1
        self.options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        self.options.enable_cpu_mem_arena = False # Giảm việc chiếm giữ RAM dư thừa
        
        self._load_session()

    def _load_session(self):
        # Load the ONNX model
        self.session = ort.InferenceSession(self.model_path, self.options, providers=['CPUExecutionProvider'])
        self.inputs = self.session.get_inputs()
        self.outputs = self.session.get_outputs()
        self.input_name = self.inputs[0].name
        
        # Determine if it's a segmentation model
        self.is_segmentation = len(self.outputs) > 1
        
        # Get class names from metadata
        self.names = None
        try:
            metadata = self.session.get_modelmeta().custom_metadata_map
            if 'names' in metadata:
                import ast
                self.names = ast.literal_eval(metadata['names'])
        except:
            pass

    def clear(self):
        """Giải phóng bộ nhớ bằng cách xóa session"""
        if hasattr(self, 'session'):
            del self.session
            import gc
            gc.collect()

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

    def sigmoid(self, x):
        return 1 / (1 + np.exp(-x))

    def process_mask(self, protos, masks_in, bboxes, shape):
        """
        Process masks for instance segmentation.
        protos: [32, 160, 160]
        masks_in: [n, 32]
        bboxes: [n, 4] (xyxy, scaled to canvas size)
        shape: (h, w) original image shape
        """
        c, mh, mw = protos.shape
        # Matrix multiply: [n, 32] @ [32, 160*160] -> [n, 160*160]
        masks = (masks_in @ protos.reshape(c, -1)).reshape(-1, mh, mw)
        masks = self.sigmoid(masks)
        
        # Rescale masks to canvas size (imgsz x imgsz)
        results = []
        for i in range(len(masks)):
            mask = masks[i]
            # Resize mask to imgsz x imgsz
            mask = cv2.resize(mask, (self.imgsz, self.imgsz))
            
            # Crop mask by bbox (in canvas coordinates)
            x1, y1, x2, y2 = bboxes[i]
            # Ensure coordinates are within bounds
            x1, y1 = max(0, int(x1)), max(0, int(y1))
            x2, y2 = min(self.imgsz, int(x2)), min(self.imgsz, int(y2))
            
            # Zero out outside bbox
            mask_cropped = np.zeros_like(mask)
            mask_cropped[y1:y2, x1:x2] = mask[y1:y2, x1:x2]
            
            # Threshold
            mask_binary = (mask_cropped > 0.5).astype(np.uint8)
            
            # Rescale back to original image size
            # 1. Reverse letterbox
            orig_h, orig_w = shape
            scale = min(self.imgsz / orig_h, self.imgsz / orig_w)
            new_w, new_h = int(orig_w * scale), int(orig_h * scale)
            pad_h = (self.imgsz - new_h) // 2
            pad_w = (self.imgsz - new_w) // 2
            
            # Crop padding
            mask_binary = mask_binary[pad_h : pad_h + new_h, pad_w : pad_w + new_w]
            # Resize to original
            mask_final = cv2.resize(mask_binary, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
            results.append(mask_final)
            
        return results

    def extract_polygon(self, mask):
        """
        Extract the largest 4-point polygon from a binary mask.
        """
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        
        # Get the largest contour
        cnt = max(contours, key=cv2.contourArea)
        
        # Exact 4 points approximation
        peri = cv2.arcLength(cnt, True)
        
        # Try a few epsilon factors to find a 4-point polygon
        for eps_factor in [0.02, 0.05, 0.1]:
            approx = cv2.approxPolyDP(cnt, eps_factor * peri, True)
            if len(approx) == 4:
                return approx.reshape(4, 2)
                
        # If not 4 points, return the bounding box of the contour or just the points
        # But for chessboard, we really want 4 points
        # Fallback: get convex hull and simplify
        hull = cv2.convexHull(cnt)
        peri_hull = cv2.arcLength(hull, True)
        approx = cv2.approxPolyDP(hull, 0.05 * peri_hull, True)
        if len(approx) >= 4:
             # Take top 4 points or simplify further? 
             # For now, let's just return what we have
             return approx.reshape(-1, 2)
             
        return None

    def postprocess(self, outputs, orig_shape, new_shape):
        preds = np.squeeze(outputs[0]) # (num_values, 8400)
        
        if preds.shape[0] > preds.shape[1]:
            preds = preds.T
            
        # Standard yolo: [4 boxes, nc classes, 32 mask_coeffs (if seg)]
        boxes = preds[:4, :]
        
        if self.is_segmentation:
            # Output 0 for seg is usually [4 boxes, nc classes, 32 mask_coeffs]
            # To find nc, we check the shape
            nc = preds.shape[0] - 4 - 32
            scores = preds[4 : 4 + nc, :]
            mask_coeffs = preds[4 + nc :, :]
        else:
            scores = preds[4:, :]
        
        max_scores = np.max(scores, axis=0)
        class_ids = np.argmax(scores, axis=0)
        
        mask = max_scores > self.conf_threshold
        boxes = boxes[:, mask]
        scores = max_scores[mask]
        class_ids = class_ids[mask]
        if self.is_segmentation:
            mask_coeffs = mask_coeffs[:, mask]
        
        if len(boxes) == 0:
            return []

        # Convert xywh to xyxy (still in canvas coordinates 0-imgsz)
        x, y, w, h = boxes
        x1 = x - w / 2
        y1 = y - h / 2
        x2 = x + w / 2
        y2 = y + h / 2
        boxes_canvas = np.stack([x1, y1, x2, y2], axis=1)
        
        # NMS
        indices = cv2.dnn.NMSBoxes(boxes_canvas.tolist(), scores.tolist(), self.conf_threshold, self.iou_threshold)
        
        results = []
        if len(indices) > 0:
            indices = indices.flatten()
            
            # If segmentation, process masks
            final_masks = []
            if self.is_segmentation:
                protos = np.squeeze(outputs[1]) # [32, 160, 160]
                final_masks = self.process_mask(protos, mask_coeffs[:, indices].T, boxes_canvas[indices], orig_shape)

            for i, idx in enumerate(indices):
                box = boxes_canvas[idx]
                
                # Scale box back to original image
                orig_h, orig_w = orig_shape
                new_h, new_w = new_shape
                pad_h = (self.imgsz - new_h) / 2
                pad_w = (self.imgsz - new_w) / 2
                
                rx1 = (box[0] - pad_w) / (new_w / orig_w)
                ry1 = (box[1] - pad_h) / (new_h / orig_h)
                rx2 = (box[2] - pad_w) / (new_w / orig_w)
                ry2 = (box[3] - pad_h) / (new_h / orig_h)
                
                res = {
                    'box': [rx1, ry1, rx2, ry2],
                    'conf': float(scores[idx]),
                    'class': int(class_ids[idx])
                }
                
                if self.is_segmentation:
                    m = final_masks[i]
                    res['mask'] = m
                    res['polygon'] = self.extract_polygon(m)
                
                results.append(res)
                
        return results

    def predict(self, img, conf=None):
        if conf:
            self.conf_threshold = conf
            
        img_input, orig_shape, new_shape = self.preprocess(img)
        outputs = self.session.run(None, {self.input_name: img_input})
        results = self.postprocess(outputs, orig_shape, new_shape)
        
        return results

