package middleware

import (
	"net/http"

	"time"

	"attendance-system/internal/config"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {

        // 1️⃣ Lấy token từ httpOnly cookie
        token, err := c.Cookie("access_token")
        if err != nil || token == "" {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthenticated")
            c.Abort()
            return
        }

        // 2️⃣ Validate JWT
        claims, err := utils.ValidateToken(token, cfg.JWT.Secret)
        if err != nil {
            utils.ErrorResponse(c, http.StatusUnauthorized, "Token không hợp lệ hoặc đã hết hạn")
            c.Abort()
            return
        }

        // 3️⃣ Set user info vào context
        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        c.Set("user_name", claims.Name)
        c.Set("user_role", claims.Role)

        if claims.DepartmentID != nil {
            c.Set("department_id", *claims.DepartmentID)
        }

        // 4️⃣ (OPTIONAL) Refresh access token nếu sắp hết hạn
        if claims.ExpiresAt != nil {
            if time.Until(claims.ExpiresAt.Time) < 15*time.Minute {

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
                    c.SetCookie(
                        "access_token",
                        newToken,
                        int(cfg.JWT.Expiry.Seconds()),
                        "/",
                        "",
                        true, // Secure
                        true, // HttpOnly
                    )
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