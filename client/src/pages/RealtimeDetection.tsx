import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { detectionApi } from '../lib/api';

export default function RealtimeDetection() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [detectionResult, setDetectionResult] = useState<string>('Chưa phát hiện ký hiệu nào');
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const isStreamingRef = useRef(false);
  const lastDetectionTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  const startCamera = async () => {
    try {
      console.log('[Camera] Starting camera...');
      setError('');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('[Camera] Stream obtained:', stream);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          console.log('[Camera] Metadata loaded');
          await videoRef.current!.play();
          console.log('[Camera] Video playing');
          
          setIsStreaming(true);
          isStreamingRef.current = true;
          startDetection();
        };
      }
    } catch (err) {
      console.error('[Camera] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể truy cập camera';
      setError(`Không thể truy cập camera: ${errorMessage}`);
    }
  };

  const stopCamera = () => {
    console.log('[Camera] Stopping camera...');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    isStreamingRef.current = false;
    setDetectionResult('Chưa phát hiện ký hiệu nào');
    setDetections([]);
    setFps(0);
  };

  const startDetection = () => {
    console.log('[Detection] Starting detection loop...');
    lastDetectionTimeRef.current = Date.now();
    fpsCounterRef.current = 0;
    
    fpsTimerRef.current = window.setInterval(() => {
      setFps(fpsCounterRef.current);
      fpsCounterRef.current = 0;
    }, 1000);

    detectFrame();
  };

  const detectFrame = async () => {
    if (!isStreamingRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const timeSinceLastDetection = now - lastDetectionTimeRef.current;

    // Only detect every 800ms to improve performance
    if (timeSinceLastDetection >= 800 && !isDetecting) {
      lastDetectionTimeRef.current = now;
      setIsDetecting(true);

      const imageData = canvas.toDataURL('image/jpeg', 0.6);
      const base64Image = imageData.split(',')[1];

      try {
        const result = await detectionApi.detect(base64Image, 0.4);
        
        if (result.detections && result.detections.length > 0) {
          setDetectionResult(result.detections[0].class_name || 'Không nhận diện được');
          setDetections(result.detections);

          // Draw bounding boxes and labels
          result.detections.forEach((det: any) => {
            if (det.bbox) {
              const [x1, y1, x2, y2] = det.bbox;
              
              // Draw green rectangle
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 4;
              ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

              // Draw label background
              const label = `${det.class_name} ${(det.confidence * 100).toFixed(1)}%`;
              ctx.font = 'bold 20px Arial';
              const textMetrics = ctx.measureText(label);
              const textWidth = textMetrics.width;
              
              ctx.fillStyle = '#00ff00';
              ctx.fillRect(x1, y1 - 35, textWidth + 20, 35);

              // Draw label text
              ctx.fillStyle = '#000000';
              ctx.fillText(label, x1 + 10, y1 - 10);
            }
          });
        } else {
          setDetectionResult('Không phát hiện ký hiệu');
          setDetections([]);
        }

        fpsCounterRef.current++;
      } catch (error) {
        console.error('[Detection] Error:', error);
      } finally {
        setIsDetecting(false);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (fpsTimerRef.current) {
        clearInterval(fpsTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <button
            onClick={() => setLocation('/', { replace: true })}
            className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
            Nhận Diện Realtime
          </h1>
          <p className="text-gray-600 text-lg">Sử dụng camera để nhận diện ngôn ngữ ký hiệu trực tiếp</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100">
              <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-inner" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                    <div className="text-center text-white">
                      <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xl font-medium">Camera chưa được bật</p>
                    </div>
                  </div>
                )}
                {isStreaming && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-mono font-medium">{fps} FPS</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                {!isStreaming ? (
                  <button
                    onClick={startCamera}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Bật Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Tắt Camera
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Kết quả nhận diện
              </h2>
              
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                <p className="text-sm text-gray-600 mb-3 font-medium">Ký hiệu nhận diện:</p>
                <p className="text-3xl font-bold text-blue-600 break-words">{detectionResult}</p>
                {detections.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-xs text-gray-500 mb-2">Chi tiết:</p>
                    {detections.map((det, idx) => (
                      <div key={idx} className="text-sm text-gray-700 mb-1">
                        <span className="font-semibold">{det.class_name}</span>
                        <span className="text-gray-500"> - Độ tin cậy: </span>
                        <span className="font-mono text-green-600">{(det.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Hướng dẫn sử dụng:
                </h3>
                <ol className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 min-w-[20px]">1.</span>
                    <span>Nhấn nút "Bật Camera" để khởi động camera</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 min-w-[20px]">2.</span>
                    <span>Thực hiện các ký hiệu ngôn ngữ ký hiệu trước camera</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 min-w-[20px]">3.</span>
                    <span>Hệ thống sẽ tự động nhận diện và hiển thị kết quả realtime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 min-w-[20px]">4.</span>
                    <span>Khung màu xanh sẽ xuất hiện xung quanh ký hiệu được phát hiện</span>
                  </li>
                </ol>
              </div>

              <div className="mt-4 bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <span>💡</span>
                  Mẹo:
                </h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Đảm bảo ánh sáng đủ để camera nhận diện tốt hơn</li>
                  <li>• Giữ tay trong khung hình và di chuyển chậm rãi</li>
                  <li>• Thực hiện ký hiệu rõ ràng và chính xác</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
