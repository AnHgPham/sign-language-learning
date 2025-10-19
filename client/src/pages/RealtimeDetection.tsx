import { useEffect, useRef, useState } from 'react';
import { trpc } from '../lib/trpc';
import { useLocation } from 'wouter';

export default function RealtimeDetection() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [detectionResult, setDetectionResult] = useState<string>('Chưa phát hiện ký hiệu nào');
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<any[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const isStreamingRef = useRef(false);

  const detectMutation = trpc.detection.detect.useMutation({
    onSuccess: (data) => {
      if (data.success && data.detections && data.detections.length > 0) {
        setDetectionResult(data.prediction || 'Không nhận diện được');
        setDetections(data.detections);
      } else {
        setDetectionResult('Không phát hiện ký hiệu');
        setDetections([]);
      }
    },
    onError: (error) => {
      console.error('[Detection] Error:', error);
      setDetectionResult('Lỗi nhận diện');
      setDetections([]);
    },
  });

  const startCamera = async () => {
    try {
      console.log('[Camera] Starting camera...');
      setError('');

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('[Camera] Stream obtained:', stream);
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for metadata to load
        videoRef.current.onloadedmetadata = async () => {
          console.log('[Camera] Metadata loaded');
          
          // Play video
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
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
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
    let lastTime = performance.now();
    let frameCount = 0;

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

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes with improved styling
      if (detections.length > 0) {
        detections.forEach((detection, index) => {
          const { bbox, class_name, confidence } = detection;
          
          // Calculate box dimensions
          const boxWidth = bbox.x2 - bbox.x1;
          const boxHeight = bbox.y2 - bbox.y1;
          
          // Use different colors for multiple detections
          const colors = ['#00ff00', '#00ffff', '#ffff00', '#ff00ff'];
          const color = colors[index % colors.length];
          
          // Draw semi-transparent fill
          ctx.fillStyle = color + '20';
          ctx.fillRect(bbox.x1, bbox.y1, boxWidth, boxHeight);
          
          // Draw box border with glow effect
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.strokeRect(bbox.x1, bbox.y1, boxWidth, boxHeight);
          ctx.shadowBlur = 0;
          
          // Draw corner markers for better visibility
          const markerSize = 20;
          ctx.lineWidth = 4;
          // Top-left corner
          ctx.beginPath();
          ctx.moveTo(bbox.x1, bbox.y1 + markerSize);
          ctx.lineTo(bbox.x1, bbox.y1);
          ctx.lineTo(bbox.x1 + markerSize, bbox.y1);
          ctx.stroke();
          // Top-right corner
          ctx.beginPath();
          ctx.moveTo(bbox.x2 - markerSize, bbox.y1);
          ctx.lineTo(bbox.x2, bbox.y1);
          ctx.lineTo(bbox.x2, bbox.y1 + markerSize);
          ctx.stroke();
          // Bottom-left corner
          ctx.beginPath();
          ctx.moveTo(bbox.x1, bbox.y2 - markerSize);
          ctx.lineTo(bbox.x1, bbox.y2);
          ctx.lineTo(bbox.x1 + markerSize, bbox.y2);
          ctx.stroke();
          // Bottom-right corner
          ctx.beginPath();
          ctx.moveTo(bbox.x2 - markerSize, bbox.y2);
          ctx.lineTo(bbox.x2, bbox.y2);
          ctx.lineTo(bbox.x2, bbox.y2 - markerSize);
          ctx.stroke();
          
          // Draw label with improved styling
          const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
          ctx.font = 'bold 18px Arial';
          const textMetrics = ctx.measureText(label);
          const textWidth = textMetrics.width;
          const textHeight = 24;
          const padding = 8;
          
          // Draw label background with rounded corners
          const labelX = bbox.x1;
          const labelY = bbox.y1 - textHeight - padding * 2 - 5;
          
          ctx.fillStyle = color;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, textWidth + padding * 2, textHeight + padding * 2, 5);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Draw label text
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(label, labelX + padding, labelY + textHeight);
        });
      }

      // Get image data and send to backend (every 15 frames to avoid overload)
      if (frameCount % 15 === 0) {
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        detectMutation.mutate({ image: imageData });
      }

      // Calculate FPS
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with improved styling */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="text-blue-600">🎥</span>
                Nhận diện Realtime
              </h1>
              <p className="text-gray-600 text-lg">Bật camera và thực hiện các ký hiệu để AI nhận diện ngôn ngữ ký hiệu</p>
            </div>
            <button
              onClick={() => setLocation('/')}
              className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium border-2 border-gray-200 hover:border-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Trang chủ
            </button>
          </div>
          
          {/* Status Bar */}
          <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {isStreaming ? 'Camera đang hoạt động' : 'Camera chưa bật'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${detectMutation.isPending ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {detectMutation.isPending ? 'Đang xử lý...' : 'Sẵn sàng'}
                </span>
              </div>
              {isStreaming && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">FPS:</span>
                  <span className="text-sm font-mono font-bold text-blue-600">{fps}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {detections.length > 0 && (
                <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  {detections.length} ký hiệu được phát hiện
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Panel with improved styling */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100">
              <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
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
                
                {/* Error Message */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-red-500 text-white px-8 py-6 rounded-2xl max-w-md text-center shadow-2xl">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Placeholder */}
                {!isStreaming && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-center text-gray-300">
                      <svg className="w-32 h-32 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xl font-medium">Nhấn "Bật Camera" để bắt đầu</p>
                      <p className="text-sm mt-2 opacity-75">Hệ thống sẽ tự động nhận diện ký hiệu của bạn</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls with improved styling */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
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

          {/* Results Panel with improved styling */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Kết quả nhận diện
              </h2>
              
              {/* Detection Result with improved styling */}
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

              {/* Instructions with improved styling */}
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

              {/* Tips section */}
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

