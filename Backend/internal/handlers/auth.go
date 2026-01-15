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
    
  
    // Get user from database
    user, err := h.userRepo.GetByEmail(req.Email)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Database error")
        return
    }

    if user == nil {
        utils.ErrorResponse(c, http.StatusUnauthorized, "Người dùng không tồn tại")
        return
    }

    

    // Check password
    // if !utils.CheckPassword(req.Password, user.Password) {
    //     utils.ErrorResponse(c, http.StatusUnauthorized, "Sai mật khẩu")
    //     return
    // }


    // Generate tokens
    var deptID *int
    if user.DepartmentID.Valid {
        id := int(user.DepartmentID.Int64)
        deptID = &id
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
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token")
        return
    }

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
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate refresh token")
        return
    }

    // Get full user info
    userResponse, _ := h.userRepo.GetByID(user.ID)

    response := LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        User:         userResponse,
    }

    utils.SuccessResponse(c, http.StatusOK, response)
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
