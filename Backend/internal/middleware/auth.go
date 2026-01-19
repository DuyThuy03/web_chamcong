package middleware

import (
	"net/http"
	"strings"
	"time"

	"attendance-system/internal/config"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
           
            utils.ErrorResponse(c, http.StatusUnauthorized, "Yêu cầu header Authorization")
            c.Abort()
            return
        }

        bearerToken := strings.Split(authHeader, " ")
        if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
          
            utils.ErrorResponse(c, http.StatusUnauthorized, "Token sai định dạng")
            c.Abort()
            return
        }

        token := bearerToken[1]
       
        
        claims, err := utils.ValidateToken(token, cfg.JWT.Secret)
        if err != nil {
           
            utils.ErrorResponse(c, http.StatusUnauthorized, "Token không hợp lệ hoặc đã hết hạn: "+err.Error())
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

        if claims.ExpiresAt != nil {
            timeUntilExpiry := time.Until(claims.ExpiresAt.Time)
           
            
            // Nếu token còn ít hơn 1 giờ, tạo token mới
            if timeUntilExpiry < 1*time.Hour {
             
                
                newToken, err := utils.GenerateToken(
                    claims.UserID,
                    claims.Email,
                    claims.Name,
                    claims.Role,
                    claims.DepartmentID,
                    cfg.JWT.Secret,
                    cfg.JWT.Expiry,
                )
                
                if err == nil {
                    // Gửi token mới trong response header
                    c.Header("X-New-Token", newToken)
                    c.Header("X-Token-Refreshed", "true")
                   
                } else {
                    
                }
            }
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