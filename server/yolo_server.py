from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64
import logging
from ultralytics import YOLO
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Sign Language Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
MODEL_PATH = "/home/azureuser/sign-language-learning/server/ml_models/best.pt"
try:
    model = YOLO(MODEL_PATH)
    logger.info(f"✅ Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    model = None

# Class names mapping
CLASS_NAMES = {
    "0": "an", "1": "ban", "2": "ban_be", "3": "bao_nhieu",
    "4": "cai_gi", "5": "cam_on", "6": "gia_dinh", "7": "khat",
    "8": "khoe", "9": "lam_on", "10": "nhu_the_nao", "11": "tam_biet",
    "12": "ten_la", "13": "toi", "14": "tuoi", "15": "xin_chao",
    "16": "xin_loi"
}

# Request/Response models
class DetectionRequest(BaseModel):
    image: str
    confidence: float = 0.5

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class Detection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox

class DetectionResponse(BaseModel):
    success: bool
    count: int
    detections: list[Detection]
    error: str | None = None

@app.get("/")
async def root():
    return {
        "message": "Sign Language Detection API (FastAPI)",
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.get("/classes")
async def get_classes():
    return {
        "classes": CLASS_NAMES,
        "count": len(CLASS_NAMES)
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect(request: DetectionRequest):
    """Detection endpoint"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if not request.image:
            raise HTTPException(status_code=400, detail="No image provided")
        
        # Process image
        result = process_image(request.image, request.confidence)
        return result
        
    except Exception as e:
        logger.error(f"Error in detect endpoint: {e}")
        return DetectionResponse(
            success=False,
            count=0,
            detections=[],
            error=str(e)
        )

def process_image(image_base64: str, confidence_threshold: float = 0.5) -> DetectionResponse:
    """
    Process a base64 encoded image and return detections
    """
    try:
        # Remove data:image prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
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
                
                detections.append(Detection(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=confidence,
                    bbox=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
                ))
        
        logger.info(f"Detected {len(detections)} signs")
        
        return DetectionResponse(
            success=True,
            count=len(detections),
            detections=detections
        )
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return DetectionResponse(
            success=False,
            count=0,
            detections=[],
            error=str(e)
        )

if __name__ == "__main__":
    uvicorn.run(
        "yolo_server_fastapi:app",
        host="0.0.0.0",
        port=5001,
        reload=False,
        log_level="info"
    )

