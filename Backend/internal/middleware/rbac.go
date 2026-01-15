package middleware

import (
    "net/http"
    "strconv"

    "attendance-system/internal/utils"
    
    "github.com/gin-gonic/gin"
)

// Role-based access control middleware

// RequireRole checks if user has one of the allowed roles
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, exists := GetUserRole(c)
        if !exists {
            utils.ErrorResponse(c, http.StatusUnauthorized, "User role not found")
            c.Abort()
            return
        }

        allowed := false
        for _, allowedRole := range allowedRoles {
            if role == allowedRole {
                allowed = true
                break
            }
        }

        if !allowed {
            utils.ErrorResponse(c, http.StatusForbidden, "Insufficient permissions")
            c.Abort()
            return
        }

        c.Next()
    }
}

// CheckUserAccess verifies if user can access/modify another user's data
func CheckUserAccess(c *gin.Context, targetUserID int) bool {
    currentUserID, _ := GetUserID(c)
    role, _ := GetUserRole(c)

    // User can always access their own data
    if currentUserID == targetUserID {
        return true
    }

    // Directors and managers can access all users
    if role == "Giám đốc" || role == "Quản lý" {
        return true
    }

    // Department leaders can access users in their department
    if role == "Trưởng phòng" {
        currentDeptID, hasDept := GetDepartmentID(c)
        if !hasDept {
            return false
        }
        
        // Check if target user is in the same department
        // This requires a database call - simplified here
        // In production, implement a repository method
        return checkSameDepartment(currentDeptID, targetUserID)
    }

    return false
}

// CheckUserAccessMiddleware is a middleware version of CheckUserAccess
func CheckUserAccessMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        targetUserIDStr := c.Param("id")
        if targetUserIDStr == "" {
            targetUserIDStr = c.Query("user_id")
        }

        if targetUserIDStr == "" {
            c.Next()
            return
        }

        targetUserID, err := strconv.Atoi(targetUserIDStr)
        if err != nil {
            utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
            c.Abort()
            return
        }

        if !CheckUserAccess(c, targetUserID) {
            utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
            c.Abort()
            return
        }

        c.Next()
    }
}

// CheckAttendanceAccess verifies if user can view attendance records
func CheckAttendanceAccess() gin.HandlerFunc {
	return func(c *gin.Context) {

		targetUserIDStr := c.Query("user_id")
		if targetUserIDStr == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "Thiếu user_id")
			c.Abort()
			return
		}

		targetUserID, err := strconv.Atoi(targetUserIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "user_id không hợp lệ")
			c.Abort()
			return
		}

		if !CheckUserAccess(c, targetUserID) {
			utils.ErrorResponse(c, http.StatusForbidden, "Không có quyền truy cập")
			c.Abort()
			return
		}

		c.Next()
	}
}


// Helper function - in production this should query the database
func checkSameDepartment(deptID, userID int) bool {
    // Simplified - implement actual database check
    return true
}

// CORS middleware
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        
        allowed := false
        for _, allowedOrigin := range allowedOrigins {
            if origin == allowedOrigin {
                allowed = true
                break
            }
        }

        if allowed {
            c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
        }
        
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}