import { spawn } from "child_process";
import { join } from "path";

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
  error?: string;
}

/**
 * Run YOLO inference on a base64 encoded image
 * @param imageBase64 - Base64 encoded image string (without data:image prefix)
 * @param confidence - Minimum confidence threshold (0-1)
 * @returns Promise with detection results
 */
export async function runYoloInference(
  imageBase64: string,
  confidence: number = 0.5
): Promise<InferenceResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = join(__dirname, "ml_models", "yolo_service.py");
    
    // Spawn Python process
    const python = spawn("python3.11", [pythonScript]);
    
    let stdout = "";
    let stderr = "";
    
    // Collect stdout
    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    python.on("close", (code) => {
      if (code !== 0) {
        console.error("[YOLO] Python process error:", stderr);
        resolve({
          success: false,
          detections: [],
          count: 0,
          error: stderr || "Python process failed"
        });
        return;
      }
      
      try {
        const result: InferenceResult = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error("[YOLO] Failed to parse result:", error);
        resolve({
          success: false,
          detections: [],
          count: 0,
          error: "Failed to parse inference result"
        });
      }
    });
    
    // Handle process error
    python.on("error", (error) => {
      console.error("[YOLO] Failed to spawn Python process:", error);
      resolve({
        success: false,
        detections: [],
        count: 0,
        error: error.message
      });
    });
    
    // Send input data to Python process
    const input = JSON.stringify({
      image: imageBase64,
      confidence: confidence
    });
    
    python.stdin.write(input);
    python.stdin.end();
  });
}

/**
 * Get list of all supported sign language classes
 */
export function getSignLanguageClasses(): Record<string, string> {
  // This matches the model_info.json
  return {
    "0": "an",
    "1": "ban",
    "2": "ban_be",
    "3": "bao_nhieu",
    "4": "cai_gi",
    "5": "cam_on",
    "6": "gia_dinh",
    "7": "khat",
    "8": "khoe",
    "9": "lam_on",
    "10": "nhu_the_nao",
    "11": "tam_biet",
    "12": "ten_la",
    "13": "toi",
    "14": "tuoi",
    "15": "xin_chao",
    "16": "xin_loi"
  };
}

