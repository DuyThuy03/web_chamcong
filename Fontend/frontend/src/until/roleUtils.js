// User Roles
export const USER_ROLES = {
  EMPLOYEE: "Nhân viên",
  DEPARTMENT_HEAD: "Trưởng phòng",
  MANAGER: "Quản lý",
  DIRECTOR: "Giám đốc",
};

// Role Hierarchy (higher number = more privileges)
export const ROLE_HIERARCHY = {
  [USER_ROLES.EMPLOYEE]: 1,
  [USER_ROLES.DEPARTMENT_HEAD]: 2,
  [USER_ROLES.MANAGER]: 3,
  [USER_ROLES.DIRECTOR]: 4,
};

// Default routes for each role
export const ROLE_ROUTES = {
  [USER_ROLES.EMPLOYEE]: "/employee/dashboard",
  [USER_ROLES.DEPARTMENT_HEAD]: "/department-head/dashboard",
  [USER_ROLES.MANAGER]: "/manager/dashboard",
  [USER_ROLES.DIRECTOR]: "/director/dashboard",
};

// Check if user has permission to access a role
export const hasRolePermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Get accessible roles for a user (user's role and below)
export const getAccessibleRoles = (userRole) => {
  const userLevel = ROLE_HIERARCHY[userRole];
  return Object.keys(ROLE_HIERARCHY).filter(
    (role) => ROLE_HIERARCHY[role] <= userLevel
  );
};
