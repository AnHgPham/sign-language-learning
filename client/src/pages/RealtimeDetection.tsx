import { useEffect, useRef, useState } from 'react';
import { trpc } from '../lib/trpc';

export default function RealtimeDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [detectionResult, setDetectionResult] = useState<string>('Chưa phát hiện ký hiệu nào');
  const [fps, setFps] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const detectMutation = trpc.detection.detect.useMutation({
    onSuccess: (data) => {
      setDetectionResult(data.prediction || 'Không nhận diện được');
      console.log('[Detection] Result:', data);
    },
    onError: (error) => {
      console.error('[Detection] Error:', error);
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
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          videoRef.current.onloadedmetadata = () => {
            console.log('[Camera] Metadata loaded');
            resolve();
          };

          videoRef.current.onerror = (e) => {
            console.error('[Camera] Video error:', e);
            reject(new Error('Failed to load video'));
          };
        });

        // Play video
        await videoRef.current.play();
        console.log('[Camera] Video playing');
        
        setIsStreaming(true);
        startDetection();
      }
    } catch (err) {
      console.error('[Camera] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể truy cập camera';
      setError(errorMessage);
      setIsStreaming(false);
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
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[Camera] Track stopped:', track.label);
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setDetectionResult('Chưa phát hiện ký hiệu nào');
    setFps(0);
  };

  const startDetection = () => {
    let lastTime = performance.now();
    let frameCount = 0;

    const detectFrame = async () => {
      if (!isStreaming || !videoRef.current || !canvasRef.current) {
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

      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Send to backend for detection (every 500ms to avoid overload)
      if (frameCount % 15 === 0) {
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

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nhận diện Realtime</h1>
          <p className="text-gray-600">Bật camera và thực hiện các ký hiệu để AI nhận diện</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* FPS Counter */}
                {isStreaming && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                    FPS: {fps}
                  </div>
                )}

                {/* Camera Button */}
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={startCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Bật Camera
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="bg-red-500 text-white px-6 py-4 rounded-lg max-w-md text-center">
                      <p className="font-semibold mb-2">Lỗi Camera</p>
                      <p className="text-sm">{error}</p>
                      <button
                        onClick={startCamera}
                        className="mt-4 bg-white text-red-500 px-4 py-2 rounded font-semibold hover:bg-gray-100"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              {isStreaming && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Tắt Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Detection Results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Kết quả nhận diện</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Ký hiệu nhận diện:</p>
                <p className="text-2xl font-bold text-blue-600">{detectionResult}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>{isStreaming ? 'Camera đang hoạt động' : 'Camera chưa bật'}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-3 h-3 rounded-full ${detectMutation.isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>{detectMutation.isLoading ? 'Đang phân tích...' : 'Sẵn sàng'}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Hướng dẫn:</strong><br />
                  1. Bật camera<br />
                  2. Thực hiện ký hiệu trước camera<br />
                  3. Xem kết quả nhận diện realtime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

