package handlers

import (
	"log"
	"net/http"

	"attendance-system/internal/config"
	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
    userRepo *repository.UserRepository
    cfg      *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, cfg *config.Config) *AuthHandler {
    return &AuthHandler{
        userRepo: userRepo,
        cfg:      cfg,
    }
}

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
    AccessToken  string      `json:"access_token"`
    RefreshToken string      `json:"refresh_token"`
    User         interface{} `json:"user"`
}

type RegisterRequest struct {
    Name        string  `json:"name" binding:"required"`
    Email       string  `json:"email" binding:"required,email"`
    Password    string  `json:"password" binding:"required,min=6"`
    PhoneNumber *string `json:"phone_number"`
    DateOfBirth *string `json:"date_of_birth"`
    Address     *string `json:"address"`
    Gender      *string `json:"gender"`
}

func (h *AuthHandler) AddUser(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
        return
    }

    // Check if email already exists
    existingUser, err := h.userRepo.GetByEmail(req.Email)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi hệ thống")
        return
    }
    if existingUser != nil {
        utils.ErrorResponse(c, http.StatusConflict, "Email đã được sử dụng")
        return
    }

    // Hash password
    hashedPassword, err := utils.HashPassword(req.Password)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Không thể mã hóa mật khẩu")
        return
    }

    // Create user
    defaultRole := "Nhân viên"
    defaultStatus := "Hoạt động"
    
    log.Println("Creating user with role:", defaultRole)
    log.Println("Role bytes:", []byte(defaultRole))
    
    user := &models.User{
        Name:     req.Name,
        Email:    req.Email,
        Password: hashedPassword,
        Role:     defaultRole,
        Status:   defaultStatus,
    }

    if req.PhoneNumber != nil {
        user.PhoneNumber.String = *req.PhoneNumber
        user.PhoneNumber.Valid = true
    }
    if req.DateOfBirth != nil {
        user.DateOfBirth.Valid = true
        // Parse date if needed
    }
    if req.Address != nil {
        user.Address.String = *req.Address
        user.Address.Valid = true
    }
    if req.Gender != nil {
        user.Gender.String = *req.Gender
        user.Gender.Valid = true
    }

    // Save to database
    if err := h.userRepo.Create(user); err != nil {
        log.Println("Error creating user:", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Không thể tạo tài khoản")
        return
    }

    // Get user response
    userResponse, _ := h.userRepo.GetByID(user.ID)

    utils.SuccessResponse(c, http.StatusCreated, gin.H{
        "message": "Đăng ký thành công",
        "user":    userResponse,
    })
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }
    
    log.Println("Login attempt for email:", req.Email)
  
    // Get user from database
    user, err := h.userRepo.GetByEmail(req.Email)
    if err != nil {
        log.Println("Error getting user from database:", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Database error")
        return
    }

    if user == nil {
        log.Println("User not found:", req.Email)
        utils.ErrorResponse(c, http.StatusUnauthorized, "Người dùng không tồn tại")
        return
    }

    log.Println("User found:", user.Email, "ID:", user.ID)

    // // Check password
    // if !utils.CheckPassword(req.Password, user.Password) {
    //    log.Println("pass Nhập:", req.Password)
    //     log.Println("pass Lưu trong DB:", user.Password)
    //     utils.ErrorResponse(c, http.StatusUnauthorized, "Sai mật khẩu")
    //     return
    // }

    

    // Generate tokens
    var deptID *int
    if user.DepartmentID.Valid {
        id := int(user.DepartmentID.Int64)
        deptID = &id
        log.Printf("Department ID: %d\n", id)
    } else {
        log.Println("No department ID")
    }

    accessToken, err := utils.GenerateToken(
        user.ID,
        user.Email,
        user.Name,
        user.Role,
        deptID,
        h.cfg.JWT.Secret,
        h.cfg.JWT.Expiry,
    )
    if err != nil {
        log.Println("Error generating access token:", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token")
        return
    }

    log.Println("Access token generated successfully")
    log.Printf("Access token (first 50 chars): %s...\n", accessToken[:min(50, len(accessToken))])

    refreshToken, err := utils.GenerateToken(
        user.ID,
        user.Email,
        user.Name,
        user.Role,
        deptID,
        h.cfg.JWT.Secret,
        h.cfg.JWT.RefreshExpiry,
    )
    if err != nil {
        log.Println("Error generating refresh token:", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate refresh token")
        return
    }

    log.Println("Refresh token generated successfully")

    // Get full user info
    userResponse, err := h.userRepo.GetByID(user.ID)
    if err != nil {
        log.Println("Error getting user details:", err)
    }

    c.SetCookie(
    "access_token",
    accessToken,
    int(h.cfg.JWT.Expiry.Seconds()),
    "/",
    "",
    true, // Secure (HTTPS)
    true, // HttpOnly
)

c.SetCookie(
    "refresh_token",
    refreshToken,
    int(h.cfg.JWT.RefreshExpiry.Seconds()),
    "/",
    "",
    true,
    true,
)

// chỉ trả user
utils.SuccessResponse(c, http.StatusOK, gin.H{
    "user": userResponse,
})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get user profile")
        return
    }

    if user == nil {
        utils.ErrorResponse(c, http.StatusNotFound, "User not found")
        return
    }

    utils.SuccessResponse(c, http.StatusOK, user)
}

type RefreshTokenRequest struct {
    RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken - Cấp lại access token mới từ refresh token
func (h *AuthHandler) RefreshToken(c *gin.Context) {
    var req RefreshTokenRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Thiếu refresh token: "+err.Error())
        return
    }

    log.Println("[REFRESH] Validating refresh token...")
    log.Printf("[REFRESH] Refresh token length: %d\n", len(req.RefreshToken))

    // Validate refresh token
    claims, err := utils.ValidateToken(req.RefreshToken, h.cfg.JWT.Secret)
    if err != nil {
        log.Printf("[REFRESH] Invalid refresh token: %v\n", err)
        utils.ErrorResponse(c, http.StatusUnauthorized, "Refresh token không hợp lệ hoặc đã hết hạn: "+err.Error())
        return
    }

    log.Printf("[REFRESH] Refresh token valid for user ID: %d\n", claims.UserID)

    // Get latest user info from database
    user, err := h.userRepo.GetUserByID(claims.UserID)
    if err != nil || user == nil {
        log.Printf("[REFRESH] User not found: %d\n", claims.UserID)
        utils.ErrorResponse(c, http.StatusNotFound, "Người dùng không tồn tại")
        return
    }

    // Check if user is still active
    if user.Status != "Hoạt động" {
        log.Printf("[REFRESH] User is not active: %s\n", user.Status)
        utils.ErrorResponse(c, http.StatusForbidden, "Tài khoản đã bị vô hiệu hóa")
        return
    }

    log.Printf("[REFRESH] Generating new access token for user: %d (%s)\n", user.ID, user.Email)

    // Generate new access token with latest user data
    var deptID *int
    if user.DepartmentID.Valid {
        id := int(user.DepartmentID.Int64)
        deptID = &id
    }

    newAccessToken, err := utils.GenerateToken(
        user.ID,
        user.Email,
        user.Name,
        user.Role,
        deptID,
        h.cfg.JWT.Secret,
        h.cfg.JWT.Expiry,
    )
    if err != nil {
        log.Printf("[REFRESH] Error generating new access token: %v\n", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Không thể tạo access token mới")
        return
    }

    // Optionally generate new refresh token
    newRefreshToken, err := utils.GenerateToken(
        user.ID,
        user.Email,
        user.Name,
        user.Role,
        deptID,
        h.cfg.JWT.Secret,
        h.cfg.JWT.RefreshExpiry,
    )
    if err != nil {
        log.Printf("[REFRESH] Error generating new refresh token: %v\n", err)
        utils.ErrorResponse(c, http.StatusInternalServerError, "Không thể tạo refresh token mới")
        return
    }

    log.Println("[REFRESH] New tokens generated successfully")

    response := LoginResponse{
        AccessToken:  newAccessToken,
        RefreshToken: newRefreshToken,
        User:         nil, // Không cần trả về user info khi refresh
    }

    utils.SuccessResponse(c, http.StatusOK, response)
}
