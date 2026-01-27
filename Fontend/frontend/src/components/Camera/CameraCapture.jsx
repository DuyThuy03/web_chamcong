import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, ZoomIn, MapPin, Clock, User, Monitor } from 'lucide-react';
import { formatTime, getDeviceInfo } from '../../until/helper'; // Ensure you have this or standard date formatting

const CameraCapture = ({ onCapture, onCancel, userName, currentAddress }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // user | environment
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deviceInfoString, setDeviceInfoString] = useState('');

  useEffect(() => {
    startCamera();
    
    // Get simple device info string for display
    const info = getDeviceInfo();
    setDeviceInfoString(`${info.os} - ${info.browser}`);

    // Update clock for overlay
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
        stopCamera();
        clearInterval(timer);
    };
  }, [facingMode]);

  const startCamera = async () => {
    setIsCameraReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 }, // Higher res for better quality
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.7777777778 } // 16:9
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
    
    // 1. Draw video frame
    if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // 2. OVERLAY DRAWING LOGIC
    const scale = canvas.width / 1200; 
    
    // --- Data Preparation ---
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }); 
    const dateStr = `${dayName}, ${d}/${m}/${y}`;
    const addressStr = currentAddress || "Đang cập nhật vị trí...";
    const nameStr = `Họ Tên: ${(userName || "Nhân viên")}`;
    const deviceStr = `Thiết bị: ${deviceInfoString}`; // New requirement

    // --- Configuration ---
    const margin = 30 * scale; 
    
    // Fonts (Increased size ~20%)
    const fontTime = `bold ${100 * scale}px sans-serif`;
    const fontText = `600 ${34 * scale}px sans-serif`; 
    const fontSmall = `500 ${26 * scale}px sans-serif`; 

    // --- 1. Draw Gradient Background ---
    // Increased height to accommodate taller text block
    const gradientHeight = canvas.height * 0.5;
    const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, canvas.height);

    // --- 2. Calculate Layout from Bottom Up ---
    
    // Bottom: Device Info
    ctx.font = fontSmall;
    const deviceHeight = 26 * scale;
    const deviceY = canvas.height - margin;
    
    // Name
    ctx.font = fontText;
    const nameHeight = 34 * scale;
    const nameY = deviceY - deviceHeight - (20 * scale); // Increased spacing

    // Address (Wrapped) with Yellow Line
    ctx.font = fontText;
    // Reduced width: 65% of canvas width instead of full width
    const maxTextWidth = (canvas.width * 0.65) - margin - (20 * scale);
    
    let locLines = [];
    const words = addressStr.split(' ');
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const width = ctx.measureText(currentLine + " " + words[i]).width;
        if (width < maxTextWidth) {
            currentLine += " " + words[i];
        } else {
            locLines.push(currentLine);
            currentLine = words[i];
        }
    }
    locLines.push(currentLine);
    // Limit lines if too many
    if (locLines.length > 5) locLines = locLines.slice(0, 5);
    
    const lineHeight = 46 * scale; // Increased line height
    const totalAddressHeight = locLines.length * lineHeight;
    const addressBottomY = nameY - nameHeight - (35 * scale); 
    const addressTopY = addressBottomY - totalAddressHeight + lineHeight; 

    // Date
    const dateY = addressTopY - lineHeight - (5 * scale);
    
    // Yellow Line Geometry
    const barTopY = dateY - (lineHeight * 0.7); 
    const barBottomY = addressBottomY + (lineHeight * 0.2); 
    const barX = margin;
    const textIndent = 25 * scale; 

    // Time Box
    ctx.font = fontTime;
    const timeMetrics = ctx.measureText(timeStr);
    const timeBoxPaddingX = 25 * scale;
    const timeBoxPaddingY = 12 * scale;
    const timeBoxWidth = timeMetrics.width + (timeBoxPaddingX * 2);
    const timeBoxHeight = (100 * scale) + (timeBoxPaddingY * 2); 
    const timeBoxY = barTopY - timeBoxHeight - (25 * scale); 

    // --- 3. Draw Elements (Top Down Order) ---

    // A. Time Box (White Bg, Blue Text)
    // Rounded Rect
    const radius = 16 * scale;
    ctx.beginPath();
    ctx.roundRect(margin, timeBoxY, timeBoxWidth, timeBoxHeight, radius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    // Time Text
    ctx.fillStyle = '#1e3a8a'; // Dark Blue
    ctx.font = fontTime;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, margin + (timeBoxWidth/2), timeBoxY + (timeBoxHeight/2) + (6*scale)); // +5 for visual center adjustment

    // B. Yellow Bar
    ctx.beginPath();
    ctx.fillStyle = '#fbbf24'; // Amber-400
    ctx.roundRect(barX, barTopY, 8 * scale, barBottomY - barTopY, 4 * scale);
    ctx.fill();

    // C. Date & Address (White Text)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    
    // Date
    ctx.font = fontText;
    ctx.fillText(dateStr, barX + textIndent, dateY);

    // Address
    locLines.forEach((line, i) => {
        ctx.fillText(line, barX + textIndent, addressTopY + (i * lineHeight));
    });

    // D. Name (White Text)
    ctx.font = fontText;
    ctx.fillText(nameStr, margin, nameY);

    // E. Device Info (Light Gray Text)
    ctx.font = fontSmall;
    ctx.fillStyle = '#cbd5e1'; // Slate-300
    ctx.fillText(deviceStr, margin, deviceY);

    // --- Save Image ---
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
    <div className="fixed inset-0 z-[60] bg-black flex flex-col font-sans">
        {/* Main Camera Area */}
        <div className="relative flex-1 overflow-hidden bg-black">
            {error ? (
                 <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-6 max-w-sm border border-red-500/50">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <button onClick={handleCancel} className="w-full bg-[var(--bg-primary)] p-3 rounded font-bold">Đóng</button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Video Feed */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} 
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Loading Indicator */}
                    {!isCameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                            <RefreshCw className="animate-spin text-[var(--accent-color)]" size={40} />
                        </div>
                    )}
                    
                    {/* --- Live Preview Overlay --- */}
                    <div className="absolute inset-x-0 bottom-0 p-6 pointer-events-none z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                         <div className="space-y-5 max-w-[65%]">
                            {/* Time Box */}
                            <div className="bg-white rounded-xl px-4 py-2 inline-block shadow-lg">
                                <span className="text-[#1e3a8a] text-5xl font-extrabold font-mono tracking-tight">
                                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            </div>

                            {/* Info Group with Yellow Line */}
                            <div className="flex gap-4">
                                <div className="w-2 bg-amber-400 rounded-full shrink-0 shadow-sm"></div>
                                <div className="space-y-1.5 text-white text-shadow-sm">
                                    <p className="font-bold text-shadow text-xl">
                                        {['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][currentTime.getDay()]}, 
                                        {' ' + currentTime.toLocaleDateString('vi-VN')}
                                    </p>
                                    <p className="font-medium text-shadow text-lg leading-relaxed opacity-95">
                                        {currentAddress || "Đang cập nhật vị trí..."}
                                    </p>
                                </div>
                            </div>
                            
                            {/* User & Device */}
                            <div className="space-y-1.5 pt-2">
                                <p className="text-white font-bold text-2xl text-shadow">
                                    Họ Tên: {(userName || "Nhân viên")}
                                </p>
                                <p className="text-slate-300 text-sm italic font-medium">
                                    Thiết bị: {deviceInfoString}
                                </p>
                            </div>
                         </div>
                    </div>

                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/20 flex items-center gap-1">
                        <ZoomIn size={12} /> 1x
                    </div>
                </>
            )}
        </div>

        {/* Start/Cancel Controls */}
        <div className="bg-black/90 backdrop-blur-xl pb-8 pt-6 px-6 border-t border-white/10 shrink-0">
            <div className="flex items-center justify-between max-w-md mx-auto">
                <button 
                    onClick={handleCancel}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/5 active:scale-95"
                >
                    <X size={24} />
                </button>

                <button
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="w-20 h-20 rounded-full border-4 border-white/30 p-1 flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                >
                    <div className="w-full h-full bg-white rounded-full hover:bg-[var(--accent-color)] transition-colors"></div>
                </button>

                <button 
                    onClick={switchCamera}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/5 active:scale-95"
                >
                    <RefreshCw size={24} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default CameraCapture;
