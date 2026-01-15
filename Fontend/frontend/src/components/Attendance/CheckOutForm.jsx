import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Clock } from 'lucide-react';
import CameraCapture from '../Camera/CameraCapture';
import { attendanceService } from '../../service/attendance.service';
import { getCurrentPosition, reverseGeocode, getDeviceInfo } from '../../until/helper';

const CheckOutForm = ({ onSuccess }) => {
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

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const response = await attendanceService.getShifts();
      if (response.success) {
        setShifts(response.data);
        if (response.data.length > 0) {
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
      setAddress(addressText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePhotoCapture = (file) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!photo) {
      setError('Vui lòng chụp ảnh');
      return;
    }
    
    if (!location) {
      setError('Vui lòng lấy vị trí');
      return;
    }
    
    if (!selectedShift) {
      setError('Vui lòng chọn ca làm việc');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const device = getDeviceInfo();
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
  console.error("Checkout error:", err.response);
  setError(
    err.response?.data?.error ||
    err.response?.data?.message ||
    JSON.stringify(err.response?.data) ||
    'Check-out thất bại'
  );
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Clock size={24} className="text-blue-600" />
        Check-out
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo capture */}
        <div>
          <label className="block text-gray-700 mb-2">Ảnh check-out *</label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview('');
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition flex flex-col items-center gap-2"
            >
              <Camera size={48} className="text-gray-400" />
              <span className="text-gray-600">Nhấn để chụp ảnh</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-gray-700 mb-2">Vị trí *</label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <MapPin size={20} />
            {locationLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
          </button>
          
          {location && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-semibold">Tọa độ:</p>
              <p>Latitude: {location.latitude.toFixed(6)}</p>
              <p>Longitude: {location.longitude.toFixed(6)}</p>
              {address && (
                <>
                  <p className="font-semibold mt-2">Địa chỉ:</p>
                  <p>{address}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Shift selection */}
        <div>
          <label className="block text-gray-700 mb-2">Ca làm việc *</label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Chọn ca làm việc</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.start_time} - {shift.end_time})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !photo || !location}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Check-out'}
        </button>
      </form>

      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default CheckOutForm;