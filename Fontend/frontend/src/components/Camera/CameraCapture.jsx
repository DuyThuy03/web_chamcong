import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

const CameraCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // user | environment

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    setIsCameraReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev =>
      prev === 'user' ? 'environment' : 'user'
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);

    stopCamera();
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="bg-white rounded-lg p-6 max-w-md">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={handleCancel}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[70vh]"
              />
              <canvas ref={canvasRef} className="hidden" />

              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white">Đang khởi động camera...</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4 flex-wrap justify-center">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-600 text-white py-3 px-6 rounded-lg"
              >
                <X size={20} />
                Hủy
              </button>

              <button
                onClick={switchCamera}
                className="flex items-center gap-2 bg-yellow-600 text-white py-3 px-6 rounded-lg"
              >
                <RefreshCw size={20} />
                Đổi camera
              </button>

              <button
                onClick={capturePhoto}
                disabled={!isCameraReady}
                className="flex items-center gap-2 bg-blue-600 text-white py-3 px-8 rounded-lg disabled:bg-gray-400"
              >
                <Camera size={20} />
                Chụp ảnh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
