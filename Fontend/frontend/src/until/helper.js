export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  let os = "Unknown OS";
  if (userAgent.indexOf("Win") !== -1) os = "Windows";
  else if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
  else if (userAgent.indexOf("Linux") !== -1) os = "Linux";
  else if (userAgent.indexOf("Android") !== -1) os = "Android";
  else if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

  let browser = "Unknown Browser";
  if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (userAgent.indexOf("Safari") !== -1) browser = "Safari";
  else if (userAgent.indexOf("Edge") !== -1) browser = "Edge";

  return {
    os,
    browser,
    userAgent,
    platform
  };
};

export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timeout";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: Infinity,
      },
    );
  });
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    // Using Nominatim (OpenStreetMap) for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
    );
    const data = await response.json();
    return data.display_name || "";
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return "";
  }
};

export const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const formatTime = (date) => {
  const d = new Date(date);
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export const formatDateTime = (date) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const canEditUser = (currentUser, targetUserId) => {
  if (!currentUser) return false;

  // User can edit themselves
  if (currentUser.id === targetUserId) return true;

  // Directors and managers can edit everyone
  if (
    currentUser.role === ROLES.DIRECTOR ||
    currentUser.role === ROLES.MANAGER
  ) {
    return true;
  }

  return false;
};

export const canViewUserAttendance = (currentUser, targetUserId) => {
  if (!currentUser) return false;

  // User can view their own
  if (currentUser.id === targetUserId) return true;

  // Directors and managers can view everyone
  if (
    currentUser.role === ROLES.DIRECTOR ||
    currentUser.role === ROLES.MANAGER
  ) {
    return true;
  }

  // Department leaders can view their department (simplified check)
  if (currentUser.role === ROLES.DEPARTMENT_LEADER) {
    return true; // In production, check if same department
  }

  return false;
};

export const isInDateRange = (record, filters) => {
  const day = record.day?.split("T")[0];
  return (
    day >= filters.from_date &&
    day <= filters.to_date
  );
};
