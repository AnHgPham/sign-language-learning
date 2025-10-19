#!/usr/bin/env python3
"""
YOLO Sign Language Detection Service
Provides inference endpoint for real-time sign language detection
"""

import json
import sys
import base64
from io import BytesIO
from pathlib import Path
import numpy as np
from PIL import Image
from ultralytics import YOLO

# Load model info
MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "v10_m_yolo11.pt"
MODEL_INFO_PATH = MODEL_DIR / "model_info.json"

# Load model
model = YOLO(str(MODEL_PATH))

# Load class names
with open(MODEL_INFO_PATH, 'r', encoding='utf-8') as f:
    model_info = json.load(f)
    CLASS_NAMES = model_info['classes']

def process_image(image_base64: str, confidence_threshold: float = 0.5):
    """
    Process a base64 encoded image and return detections
    
    Args:
        image_base64: Base64 encoded image string
        confidence_threshold: Minimum confidence for detections
        
    Returns:
        List of detections with class, confidence, and bounding box
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run inference
        results = model(image, conf=confidence_threshold, verbose=False)
        
        # Parse results
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Get class and confidence
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = CLASS_NAMES.get(str(class_id), f"Unknown_{class_id}")
                
                detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2
                    }
                })
        
        return {
            "success": True,
            "detections": detections,
            "count": len(detections)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "detections": [],
            "count": 0
        }

def main():
    """
    Main CLI interface for the service
    Reads JSON from stdin and writes JSON to stdout
    """
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        image_base64 = input_data.get('image')
        confidence = input_data.get('confidence', 0.5)
        
        if not image_base64:
            result = {
                "success": False,
                "error": "No image provided",
                "detections": [],
                "count": 0
            }
        else:
            result = process_image(image_base64, confidence)
        
        # Write result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "detections": [],
            "count": 0
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()

