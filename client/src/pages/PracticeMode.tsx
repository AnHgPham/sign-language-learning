import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Camera, Check, X, Trophy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

interface SignVocabulary {
  id: string;
  classId: string;
  className: string;
  displayName: string;
  description: string | null;
  category: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export default function PracticeMode() {
  const { isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: vocabulary, isLoading: vocabLoading } = trpc.vocabulary.list.useQuery(undefined);
  const detectMutation = trpc.detection.detect.useMutation();
  const updateProgressMutation = trpc.progress.update.useMutation();

  const currentSign = vocabulary?.[currentSignIndex];
  const progress = vocabulary ? ((currentSignIndex + 1) / vocabulary.length) * 100 : 0;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Start periodic detection
        detectionIntervalRef.current = setInterval(() => {
          captureAndDetect();
        }, 2000); // Check every 2 seconds
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setIsStreaming(false);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || !currentSign) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size and draw frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get image as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    const base64Data = imageData.split(",")[1];

    // Run detection
    detectMutation.mutate(
      { image: base64Data, confidence: 0.6 },
      {
        onSuccess: (result) => {
          if (result.success && result.detections && result.detections.length > 0) {
            // Check if detected sign matches current target
            const detected = result.detections[0];
            const isCorrect = detected.class_name === currentSign.className;
            
            setAttempts(prev => prev + 1);
            
            if (isCorrect) {
              setSuccesses(prev => prev + 1);
              setFeedback("correct");
              
              // Update progress if authenticated
              if (isAuthenticated) {
                updateProgressMutation.mutate({
                  signId: currentSign.id,
                  success: true,
                });
              }
              
              // Auto advance after 1.5 seconds
              setTimeout(() => {
                handleNext();
              }, 1500);
            } else {
              setFeedback("incorrect");
              
              if (isAuthenticated) {
                updateProgressMutation.mutate({
                  signId: currentSign.id,
                  success: false,
                });
              }
              
              // Clear feedback after 1 second
              setTimeout(() => {
                setFeedback(null);
              }, 1000);
            }
          }
        },
      }
    );
  };

  const handleNext = () => {
    if (vocabulary && currentSignIndex < vocabulary.length - 1) {
      setCurrentSignIndex(prev => prev + 1);
      setFeedback(null);
    } else {
      // Completed all signs
      stopCamera();
      alert(`Hoàn thành! Bạn đã thực hiện đúng ${successes}/${attempts} lần.`);
    }
  };

  const handleSkip = () => {
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Không có dữ liệu</CardTitle>
            <CardDescription>Chưa có từ vựng nào trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Học theo bài</h1>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">{successes}/{attempts}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Instructions */}
          <div className="lg:col-span-1">
            <Card className={`border-2 ${
              feedback === "correct" ? "border-green-500 bg-green-50" :
              feedback === "incorrect" ? "border-red-500 bg-red-50" :
              "border-purple-300"
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl">{currentSign?.displayName}</CardTitle>
                  <Badge variant={
                    currentSign?.difficulty === "beginner" ? "secondary" :
                    currentSign?.difficulty === "intermediate" ? "default" :
                    "destructive"
                  }>
                    {currentSign?.difficulty === "beginner" ? "Cơ bản" :
                     currentSign?.difficulty === "intermediate" ? "Trung bình" :
                     "Nâng cao"}
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {currentSign?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback === "correct" && (
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Check className="h-5 w-5" />
                    Chính xác! Tuyệt vời!
                  </div>
                )}
                {feedback === "incorrect" && (
                  <div className="flex items-center gap-2 text-red-600 font-semibold">
                    <X className="h-5 w-5" />
                    Chưa đúng, thử lại nhé!
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Danh mục:</span>
                    <span className="font-medium">{currentSign?.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tiến độ:</span>
                    <span className="font-medium">
                      {currentSignIndex + 1} / {vocabulary.length}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    📹 Thực hiện ký hiệu <strong>{currentSign?.displayName}</strong> trước camera
                  </p>
                  <Button onClick={handleSkip} variant="outline" className="w-full">
                    Bỏ qua
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Camera</CardTitle>
                <CardDescription>
                  Bật camera và thực hiện ký hiệu để được chấm điểm
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  {!isStreaming ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button onClick={startCamera} size="lg">
                        <Camera className="mr-2 h-5 w-5" />
                        Bắt đầu luyện tập
                      </Button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </>
                  )}
                </div>

                {isStreaming && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={stopCamera} variant="destructive">
                      Dừng luyện tập
                    </Button>
                    {detectMutation.isPending && (
                      <Badge variant="secondary" className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang kiểm tra...
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

