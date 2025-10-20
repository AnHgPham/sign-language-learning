import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { ArrowLeft, Camera, Check, X, Trophy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { vocabularyApi, detectionApi, progressApi } from "@/lib/api";

interface SignVocabulary {
  id: number;
  class_id: number;
  display_name: string;
  description: string | null;
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
}

export default function PracticeMode() {
  const { isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vocabulary, setVocabulary] = useState<SignVocabulary[]>([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentDetection, setCurrentDetection] = useState<string>('Đang chờ...');
  const [isDetecting, setIsDetecting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number>();
  const isStreamingRef = useRef(false);

  const currentSign = vocabulary?.[currentSignIndex];
  const progress = vocabulary ? ((currentSignIndex + 1) / vocabulary.length) * 100 : 0;

  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        const data = await vocabularyApi.getAll();
        setVocabulary(data);
        setVocabLoading(false);
      } catch (error) {
        console.error("Error loading vocabulary:", error);
        setVocabLoading(false);
      }
    };

    loadVocabulary();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !sessionId) {
      const startSession = async () => {
        try {
          const session = await progressApi.startSession();
          setSessionId(session.id);
        } catch (error) {
          console.error("Error starting session:", error);
        }
      };
      startSession();
    }
  }, [isAuthenticated, sessionId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current!.play();
          setIsStreaming(true);
          isStreamingRef.current = true;
          startDetectionLoop();
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    setIsStreaming(false);
    isStreamingRef.current = false;
    setCurrentDetection('Đang chờ...');
  };

  const startDetectionLoop = () => {
    // Detect every 2.5 seconds for better performance
    detectionIntervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 2500);
    
    drawFrame();
  };

  const drawFrame = () => {
    if (!isStreamingRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || !currentSign || isDetecting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    setIsDetecting(true);
    setCurrentDetection("Đang xử lý...");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.4);
    const base64Data = imageData.split(",")[1];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const result = await detectionApi.detect(base64Data, 0.3);
      clearTimeout(timeoutId);
      
      console.log("🔍 Detection result:", result);
      console.log("📝 Current sign expected:", currentSign.display_name);
      
      if (result.detections && result.detections.length > 0) {
        const detected = result.detections[0];
        setCurrentDetection(detected.class_name);
        
        console.log("✨ Detected:", detected.class_name, "(class_id:", detected.class_id, ") | Expected:", currentSign.display_name, "(class_id:", currentSign.class_id, ") | Confidence:", detected.confidence);
        
        // Check if correct (case-insensitive, trim whitespace)
        // Compare by class_id instead of name to handle Vietnamese accents
        const isCorrect = detected.class_id === currentSign.class_id;
        
        
        console.log("🎯 Is correct?", isCorrect);
        
        // Draw bounding box if available
        if (detected.bbox && Array.isArray(detected.bbox) && detected.bbox.length === 4) {
          const [x1, y1, x2, y2] = detected.bbox;
          
          ctx.strokeStyle = isCorrect ? "#00ff00" : "#ff9900";
          ctx.lineWidth = 4;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = isCorrect ? "#00ff00" : "#ff9900";
          const label = `${detected.class_name} ${(detected.confidence * 100).toFixed(0)}%`;
          ctx.font = "bold 18px Arial";
          const textWidth = ctx.measureText(label).width;
          ctx.fillRect(x1, y1 - 30, textWidth + 20, 30);
          
          ctx.fillStyle = "#000000";
          ctx.fillText(label, x1 + 10, y1 - 8);
        }
        
        // Update attempts
        setAttempts(prev => prev + 1);
        
        // Check if correct
        if (isCorrect && detected.confidence > 0.3) {
          setSuccesses(prev => prev + 1);
          setFeedback("correct");
          
          console.log("✅ CORRECT! Auto-advancing in 2 seconds...");
          
          if (isAuthenticated) {
            try {
              await progressApi.updateProgress(currentSign.id, true);
            } catch (error) {
              console.error("Error updating progress:", error);
            }
          }
          
          setTimeout(() => {
            setFeedback(null);
            handleNext();
          }, 2000);
        } else if (!isCorrect) {
          setFeedback("incorrect");
          console.log("❌ INCORRECT! Try again...");
          
          setTimeout(() => {
            setFeedback(null);
          }, 1500);
        }
      } else {
        setCurrentDetection("Không phát hiện");
        console.log("⚠️ No detections found");
      }
    } catch (error: any) {
      console.error("❌ Detection error:", error);
      if (error.name === "AbortError") {
        setCurrentDetection("Timeout - thử lại");
      } else {
        setCurrentDetection("Lỗi - thử lại");
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleNext = async () => {
    if (vocabulary && currentSignIndex < vocabulary.length - 1) {
      setCurrentSignIndex(prev => prev + 1);
      setFeedback(null);
      setCurrentDetection('Đang chờ...');
    } else {
      stopCamera();
      
      if (isAuthenticated && sessionId) {
        try {
          await progressApi.endSession(sessionId, successes, attempts);
        } catch (error) {
          console.error("Error ending session:", error);
        }
      }
      
      alert(`Hoàn thành! Bạn đã thực hiện đúng ${successes}/${attempts} lần.`);
    }
  };

  const handleSkip = () => {
    setFeedback(null);
    setCurrentDetection('Đang chờ...');
    handleNext();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (vocabLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Không có dữ liệu</CardTitle>
            <CardDescription>Không tìm thấy từ vựng nào để luyện tập.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Trophy className="mr-2 h-5 w-5" />
              {successes}/{attempts}
            </Badge>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ</span>
            <span className="text-sm text-muted-foreground">
              {currentSignIndex + 1}/{vocabulary.length}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl">Thực hiện ký hiệu này</CardTitle>
              <CardDescription>Làm theo hướng dẫn và thực hiện trước camera</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSign && (
                <>
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-8 text-center">
                    <h2 className="text-5xl font-bold text-blue-600 mb-2">
                      {currentSign.display_name}
                    </h2>
                    <p className="text-gray-600 text-lg">(class_id: {currentSign.class_id})</p>
                  </div>

                  {currentSign.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Mô tả:</h3>
                      <p className="text-gray-700">{currentSign.description}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant={
                      currentSign.difficulty === "easy" ? "default" :
                      currentSign.difficulty === "medium" ? "secondary" : "destructive"
                    }>
                      {currentSign.difficulty === "easy" ? "Cơ bản" :
                       currentSign.difficulty === "medium" ? "Trung bình" : "Nâng cao"}
                    </Badge>
                    {currentSign.category && (
                      <Badge variant="outline">{currentSign.category}</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={isStreaming ? stopCamera : startCamera}
                      className="w-full"
                      size="lg"
                      variant={isStreaming ? "destructive" : "default"}
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      {isStreaming ? "Tắt Camera" : "Bật Camera"}
                    </Button>

                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      Bỏ qua
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Camera</CardTitle>
              <CardDescription>Hệ thống sẽ tự động nhận diện ký hiệu của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                    <div className="text-center text-white">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Camera chưa được bật</p>
                    </div>
                  </div>
                )}

                {isStreaming && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                    <p className="text-xs font-medium">Đang nhận diện:</p>
                    <p className="text-lg font-bold flex items-center gap-2">
                      {currentDetection}
                      {isDetecting && <Loader2 className="h-4 w-4 animate-spin" />}
                    </p>
                  </div>
                )}

                {feedback && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    feedback === "correct" ? "bg-green-500" : "bg-red-500"
                  } bg-opacity-75 transition-all`}>
                    {feedback === "correct" ? (
                      <div className="text-center text-white">
                        <Check className="h-24 w-24 mx-auto mb-4" />
                        <p className="text-3xl font-bold">Chính xác!</p>
                      </div>
                    ) : (
                      <div className="text-center text-white">
                        <X className="h-24 w-24 mx-auto mb-4" />
                        <p className="text-3xl font-bold">Thử lại!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-sm">💡 Hướng dẫn:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Bật camera và đặt tay trong khung hình</li>
                  <li>• Thực hiện ký hiệu được yêu cầu</li>
                  <li>• Viền xanh = đúng, viền cam = sai hoặc đang nhận diện</li>
                  <li>• Hệ thống kiểm tra mỗi 2.5 giây</li>
                  <li>• Khi đúng, bạn sẽ tự động chuyển sang ký hiệu tiếp theo</li>
                </ul>
              </div>

              <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="text-xs text-gray-600">
                  ⚠️ <strong>Lưu ý:</strong> Do xử lý trên CPU, tốc độ nhận diện có thể chậm. 
                  Hãy giữ ký hiệu ổn định trong 2-3 giây.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
