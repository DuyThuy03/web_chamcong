import api from "./api";

export const attendanceService = {
  async checkIn(imageFile, latitude, longitude, address, device, shiftId, accuracy, checkinType, factoryName, note, accompanyingUserIDs) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("address", address || "");
    formData.append("device", device);
    formData.append("shift_id", shiftId);
    if (accuracy) formData.append("accuracy", accuracy);
    if (checkinType) formData.append("checkin_type", checkinType);
    if (factoryName) formData.append("factory_name", factoryName);
    if (note) formData.append("note", note);
    if (accompanyingUserIDs && accompanyingUserIDs.length > 0) {
        accompanyingUserIDs.forEach(id => formData.append("accompanying_user_ids", id));
    }

    const response = await api.post("/attendance/checkin", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });


    return response.data;
  },

  async checkOut(imageFile, latitude, longitude, address, device, shiftId, accuracy, checkinType, factoryName, note, accompanyingUserIDs) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("address", address || "");
    formData.append("device", device);
    formData.append("shift_id", shiftId);
    if (accuracy) formData.append("accuracy", accuracy);
    if (checkinType) formData.append("checkin_type", checkinType);
    if (factoryName) formData.append("factory_name", factoryName);
    if (note) formData.append("note", note);
    if (accompanyingUserIDs && accompanyingUserIDs.length > 0) {
        accompanyingUserIDs.forEach(id => formData.append("accompanying_user_ids", id));
    }

    const response = await api.post("/attendance/checkout", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async getTodayAttendance() {
    const response = await api.get("/attendance/today");
    console.log("TODAY ATTENDANCE RESPONSE:", response.data);
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

  async updateAttendance(id, data) {
    const response = await api.put(`/attendance/${id}`, data);
    console.log("acbs:", response.data);
    return response.data;
  },

  async getHistoryDetails(id) {
    const response = await api.get(`/attendance/${id}/history`);
    return response.data;
  },

  async getMinimalUsers() {
    const response = await api.get("/users/minimal");
    return response.data;
  },
};
