import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  ChevronDown, 
  LogIn, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  User,
  Briefcase
} from 'lucide-react';
import CameraCapture from '../Camera/CameraCapture';
import { attendanceService } from '../../service/attendance.service';
import { getCurrentPosition, reverseGeocode, getDeviceInfo, formatTime } from '../../until/helper';
import { useAuth } from '../../contexts/AuthContext';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center md:items-end">
      <div className="text-3xl md:text-4xl font-black text-slate-800 font-mono tracking-wider tabular-nums">
        {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">
        {time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
};

const CheckInForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadShifts();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadShifts = async () => {
    try {
      const response = await attendanceService.getShifts();
   
      if (response.success) {
        setShifts(response.data);
        if (response.data.length > 0) setSelectedShift(response.data[0].id);
      }
    } catch (error) { console.error(error); }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    setError('');
    try {
      const position = await getCurrentPosition();
      setLocation(position);
      const addressText = await reverseGeocode(position.latitude, position.longitude);
      const combinedAddress = addressText 
        ? `${addressText} (${position.latitude}, ${position.longitude})`
        : `${position.latitude}, ${position.longitude}`;
      setAddress(combinedAddress);
    } catch (err) { setError(err.message); } 
    finally { setLocationLoading(false); }
  };

  useEffect(() => {
    handleGetLocation();
  }, []);

  const handlePhotoCapture = (file) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return setError('Vui lòng chụp ảnh xác thực');
    if (!location) return setError('Vui lòng cập nhật vị trí');
    if (!selectedShift) return setError('Vui lòng chọn ca làm việc');

    setLoading(true);
    setError('');
    try {
      const deviceObj = getDeviceInfo();
      const device = `${deviceObj.os} - ${deviceObj.browser} (${deviceObj.platform})`;
      const response = await attendanceService.checkIn(photo, location.latitude, location.longitude, address, device, selectedShift);
      if (response.success && onSuccess) onSuccess(response.data);
    } catch (err) { setError(err.response?.data?.error || 'Check-in thất bại. Vui lòng thử lại.'); } 
    finally { setLoading(false); }
  };

  // Helper to determine accurate shift status
  const getShiftStatus = () => {
    if (!selectedShift || shifts.length === 0) return null;
    const shift = shifts.find(s => s.id == selectedShift);
    if (!shift) return null;

    // Parse shift start time
    const sDate = new Date(shift.start_time);
    const shiftStart = new Date();
    // Use getUTCHours because helper.js formatTime uses UTC
    shiftStart.setHours(sDate.getUTCHours(), sDate.getUTCMinutes(), 0, 0);

    const diff = (currentTime - shiftStart) / (1000 * 60); // minutes
    
    if (diff > 0) {
      return { status: 'LATE', text: `Đi muộn ${Math.floor(diff)} phút`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    } else {
      return { status: 'ON_TIME', text: 'Đúng giờ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
    }
  };

  const shiftStatus = getShiftStatus();
  const currentShiftDetails = shifts.find(s => s.id == selectedShift);

  return (
    <div className="w-full">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20 transform rotate-3">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wide mb-1">Xin chào,</p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-none">{user?.name || 'Nhân viên'}</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Chúc bạn một ngày làm việc hiệu quả</p>
          </div>
        </div>

        {/* Clock */}
        <div className="flex flex-col items-center md:items-end">
          <div className="text-3xl md:text-4xl font-black text-[var(--text-primary)] font-mono tracking-wider tabular-nums">
             {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[var(--text-secondary)] text-sm font-medium uppercase tracking-widest mt-1">
             {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* LEFT COLUMN: MAIN ACTION */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
              {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="text-[var(--accent-color)]" size={24} />
                Check-in Ca Làm Việc
              </h2>
              {!error && (
                  <span className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 inline-block self-start">
                    * Yêu cầu ảnh & vị trí
                  </span>
              )}
            </div>

            <div className="p-4 md:p-8">
              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3 text-rose-700 animate-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0 mt-0.5" size={20} />
                  <div>
                      <h4 className="font-bold text-sm">Đã xảy ra lỗi</h4>
                      <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* CAMERA SECTION */}
                  <div className="w-full lg:w-5/12 shrink-0 flex flex-col items-center">
                    <div className="w-full text-center mb-3 lg:text-left flex justify-between items-center">
                        <label className="text-sm font-bold text-[var(--text-secondary)]">Ảnh xác thực *</label>
                        {photo && (
                            <button 
                              type="button" 
                              onClick={() => { setPhoto(null); setPhotoPreview(''); setShowCamera(true); if (!location) handleGetLocation(); }}
                              className="text-xs text-[var(--accent-color)] font-bold hover:underline"
                            >
                              Chụp lại
                            </button>
                        )}
                    </div>
                    
                    <div 
                      className={`
                        aspect-[3/4] w-full max-w-[280px] lg:max-w-none rounded-2xl overflow-hidden relative group 
                        border-2 transition-all duration-300 shadow-sm
                        ${photoPreview ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent-color)] cursor-pointer'}
                      `}
                      onClick={() => {
                        if (!photoPreview) {
                          setShowCamera(true);
                          if (!location) handleGetLocation();
                        }
                      }}
                    >
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                              <Camera size={48} className="text-white drop-shadow-md" />
                          </div>
                          <div className="absolute bottom-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-10">
                            <CheckCircle size={16} />
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] p-6 text-center animate-in fade-in">
                          <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full shadow-sm border border-[var(--border-color)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-[var(--accent-color)] transition-all duration-300">
                            <Camera size={32} />
                          </div>
                          <p className="text-base font-bold text-[var(--text-primary)]">Chụp ảnh check-in</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">Vui lòng để khuôn mặt trong khung hình rõ nét</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INPUT SECTION */}
                  <div className="flex-1 flex flex-col gap-6">
                      
                      {/* Location Input */}
                      <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm hover:border-[var(--accent-color)] transition-colors group">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                            <MapPin size={18} className="text-rose-500" /> Vị trí hiện tại *
                          </label>
                          {location && (
                            <button 
                              type="button" 
                              onClick={handleGetLocation} 
                              className="text-xs text-[var(--accent-color)] font-bold flex items-center gap-1 hover:bg-[var(--bg-secondary)] px-2 py-1 rounded transition-colors"
                              disabled={locationLoading}
                            >
                              <RefreshCw size={12} className={locationLoading ? 'animate-spin' : ''} /> 
                              {locationLoading ? 'Đang cập nhật' : 'Làm mới'}
                            </button>
                          )}
                        </div>
                        
                        {location ? (
                          <div className="flex items-start gap-3">
                              <div className="mt-1">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">
                                      {address || "Đã lấy tọa độ thành công"}
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-1 bg-[var(--bg-secondary)] inline-block px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                  </p>
                              </div>
                          </div>
                        ) : (
                            <button
                              type="button"
                              onClick={handleGetLocation}
                              disabled={locationLoading}
                              className="w-full py-6 border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-secondary)] transition-all font-medium"
                            >
                              <MapPin size={24} className={locationLoading ? 'animate-bounce' : ''} />
                              {locationLoading ? 'Đang định vị...' : 'Nhấn để lấy vị trí hiện tại'}
                            </button>
                        )}
                      </div>

                      {/* Shift Input */}
                      <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm hover:border-[var(--accent-color)] transition-colors">
                        <label className="text-sm font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                          <Briefcase size={18} className="text-indigo-500" /> Chọn ca làm việc *
                        </label>
                        
                        <div className="relative mb-4">
                          <select 
                            value={selectedShift} 
                            onChange={(e) => setSelectedShift(e.target.value)}
                            className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-base rounded-md focus:ring-1 focus:ring-[var(--accent-color)] block p-3 pr-10 font-bold shadow-sm transition-all cursor-pointer"
                          >
                            {shifts.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({formatTime(s.start_time).slice(0,5)} - {formatTime(s.end_time).slice(0,5)})</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-secondary)]">
                            <ChevronDown size={20} />
                          </div>
                        </div>

                        {/* Shift Details Preview */}
                        {currentShiftDetails && shiftStatus && (
                          <div className={`p-4 rounded-lg border flex justify-between items-center ${shiftStatus.bg}`}>
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg bg-white/50 ${shiftStatus.color}`}>
                                      <Clock size={20} />
                                  </div>
                                  <div>
                                      <p className={`text-xs font-bold uppercase ${shiftStatus.color}`}>Trạng thái</p>
                                      <p className="text-sm font-bold text-slate-800">{shiftStatus.text}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Giờ vào</p>
                                    <p className="text-lg font-mono font-bold text-slate-800">{formatTime(currentShiftDetails.start_time).slice(0,5)}</p>
                              </div>
                          </div>
                        )}

                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-auto">
                        <button
                          type="submit"
                          disabled={loading || !photo || !location}
                          className={`
                            w-full py-4 rounded-lg font-bold text-white shadow-lg text-lg
                            flex items-center justify-center gap-3 transition-all duration-300
                            ${loading || !photo || !location 
                              ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                              : 'bg-[var(--accent-color)] hover:brightness-110 hover:-translate-y-1 hover:scale-[1.01] active:scale-95'
                            }
                          `}
                          style={{ color: (loading || !photo || !location) ? undefined : '#000' }}
                        >
                          {loading ? (
                            <RefreshCw className="animate-spin" size={24} />
                          ) : (
                            <LogIn size={24} /> 
                          )}
                          {loading ? 'Đang xử lý...' : 'Xác nhận Check-in'}
                        </button>
                      </div>

                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      
        {/* RIGHT COLUMN: INFO/HISTORY */}
          <div className="lg:col-span-4 space-y-6">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-lg p-6 text-white shadow-xl relative overflow-hidden">
                  {/* Decor */}
                  <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 p-10 bg-blue-500/20 rounded-full blur-2xl -ml-5 -mb-5"></div>
                  
                  <h3 className="relative text-lg font-bold mb-4 flex items-center gap-2">
                      <ShieldCheck className="text-emerald-400" />
                      Lưu ý chấm công
                  </h3>
                  <ul className="relative space-y-3 text-sm text-slate-300">
                      <li className="flex gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                          <span>Vui lòng cho phép truy cập <strong>Camera</strong> và <strong>Vị trí</strong> trên trình duyệt.</span>
                      </li>
                      <li className="flex gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                          <span>Đảm bảo khuôn mặt nằm trọn trong khung hình check-in.</span>
                      </li>
                        <li className="flex gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                          <span>Hệ thống sẽ ghi nhận thời gian dựa trên máy chủ (Server Time).</span>
                      </li>
                  </ul>
              </div>
          </div>

      </div>

      {/* Camera Capture Modal - Persisted for performance */}
      { (showCamera || photoPreview) && (
        <div className={!showCamera ? "hidden" : ""}>
          <CameraCapture 
             onCapture={handlePhotoCapture} 
             onCancel={() => setShowCamera(false)} 
             userName={user?.name}
             currentAddress={address}
          />
        </div>
      )}
    </div>
  );
};

export default CheckInForm;