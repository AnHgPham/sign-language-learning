export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface InferenceResult {
  success: boolean;
  detections: Detection[];
  count: number;
  prediction?: string;
  error?: string;
}

const YOLO_SERVER_URL = 'http://localhost:5000';

/**
 * Run YOLO inference on a base64 encoded image via HTTP API
 * @param imageBase64 - Base64 encoded image string (with or without data:image prefix)
 * @param confidence - Minimum confidence threshold (0-1)
 * @returns Promise with detection results
 */
export async function runYoloInference(
  imageBase64: string,
  confidence: number = 0.5
): Promise<InferenceResult> {
  try {
    console.log("[YOLO] Sending request to HTTP server, confidence:", confidence);
    
    const response = await fetch(`${YOLO_SERVER_URL}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        confidence: confidence
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[YOLO] HTTP error:", response.status, errorText);
      return {
        success: false,
        detections: [],
        count: 0,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }
    
    const result: InferenceResult = await response.json();
    console.log("[YOLO] Detection result:", result);
    
    // Add prediction text for UI
    if (result.success && result.detections && result.detections.length > 0) {
      const topDetection = result.detections[0];
      result.prediction = `${topDetection.class_name} (${(topDetection.confidence * 100).toFixed(1)}%)`;
    }
    
    return result;
    
  } catch (error) {
    console.error("[YOLO] Request error:", error);
    return {
      success: false,
      detections: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if YOLO server is healthy
 */
export async function checkYoloServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${YOLO_SERVER_URL}/health`);
    const data = await response.json();
    return data.status === 'ok' && data.model_loaded === true;
  } catch (error) {
    console.error("[YOLO] Health check failed:", error);
    return false;
  }
}

/**
 * Get list of all sign language classes
 */
export async function getSignLanguageClasses(): Promise<string[]> {
  try {
    const response = await fetch(`${YOLO_SERVER_URL}/classes`);
    const data = await response.json();
    return Object.values(data.classes);
  } catch (error) {
    console.error("[YOLO] Failed to get classes:", error);
    // Fallback to default classes
    return [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
      "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
    ];
  }
}

