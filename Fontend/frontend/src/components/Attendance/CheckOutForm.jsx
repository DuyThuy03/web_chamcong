import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  ChevronDown, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Timer,
  CalendarCheck,
  Briefcase
} from 'lucide-react';
import CameraCapture from '../Camera/CameraCapture';
import { attendanceService } from '../../service/attendance.service';
import { getCurrentPosition, reverseGeocode, getDeviceInfo, formatTime } from '../../until/helper';
import { useAuth } from '../../contexts/AuthContext';

const CheckOutForm = ({ onSuccess, checkInData }) => {
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
  
  // Real-time duration tracking
  const [workedTime, setWorkedTime] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    loadShifts();
    
    // Calculate worked time initially
    calculateWorkedTime();
    
    // Update worked time every minute
    const interval = setInterval(calculateWorkedTime, 60000);
    return () => clearInterval(interval);
  }, [checkInData]);

  const calculateWorkedTime = () => {
    if (!checkInData?.checkin_time) return;
    
    const start = new Date(checkInData.checkin_time).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setWorkedTime({ hours, minutes });
    }
  };

  const loadShifts = async () => {
    try {
      const response = await attendanceService.getShifts();
      if (response.success) {
        setShifts(response.data);
        // Attempt to auto-select the shift from checkInData if available (assuming checkInData returned shift_id or we can match by time)
        // If checkInData has shift_id, use it. Otherwise default to first.
        if (checkInData?.shift_id) {
            setSelectedShift(checkInData.shift_id);
        } else if (response.data.length > 0) {
            setSelectedShift(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLocationLoading(false);
    }
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
      const response = await attendanceService.checkOut(
        photo,
        location.latitude,
        location.longitude,
        address,
        device,
        selectedShift
      );

      if (response.success) {
        onSuccess(response.data);
      }
    } catch (err){
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Check-out thất bại, vui lòng thử lại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden font-sans transition-colors duration-300">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
             <div className="p-2 bg-rose-100/10 text-rose-500 rounded-md shrink-0 border border-rose-500/20">
                <LogOut size={20} />
             </div>
             Kết thúc ca làm việc
          </h2>
        </div>
        {!error && (
            <div className="self-end sm:self-auto bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 text-rose-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
               Check-out
            </div>
        )}
      </div>

      <div className="p-4 md:p-8">

        {/* WORK SESSION SUMMARY CARD */}
        <div className="mb-8 p-6 bg-[var(--bg-secondary)] rounded-lg shadow-sm relative overflow-hidden group border border-[var(--border-color)] transition-colors duration-300">
            <div className="absolute top-0 right-0 p-8 bg-[var(--accent-color)]/5 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-[var(--accent-color)]/10"></div>
            
            <div className="relative flex flex-col sm:flex-row justify-between items-end gap-6 h-full">
                <div className="space-y-4 w-full"> 
                   <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">
                      <CalendarCheck size={14} /> Thông tin ca làm việc
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                          <p className="text-[var(--text-secondary)] text-xs mb-1">Giờ vào (Check-in)</p>
                          <p className="text-2xl font-mono font-bold text-[var(--text-primary)] flex items-center gap-2">
                             {checkInData?.checkin_time ? formatTime(checkInData.checkin_time).slice(0,5) : '--:--'}
                          </p>
                      </div>
                     
                   </div>
                </div>
                
                <div className="shrink-0 hidden sm:block">
                   <Timer size={48} className="text-[var(--border-color)]" />
                </div>
            </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3 text-rose-500 animate-in slide-in-from-top-2">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div className="text-sm font-medium">{error}</div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 md:gap-8">
            
            {/* 1. Camera Section */}
            <div className="w-full lg:w-5/12 shrink-0">
               <div className="mb-3 flex justify-between items-center">
                   <label className="text-sm font-bold text-[var(--text-secondary)]">Ảnh xác thực *</label>
                   {photo && (
                        <button 
                        type="button" 
                        onClick={() => { setPhoto(null); setPhotoPreview(''); setShowCamera(true); if (!location) handleGetLocation(); }}
                        className="text-xs text-rose-500 font-bold hover:underline"
                        >
                        Chụp lại
                        </button>
                    )}
               </div>
               
               <div 
                  className={`
                    aspect-[3/4] w-full max-w-[280px] lg:max-w-none mx-auto lg:mx-0 rounded-2xl overflow-hidden relative group 
                    border-2 transition-all duration-300
                    ${photoPreview ? 'border-rose-500 shadow-lg shadow-rose-500/20 ring-4 ring-rose-500/10' : 'border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] hover:border-rose-400 cursor-pointer'}
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Camera size={48} className="text-white" />
                      </div>
                      <div className="absolute bottom-3 right-3 bg-rose-500 text-white p-1.5 rounded-full shadow-lg">
                        <CheckCircle size={16} />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] p-4 text-center">
                      <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[var(--border-color)]">
                        <Camera size={28} className="text-rose-500" />
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Chụp ảnh check-out</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Xác nhận kết thúc ca làm</p>
                    </div>
                  )}
                </div>
            </div>

            {/* 2. Info Section */}
            <div className="flex-1 flex flex-col gap-5 md:gap-6">
                
                {/* Location */}
                <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm hover:border-rose-500/30 transition-colors group">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                        <MapPin size={16} className="text-[var(--text-secondary)]" /> Vị trí hiện tại *
                        </label>
                        {location && (
                        <button 
                            type="button" 
                            onClick={handleGetLocation} 
                            className="text-xs text-rose-500 font-bold flex items-center gap-1 hover:underline"
                            disabled={locationLoading}
                        >
                            <RefreshCw size={12} className={locationLoading ? 'animate-spin' : ''} /> Cập nhật
                        </button>
                        )}
                    </div>
                    
                    {location ? (
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <div className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20"></div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 md:line-clamp-none leading-relaxed">
                                {address || "Đã lấy tọa độ"}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] font-mono mt-1 break-all bg-[var(--bg-secondary)] inline-block px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="w-full p-4 flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-rose-500 transition-colors border border-dashed border-[var(--border-color)] rounded-lg"
                        >
                        {locationLoading ? (
                            <><RefreshCw className="animate-spin" size={18} /> Đang định vị...</>
                        ) : (
                            <><MapPin size={18} /> Nhấn để lấy vị trí</>
                        )}
                        </button>
                    )}
                </div>

                {/* Shift */}
                 <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm hover:border-rose-500/30 transition-colors">
                   <label className="text-sm font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                     <Briefcase size={16} className="text-[var(--text-secondary)]" /> Ca làm việc *
                   </label>
                   <div className="relative">
                     <select 
                       value={selectedShift} 
                       onChange={(e) => setSelectedShift(e.target.value)}
                       className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-md focus:ring-1 focus:ring-rose-500 block p-3.5 pr-10 font-bold shadow-sm transition-all cursor-pointer truncate"
                     >
                       {shifts.map(s => (
                         <option key={s.id} value={s.id}>{s.name} ({formatTime(s.start_time).slice(0,5)} - {formatTime(s.end_time).slice(0,5)})</option>
                       ))}
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-secondary)]">
                       <ChevronDown size={18} />
                     </div>
                   </div>
                 </div>

                 {/* Submit Button */}
                 <div className="mt-2 md:mt-auto pt-4 border-t border-[var(--border-color)] lg:border-none">
                   <button
                     type="submit"
                     disabled={loading || !photo || !location}
                     className={`
                       w-full py-4 rounded-lg font-bold text-white shadow-lg text-lg
                       flex items-center justify-center gap-3 transition-all duration-300
                       ${loading || !photo || !location 
                         ? 'bg-slate-300 cursor-not-allowed transform-none shadow-none' 
                         : 'bg-rose-600 hover:shadow-rose-500/40 hover:-translate-y-1 active:scale-95'
                       }
                     `}
                   >
                     {loading ? (
                       <RefreshCw className="animate-spin" size={20} />
                     ) : (
                       <LogOut size={20} /> 
                     )}
                     {loading ? 'Đang xử lý...' : 'Xác nhận Check-out'}
                   </button>
                    {( (!photo || !location) && !loading ) && (
                        <p className="text-center text-xs text-[var(--text-secondary)] mt-3 md:hidden">
                          * Vui lòng hoàn thành các bước trên
                        </p>
                    )}
                 </div>

            </div>
        </form>

      </div>

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

export default CheckOutForm;