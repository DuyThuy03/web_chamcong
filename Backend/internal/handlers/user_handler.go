package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
    userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
    return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) GetAll(c *gin.Context) {
    role, _ := middleware.GetUserRole(c)
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

    if page < 1 {
        page = 1
    }
    if limit < 1 || limit > 100 {
        limit = 20
    }

    offset := (page - 1) * limit

    var users interface{}
    var total int
    var err error

    keyword := strings.TrimSpace(c.Query("keyword"))

if role == "Trưởng phòng" {
    deptID, _ := middleware.GetDepartmentID(c)

    if keyword != "" {
        users, total, err = h.userRepo.GetByDepartmentWithSearch(
            deptID, keyword, limit, offset,
        )
    } else {
        users, total, err = h.userRepo.GetByDepartment(deptID, limit, offset)
    }
} else {
    if keyword != "" {
        users, total, err = h.userRepo.GetAllWithSearch(keyword, limit, offset)
    } else {
        users, total, err = h.userRepo.GetAll(limit, offset)
    }
}

        if keyword != "" && len(keyword) < 2 {
            utils.PaginatedSuccessResponse(c, http.StatusOK, []any{}, utils.Pagination{
                Total: 0, Page: page, Limit: limit, TotalPages: 0,
            })
            return
        }

    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get users")
        return
    }

    totalPages := (total + limit - 1) / limit
    pagination := utils.Pagination{
        Total:      total,
        Page:       page,
        Limit:      limit,
        TotalPages: totalPages,
    }

    utils.PaginatedSuccessResponse(c, http.StatusOK, users, pagination)
}

func (h *UserHandler) GetByID(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
        return
    }

    if !middleware.CheckUserAccess(c, id) {
        utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
        return
    }

    user, err := h.userRepo.GetByID(id)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get user")
        return
    }

    if user == nil {
        utils.ErrorResponse(c, http.StatusNotFound, "User not found")
        return
    }

    utils.SuccessResponse(c, http.StatusOK, user)
}

type UpdateUserRequest struct {
    Name         string  `json:"name"`
    Email        string  `json:"email"`
    DateOfBirth  *string `json:"date_of_birth"`
    Address      *string `json:"address"`
    Gender       *string `json:"gender"`
    PhoneNumber  *string `json:"phone_number"`
    Role         *string `json:"role"`
    DepartmentID *int    `json:"department_id"`
    Status       *string `json:"status"`
    BaseSalary   *float64 `json:"base_salary"`
    NewPassword  *string  `json:"new_password"`
}

func (h *UserHandler) Update(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
        return
    }

    var req UpdateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }

    existing, err := h.userRepo.GetUserByID(id)
    if err != nil || existing == nil {
        utils.ErrorResponse(c, http.StatusNotFound, "User not found")
        return
    }

    currentUserID, _ := middleware.GetUserID(c)
    currentRole, _ := middleware.GetUserRole(c)

    user := &models.User{
        ID:       id,
        Name:     req.Name,
        Email:    req.Email,
        Password: existing.Password, 
        BaseSalary: existing.BaseSalary,
    }

    if req.NewPassword != nil && *req.NewPassword != "" {
        hashed, err := utils.HashPassword(*req.NewPassword)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi mã hóa mật khẩu")
            return
        }
        user.Password = hashed
    }

    if req.DateOfBirth != nil {
        
        parsedDate, err := time.Parse("2006-01-02", *req.DateOfBirth)
        if err == nil {
            user.DateOfBirth.Time = parsedDate
            user.DateOfBirth.Valid = true
        } else {
            user.DateOfBirth = existing.DateOfBirth
        }
    } else {
        user.DateOfBirth = existing.DateOfBirth
    }

    if req.Address != nil {
        user.Address.String = *req.Address
        user.Address.Valid = true
    } else {
        user.Address = existing.Address
    }

    if req.Gender != nil {
        user.Gender.String = *req.Gender
        user.Gender.Valid = true
    } else {
        user.Gender = existing.Gender
    }

    if req.PhoneNumber != nil {
        user.PhoneNumber.String = *req.PhoneNumber
        user.PhoneNumber.Valid = true
    } else {
        user.PhoneNumber = existing.PhoneNumber
    }

    if currentUserID == id {
        
        user.Role = existing.Role
        user.DepartmentID = existing.DepartmentID
        user.Status = existing.Status
        user.BaseSalary = existing.BaseSalary 
    } else if currentRole == "Giám đốc" || currentRole == "Quản lý" {
        
        if req.Role != nil {
            user.Role = *req.Role
        } else {
            user.Role = existing.Role
        }

        if req.DepartmentID != nil {
            user.DepartmentID.Int64 = int64(*req.DepartmentID)
            user.DepartmentID.Valid = true
        } else {
            user.DepartmentID = existing.DepartmentID
        }

        if req.Status != nil {
            user.Status = *req.Status
        } else {
            user.Status = existing.Status
        }

        if req.BaseSalary != nil {
            user.BaseSalary = *req.BaseSalary
        }
    } else if currentRole == "Trưởng phòng" {

        user.Role = existing.Role
        user.DepartmentID = existing.DepartmentID
        user.Status = existing.Status
    } else {
        utils.ErrorResponse(c, http.StatusForbidden, "Insufficient permissions")
        return
    }

    err = h.userRepo.Update(user)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update user: "+err.Error())
        return
    }

    updated, _ := h.userRepo.GetByID(id)
    utils.SuccessMessageResponse(c, http.StatusOK, "Cập nhật thông tin thành công", updated)
}

type UpdateProfileRequest struct {
    Name        string  `json:"name" binding:"required"`
    Email       string  `json:"email" binding:"required,email"`
    DateOfBirth *string `json:"date_of_birth"`
    Address     *string `json:"address"`
    Gender      *string `json:"gender"`
    PhoneNumber *string `json:"phone_number"`
    Password    *string `json:"password"`
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
    currentUserID, _ := middleware.GetUserID(c)

    var req UpdateProfileRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
        return
    }

    existing, err := h.userRepo.GetUserByID(currentUserID)
    if err != nil || existing == nil {
        utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thông tin người dùng")
        return
    }

    user := &models.User{
        ID:           currentUserID,
        Name:         req.Name,
        Email:        req.Email,
        Password:     existing.Password, // Keep existing password by default
        Role:         existing.Role,
        DepartmentID: existing.DepartmentID,
        Status:       existing.Status,
        BaseSalary:   existing.BaseSalary,
    }

    // Process password update
    if req.Password != nil && *req.Password != "" {
        hashed, err := utils.HashPassword(*req.Password)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi mã hóa mật khẩu")
            return
        }
        user.Password = hashed
    }

    if req.DateOfBirth != nil {
        
        parsedDate, err := time.Parse("2006-01-02", *req.DateOfBirth)
        if err == nil {
            user.DateOfBirth.Time = parsedDate
            user.DateOfBirth.Valid = true
        } else {
            user.DateOfBirth = existing.DateOfBirth
        }
    } else {
        user.DateOfBirth = existing.DateOfBirth
    }

    if req.Address != nil {
        user.Address.String = *req.Address
        user.Address.Valid = true
    } else {
        user.Address = existing.Address
    }

    if req.Gender != nil {
        user.Gender.String = *req.Gender
        user.Gender.Valid = true
    } else {
        user.Gender = existing.Gender
    }

    if req.PhoneNumber != nil {
        user.PhoneNumber.String = *req.PhoneNumber
        user.PhoneNumber.Valid = true
    } else {
        user.PhoneNumber = existing.PhoneNumber
    }

    err = h.userRepo.Update(user)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Cập nhật thông tin thất bại: "+err.Error())
        return
    }

    updated, _ := h.userRepo.GetByID(currentUserID)
    utils.SuccessMessageResponse(c, http.StatusOK, "Cập nhật thông tin cá nhân thành công", updated)
}
func (h *UserHandler) GetMinimalList(c *gin.Context) {
    users, err := h.userRepo.GetMinimalList()
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch user list")
        return
    }
    utils.SuccessResponse(c, http.StatusOK, users)
}

func (h *AuthHandler) Logout(c *gin.Context) {
    c.SetCookie("access_token", "", -1, "/", "", true, true)
    c.SetCookie("refresh_token", "", -1, "/", "", true, true)

    utils.SuccessResponse(c, http.StatusOK, gin.H{
        "message": "Logged out",
    })
}
