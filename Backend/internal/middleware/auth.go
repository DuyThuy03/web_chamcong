package middleware

import (
	"net/http"
	"strings"

	"attendance-system/internal/config"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Authorization header required")
            c.Abort()
            return
        }

        bearerToken := strings.Split(authHeader, " ")
        if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid authorization format")
            c.Abort()
            return
        }

        token := bearerToken[1]
        claims, err := utils.ValidateToken(token, cfg.JWT.Secret)
        if err != nil {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid or expired token")
            c.Abort()
            return
        }

        // Set user info in context
        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        c.Set("user_name", claims.Name)
        c.Set("user_role", claims.Role)
        if claims.DepartmentID != nil {
            c.Set("department_id", *claims.DepartmentID)
        }

        c.Next()
    }
}

func GetUserID(c *gin.Context) (int, bool) {
    userID, exists := c.Get("user_id")
    if !exists {
        return 0, false
    }
    return userID.(int), true
}

func GetUserRole(c *gin.Context) (string, bool) {
    role, exists := c.Get("user_role")
    if !exists {
        return "", false
    }
    return role.(string), true
}

func GetDepartmentID(c *gin.Context) (int, bool) {
    deptID, exists := c.Get("department_id")
    if !exists {
        return 0, false
    }
    return deptID.(int), true
}