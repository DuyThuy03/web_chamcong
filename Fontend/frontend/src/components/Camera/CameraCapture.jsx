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
    
    // Video dimensions
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    
    // Target Aspect Ratio 3:4 (Portrait)
    const targetRatio = 3 / 4;
    
    // Calculate crop dimensions to fit 3:4
    let cropW, cropH, cropX, cropY;
    
    // Logic: maximize area while maintaining aspect ratio
    if (vW / vH > targetRatio) {
        // Video is wider/flatter than target -> crop width (sides) for landscape-ish input
        // BUT if it's strictly landscape (16:9) and we want portrait 3:4 output, this cuts A LOT.
        // Assuming we want to capture the center.
        cropH = vH;
        cropW = vH * targetRatio;
        cropX = (vW - cropW) / 2;
        cropY = 0;
    } else {
        // Video is taller/skinnier than target -> crop height (top/bottom)
        cropW = vW;
        cropH = vW / targetRatio;
        cropX = 0;
        cropY = (vH - cropH) / 2;
    }

    // Set canvas to the cropped size (High Resolution)
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext('2d');
    
    // 1. Draw Cropped Video Frame
    // Mirror if using front camera
    if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    
    // drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // 2. OVERLAY DRAWING LOGIC (Scaled to Canvas Size)
    // Reference width for scaling (e.g., typical mobile width)
    const refWidth = 720; 
    const scale = canvas.width / refWidth; 
    
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
    const deviceStr = `Thông tin thiết bị: ${deviceInfoString}`; // Updated Label

    // --- Styles ---
    const margin = 32 * scale; // Left margin
    const bottomPadding = 40 * scale; // Bottom margin

    // Fonts setup
    const fontFamily = "Roboto, Arial, sans-serif";
    const fontTime = `900 ${64 * scale}px ${fontFamily}`; // Big Time
    const fontDate = `700 ${22 * scale}px ${fontFamily}`;
    const fontAddress = `500 ${20 * scale}px ${fontFamily}`;
    const fontName = `700 ${26 * scale}px ${fontFamily}`;
    const fontDevice = `400 ${16 * scale}px ${fontFamily}`;

    // --- Draw Gradient Background (Bottom Protection) ---
    const gradientHeight = canvas.height * 0.5;
    const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, canvas.height);

    // --- Positioning Tracker (Bottom-Up) ---
    let currentY = canvas.height - bottomPadding;

    // --- 1. Device Info (Footer) with Shield Icon ---
    // Text
    ctx.font = fontDevice;
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    
    // Measure text to position shield
    const deviceTextX = margin + (24 * scale); // Indent for icon
    ctx.fillText(deviceStr, deviceTextX, currentY);

    // Draw Shield Icon (Simple Shape)
    const iconSize = 18 * scale;
    const iconX = margin;
    const iconY = currentY - (16 * scale); // Approximate adjustments for baseline
    
    ctx.beginPath();
    ctx.fillStyle = '#e2e8f0';
    // Draw a simple shield shape path
    ctx.moveTo(iconX, iconY);
    ctx.lineTo(iconX + iconSize, iconY);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.6);
    ctx.quadraticCurveTo(iconX + iconSize/2, iconY + iconSize * 1.3, iconX, iconY + iconSize * 0.6);
    ctx.closePath();
    ctx.fill();

    // Checkmark inside shield (subtract or draw white/black on top? Draw hollow)
    ctx.fillStyle = '#000000'; // Make it look like a hole or dark tick
    ctx.beginPath();
    // Simple checkmark
    ctx.moveTo(iconX + iconSize * 0.25, iconY + iconSize * 0.5);
    ctx.lineTo(iconX + iconSize * 0.45, iconY + iconSize * 0.7);
    ctx.lineTo(iconX + iconSize * 0.75, iconY + iconSize * 0.3);
    ctx.stroke(); // Stroke might be too thin, fill a poly
    // Redraw checkmark as poly
    ctx.lineTo(iconX + iconSize * 0.45, iconY + iconSize * 0.85); // bottom point
    ctx.lineTo(iconX + iconSize * 0.25, iconY + iconSize * 0.5); // back to start
    ctx.fill();

    // Move cursor up
    currentY -= (36 * scale); 

    // --- 2. Name ---
    ctx.font = fontName;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(nameStr, margin, currentY);
    
    // Move cursor up
    currentY -= (36 * scale); // Gap between Name and Address

    // --- 3. Address (Wrapped) ---
    ctx.font = fontAddress;
    ctx.fillStyle = '#f8fafc'; // slate-50
    const maxTextWidth = (canvas.width * 0.85) - margin - (20 * scale);
    const lineHeightAddress = 28 * scale;
    
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
    // Limit to 3 lines max
    if (locLines.length > 3) locLines = locLines.slice(0, 3);
    
    // Draw Address Lines (Top to Bottom logic relative to block start)
    // We are at the BOTTOM of the address block in 'currentY' logic? 
    // No, strictly stacking up is easier if we calculate height.
    const addressBlockHeight = locLines.length * lineHeightAddress;
    const addressBlockTopY = currentY - addressBlockHeight; // Top of first line

    locLines.forEach((line, i) => {
        // + lineHeightAddress because textBaseline is bottom? No, simpler to use top/hanging behavior or manual offset
        // Using bottom baseline for consistency
        ctx.fillText(line, margin + (16 * scale), addressBlockTopY + ((i + 1) * lineHeightAddress));
    });

    // --- 4. Date ---
    ctx.font = fontDate;
    ctx.fillStyle = '#FFFFFF';
    const dateY = addressBlockTopY - (10 * scale); // Gap above address
    ctx.fillText(dateStr, margin + (16 * scale), dateY);

    // --- 5. Yellow Bar ---
    // Spans from Top of Date to Bottom of Address
    const barTopY = dateY - (22 * scale); // Approx height of Date text
    const barBottomY = currentY + (6 * scale); // Extend slightly below last address line
    
    ctx.beginPath();
    ctx.fillStyle = '#fbbf24'; // amber-400
    ctx.roundRect(margin, barTopY, 6 * scale, barBottomY - barTopY, 4 * scale);
    ctx.fill();

    // --- 6. Time Box ---
    ctx.font = fontTime;
    const timeMetrics = ctx.measureText(timeStr);
    
    // Box dimensions
    const timeBoxPaddingX = 24 * scale;
    const timeBoxHeight = 84 * scale; 
    const timeBoxWidth = timeMetrics.width + (timeBoxPaddingX * 2);
    
    const timeBoxBottomY = barTopY - (32 * scale); // Gap above yellow bar
    const timeBoxTopY = timeBoxBottomY - timeBoxHeight;

    // Draw Box
    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.roundRect(margin, timeBoxTopY, timeBoxWidth, timeBoxHeight, 16 * scale);
    ctx.fill();

    // Draw Time Text
    ctx.fillStyle = '#1e3a8a'; // blue-900
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Box center
    const boxCenterX = margin + (timeBoxWidth / 2);
    const boxCenterY = timeBoxTopY + (timeBoxHeight / 2);
    ctx.fillText(timeStr, boxCenterX, boxCenterY + (4 * scale)); // Slight optic adjustment

    // --- Save Image ---
    canvas.toBlob(blob => {
      if (blob) {
        // Create file with meaningful name
        const filename = `attendance_${String(now.getTime()).slice(-6)}.jpg`;
        const file = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onCapture(file);
      }
    }, 'image/jpeg', 0.92);

    stopCamera();
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col font-sans h-[100dvh]">
        {/* Main Camera Area - Centered and Aspect Ratio Enforced */}
        <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden">
            
            {/* 3:4 Aspect Ratio Container */}
            <div className="relative w-full max-w-[600px] aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                
                {error ? (
                     <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-50 bg-[var(--bg-secondary)]">
                        <div className="max-w-sm">
                            <p className="text-red-500 font-bold mb-4">{error}</p>
                            <button onClick={handleCancel} className="bg-[var(--bg-primary)] px-4 py-2 rounded font-bold border">Đóng</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Video Feed - Object Cover to Fill the 3:4 Frame */}
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
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                                <RefreshCw className="animate-spin text-white" size={48} />
                            </div>
                        )}
                        
                        {/* --- Live Preview Overlay (Inside 3:4 Frame) --- */}
                        <div className="absolute inset-x-0 bottom-0 p-6 pointer-events-none z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                             <div className="space-y-4 max-w-[85%]">
                                {/* Time Box */}
                                <div className="bg-white rounded-xl px-4 py-2 inline-block shadow-lg">
                                    <span className="text-[#1e3a8a] text-4xl md:text-5xl font-extrabold font-mono tracking-tight">
                                        {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>

                                {/* Info Group with Yellow Line */}
                                <div className="flex gap-4 items-stretch">
                                    <div className="w-1.5 md:w-2 bg-amber-400 rounded-full shrink-0 shadow-sm min-h-full"></div>
                                    <div className="space-y-1.5 text-white text-shadow-sm py-1">
                                        <p className="font-bold text-shadow text-lg md:text-xl">
                                            {['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][currentTime.getDay()]}, 
                                            {' ' + currentTime.toLocaleDateString('vi-VN')}
                                        </p>
                                        <p className="font-medium text-shadow text-base md:text-lg leading-relaxed opacity-95 line-clamp-2">
                                            {currentAddress || "Đang cập nhật vị trí..."}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* User & Device */}
                                <div className="space-y-1 pt-1 pl-[1.5rem] md:pl-[2rem]">
                                    <p className="text-white font-bold text-xl md:text-2xl text-shadow truncate">
                                        Họ Tên: {(userName || "Nhân viên")}
                                    </p>
                                    <p className="text-slate-300 text-xs md:text-sm italic font-medium truncate">
                                        Thiết bị: {deviceInfoString}
                                    </p>
                                </div>
                             </div>
                        </div>

                        {/* Zoom/Ratio Indicator */}
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/20 flex items-center gap-1">
                            <span className="opacity-70">3:4</span>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Start/Cancel Controls */}
        <div className="bg-black/80 backdrop-blur-xl pb-8 pt-4 px-6 border-t border-white/10 shrink-0">
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
