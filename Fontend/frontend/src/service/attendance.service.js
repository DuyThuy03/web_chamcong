import api from "./api";

export const attendanceService = {
  async checkIn(imageFile, latitude, longitude, address, device, shiftId) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("address", address || "");
    formData.append("device", device);
    formData.append("shift_id", shiftId);

    const response = await api.post("/attendance/checkin", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });


    return response.data;
  },

  async checkOut(imageFile, latitude, longitude, address, device, shiftId) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("address", address || "");
    formData.append("device", device);
    formData.append("shift_id", shiftId);

    const response = await api.post("/attendance/checkout", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async getTodayAttendance() {
    const response = await api.get("/attendance/today");
    return response.data;
  },

  async getHistory(params = {}) {
    const response = await api.get("/attendance/history", { params });
    return response.data;
  },

  async getShifts() {
    const response = await api.get("/shifts");
    return response.data;
  },
};
