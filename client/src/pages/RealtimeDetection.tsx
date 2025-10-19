import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Camera, CameraOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Detection {
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

export default function RealtimeDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const detectMutation = trpc.detection.detect.useMutation();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Start detection loop
        videoRef.current.onloadedmetadata = () => {
          processFrame();
        };
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
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsStreaming(false);
    setDetections([]);
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Calculate FPS
    const now = performance.now();
    if (lastFrameTimeRef.current) {
      const delta = now - lastFrameTimeRef.current;
      setFps(Math.round(1000 / delta));
    }
    lastFrameTimeRef.current = now;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    const base64Data = imageData.split(",")[1];

    // Run detection (throttle to ~2 FPS for inference)
    if (!detectMutation.isPending) {
      detectMutation.mutate(
        { image: base64Data, confidence: 0.5 },
        {
          onSuccess: (result) => {
            if (result.success && result.detections) {
              setDetections(result.detections);
              drawDetections(ctx, result.detections);
            }
          },
        }
      );
    }

    // Continue loop
    animationRef.current = requestAnimationFrame(processFrame);
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, detections: Detection[]) => {
    detections.forEach((det) => {
      const { x1, y1, x2, y2 } = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      // Draw bounding box
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background
      const label = `${det.class_name} (${Math.round(det.confidence * 100)}%)`;
      ctx.font = "16px sans-serif";
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);

      // Draw label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x1 + 5, y1 - 7);
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Nhận diện Realtime</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            FPS: {fps}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Camera</CardTitle>
                <CardDescription>
                  Bật camera và thực hiện các ký hiệu để AI nhận diện
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  {!isStreaming ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button onClick={startCamera} size="lg">
                        <Camera className="mr-2 h-5 w-5" />
                        Bật Camera
                      </Button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="hidden"
                      />
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain"
                      />
                    </>
                  )}
                </div>

                {isStreaming && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={stopCamera} variant="destructive">
                      <CameraOff className="mr-2 h-4 w-4" />
                      Tắt Camera
                    </Button>
                    {detectMutation.isPending && (
                      <Badge variant="secondary" className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang phân tích...
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detection Results */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Kết quả nhận diện</CardTitle>
                <CardDescription>
                  {detections.length > 0
                    ? `Phát hiện ${detections.length} ký hiệu`
                    : "Chưa phát hiện ký hiệu nào"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detections.length > 0 ? (
                  <div className="space-y-3">
                    {detections.map((det, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-900">
                            {det.class_name}
                          </span>
                          <Badge variant="secondary">
                            {Math.round(det.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Class ID: {det.class_id}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Thực hiện ký hiệu trước camera</p>
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

