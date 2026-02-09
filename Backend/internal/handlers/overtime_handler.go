package handlers

import (
	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"
	ws "attendance-system/internal/websocket"
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type OvertimeHandler struct {
	overtimeRepo *repository.OvertimeRepository
	userRepo     *repository.UserRepository
	hub          *ws.Hub
}

func NewOvertimeHandler(overtimeRepo *repository.OvertimeRepository, userRepo *repository.UserRepository, hub *ws.Hub) *OvertimeHandler {
	return &OvertimeHandler{
		overtimeRepo: overtimeRepo,
		userRepo:     userRepo,
		hub:          hub,
	}
}

type CreateOvertimeRequest struct {
	Date      string  `json:"date" binding:"required"`       
	StartTime string  `json:"start_time" binding:"required"` 
	EndTime   string  `json:"end_time" binding:"required"`   
	Content   *string `json:"content,omitempty"`
}

func (h *OvertimeHandler) Create(c *gin.Context) {
	var req CreateOvertimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	day, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid date format (expected YYYY-MM-DD)")
		return
	}

	layout := "15:04"
	start, err := time.Parse(layout, req.StartTime)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start_time format (expected HH:MM)")
		return
	}
	end, err := time.Parse(layout, req.EndTime)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end_time format (expected HH:MM)")
		return
	}

	if !end.After(start) {
		utils.ErrorResponse(c, http.StatusBadRequest, "End time must be after start time")
		return
	}

	duration := end.Sub(start).Hours()
	if duration <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Duration must be positive")
		return
	}

	userID, _ := middleware.GetUserID(c)

	overtime := &models.Overtime{
		UserID:     userID,
		Day:        day,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		TotalHours: duration,
		BaseRate:   1.0, 
		Status:     "CHO_DUYET",
	}

	if req.Content != nil {
		overtime.Content = sql.NullString{
			String: *req.Content,
			Valid:  true,
		}
	}

	if err := h.overtimeRepo.Create(overtime); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create overtime request")
		return
	}
	
	userName := c.GetString("user_name")

	resp := models.OvertimeResponse{
		ID:         overtime.ID,
		UserID:     overtime.UserID,
		UserName:   userName,
		Day:        overtime.Day.Format("2006-01-02"),
		StartTime:  overtime.StartTime,
		EndTime:    overtime.EndTime,
		TotalHours: overtime.TotalHours,
		BaseRate:   overtime.BaseRate,
		Status:     overtime.Status,
		CreatedAt:  overtime.CreatedAt,
		Content:    req.Content,
	}

	ws.Emit(h.hub, "NEW_OVERTIME_REQUEST", resp)

	utils.SuccessResponse(c, http.StatusCreated, resp)
}

func (h *OvertimeHandler) GetAll(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
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

	status := strings.TrimSpace(c.DefaultQuery("status", ""))
	var deptID *int

	switch role {
	case "Nhân viên":
		id := 0
		deptID = &id 
	case "Trưởng phòng":
		id, exists := middleware.GetDepartmentID(c)
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "Department not found")
			return
		}
		deptID = &id
	case "Quản lý", "Giám đốc":
		deptID = nil 
	default:
		utils.ErrorResponse(c, http.StatusForbidden, "Unauthorized")
		return
	}

	list, total, err := h.overtimeRepo.GetAll(userID, role, deptID, limit, offset, status)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch overtime requests")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"requests": list,
		"pagination": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *OvertimeHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID")
		return
	}

	req, err := h.overtimeRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Error fetching request")
		return
	}
	if req == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Request not found")
		return
	}

	userID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	if role == "Nhân viên" && req.UserID != userID {
		utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
		return
	}

	if role == "Trưởng phòng" {
		user, err := h.userRepo.GetByID(req.UserID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Error verifying user")
			return
		}
		deptID, _ := middleware.GetDepartmentID(c)
		if user.DepartmentID == nil || *user.DepartmentID != deptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, req)
}

type ApproveOvertimeRequest struct {
	Rate *float64 `json:"rate,omitempty"`
}

func (h *OvertimeHandler) Approve(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID")
		return
	}

	var reqBody ApproveOvertimeRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {

	}

	approverID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	req, err := h.overtimeRepo.GetByID(id)
	if err != nil || req == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Request not found")
		return
	}

	if req.Status != "CHO_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Request is not pending")
		return
	}

	if role == "Trưởng phòng" {
		user, err := h.userRepo.GetByID(req.UserID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Error verifying user")
			return
		}
		deptID, _ := middleware.GetDepartmentID(c)
		if user.DepartmentID == nil || *user.DepartmentID != deptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Cannot approve requests outside department")
			return
		}
	}

	if err := h.overtimeRepo.UpdateStatus(id, "DA_DUYET", approverID, reqBody.Rate); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to approve")
		return
	}

	updated, _ := h.overtimeRepo.GetByID(id)
	ws.Emit(h.hub, "OVERTIME_APPROVED", updated)

	utils.SuccessResponse(c, http.StatusOK, updated)
}

func (h *OvertimeHandler) Reject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID")
		return
	}

	approverID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	req, err := h.overtimeRepo.GetByID(id)
	if err != nil || req == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Request not found")
		return
	}

	if req.Status != "CHO_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Request is not pending")
		return
	}

	if role == "Trưởng phòng" {
		user, err := h.userRepo.GetByID(req.UserID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Error verifying user")
			return
		}
		deptID, _ := middleware.GetDepartmentID(c)
		if user.DepartmentID == nil || *user.DepartmentID != deptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Cannot reject requests outside department")
			return
		}
	}

	if err := h.overtimeRepo.UpdateStatus(id, "TU_CHOI", approverID, nil); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reject")
		return
	}

	updated, _ := h.overtimeRepo.GetByID(id)
	ws.Emit(h.hub, "OVERTIME_REJECTED", updated)

	utils.SuccessResponse(c, http.StatusOK, updated)
}

func (h *OvertimeHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID")
		return
	}

	req, err := h.overtimeRepo.GetByID(id)
	if err != nil || req == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Request not found")
		return
	}

	if req.Status == "DA_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Cannot delete approved request")
		return
	}

	if err := h.overtimeRepo.Delete(id); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil)
}
