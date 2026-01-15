package handlers

import (
	"net/http"
	"strconv"

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

    if role == "Trưởng phòng" {
        deptID, _ := middleware.GetDepartmentID(c)
        users, total, err = h.userRepo.GetByDepartment(deptID, limit, offset)
    } else {
        users, total, err = h.userRepo.GetAll(limit, offset)
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

    // Get existing user
    existing, err := h.userRepo.GetByID(id)
    if err != nil || existing == nil {
        utils.ErrorResponse(c, http.StatusNotFound, "User not found")
        return
    }

    // Update fields (simplified - add proper validation)
    user := &models.User{
        ID:    id,
        Name:  req.Name,
        Email: req.Email,
    }

    if req.Role != nil {
        user.Role = *req.Role
    }

    err = h.userRepo.Update(user)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update user")
        return
    }

    updated, _ := h.userRepo.GetByID(id)
    utils.SuccessMessageResponse(c, http.StatusOK, "User updated successfully", updated)
}