package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"
	"attendance-system/internal/websocket"

	"github.com/gin-gonic/gin"
)

type LeaveHandler struct {
	leaveRepo *repository.LeaveRequestRepository
	userRepo  *repository.UserRepository
	hub			 *ws.Hub
}

func NewLeaveHandler(leaveRepo *repository.LeaveRequestRepository, userRepo *repository.UserRepository, hub *ws.Hub) *LeaveHandler {
	return &LeaveHandler{
		leaveRepo: leaveRepo,
		userRepo:  userRepo,
		hub:       hub,
	}
}

type CreateLeaveRequest struct {
	Type                string  `json:"type" binding:"required"`
	FromDate            string  `json:"from_date" binding:"required"`
	ToDate              string  `json:"to_date" binding:"required"`
	Session             *string `json:"session,omitempty"`
	ExpectedArrivalTime *string `json:"expected_arrival_time,omitempty"`
	Reason              *string `json:"reason,omitempty"`
}
func MapLeaveRequestResponse(
	l *models.LeaveRequest,
	userName string,
	approvedByName *string,
) *models.LeaveRequestResponse {

	var session, expected, reason *string
	var approvedByID *int
	var  approvedAt *time.Time
	if l.Session.Valid {
		session = &l.Session.String
	}

	if l.ExpectedArrivalTime.Valid {
		expected = &l.ExpectedArrivalTime.String
	}

	if l.Reason.Valid {
		reason = &l.Reason.String
	}

	if l.ApprovedByID.Valid {
		id := int(l.ApprovedByID.Int64) 
		approvedByID = &id
	}

if l.ApprovedAt.Valid {
	approvedAt = &l.ApprovedAt.Time
}


	return &models.LeaveRequestResponse{
		ID:                  l.ID,
		UserID:              l.UserID,
		UserName:            userName,
		Type:                l.Type,
		FromDate:            l.FromDate.Format(time.RFC3339),
		ToDate:              l.ToDate.Format(time.RFC3339),
		Session:             session,
		ExpectedArrivalTime: expected,
		Reason:              reason,
		Status:              l.Status,
		ApprovedByID:        approvedByID,
		ApprovedByName:      approvedByName,
		ApprovedAt:          approvedAt,
		CreatedAt:           l.CreatedAt,
	}
}

func (h *LeaveHandler) Create(c *gin.Context) {
	var req CreateLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// ===== 1. Normalize & validate TYPE =====
	req.Type = strings.TrimSpace(strings.ToUpper(req.Type))

	validTypes := map[string]bool{
		"NGHI_PHEP": true,
		"DI_MUON":   true,
		
	}

	if !validTypes[req.Type] {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave type")
		return
	}

	// ===== 2. Parse date (RFC3339 từ FE) =====
	fromDate, err := time.Parse(time.RFC3339, req.FromDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid from_date format")
		return
	}

	toDate, err := time.Parse(time.RFC3339, req.ToDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid to_date format")
		return
	}

	if toDate.Before(fromDate) {
		utils.ErrorResponse(c, http.StatusBadRequest, "to_date must be after or equal to from_date")
		return
	}

	// ===== 3. Get user =====
	userID, _ := middleware.GetUserID(c)
	if userID == 0 {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// ===== 4. Build entity =====
	leaveRequest := &models.LeaveRequest{
		UserID:   userID,
		Type:     req.Type,
		FromDate: fromDate,
		ToDate:   toDate,
		Status:   "CHO_DUYET", 
	}

	if req.Session != nil {
		leaveRequest.Session = sql.NullString{
			String: strings.ToUpper(*req.Session),
			Valid:  true,
		}
	}

	if req.ExpectedArrivalTime != nil {
		leaveRequest.ExpectedArrivalTime = sql.NullString{
			String: *req.ExpectedArrivalTime,
			Valid:  true,
		}
	}

	if req.Reason != nil {
		leaveRequest.Reason = sql.NullString{
			String: *req.Reason,
			Valid:  true,
		}
	}

	// ===== 5. Save =====
	if err := h.leaveRepo.Create(leaveRequest); err != nil {
		log.Println("Create leave error:", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create leave request")
		return
	}
	userName := c.GetString("user_name")

resp := MapLeaveRequestResponse(
	leaveRequest,
	userName,
	nil, // chưa có người duyệt
)

// ===== 7. Emit WebSocket =====
ws.Emit(
	h.hub,
	ws.EventCreateLeaveRequest,
	resp,
)

	utils.SuccessResponse(c, http.StatusCreated, resp)
}


func (h *LeaveHandler) GetAll(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)
	
	var deptID *int
	if role == "Trưởng phòng" {
		id, exists := middleware.GetDepartmentID(c)
		if exists {
			deptID = &id
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	requests, total, err := h.leaveRepo.GetAll(userID, role, deptID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get leave requests: " + err.Error(),
		})
		return
	}

	utils.SuccessResponse(c, http.StatusOK,  gin.H{
		"requests": requests,
		"pagination": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

//
func (h *LeaveHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave request ID")
		return
	}

	request, err := h.leaveRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get leave request")
		return
	}

	if request == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Leave request not found")
		return
	}

	// Check access permission
	userID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	if role == "Nhân viên" && request.UserID != userID {
		utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to view this request")
		return
	}

	if role == "Trưởng phòng" {
		// Check if the request user is in the same department
		requestUser, err := h.userRepo.GetByID(request.UserID)
		if err != nil || requestUser == nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify access")
			return
		}

		currentUserDeptID, _ := middleware.GetDepartmentID(c)
		if requestUser.DepartmentID == nil || *requestUser.DepartmentID != currentUserDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "You don't have permission to view this request")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, request)
}

func (h *LeaveHandler) Approve(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave request ID")
		return
	}

	approverID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	// Check if request exists
	request, err := h.leaveRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get leave request")
		return
	}

	if request == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Leave request not found")
		return
	}

	if request.Status != "CHO_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave request is already "+request.Status)
		return
	}

	// Verify approval permission
	if role == "Trưởng phòng" {
		requestUser, err := h.userRepo.GetByID(request.UserID)
		if err != nil || requestUser == nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify access")
			return
		}

		approverDeptID, _ := middleware.GetDepartmentID(c)
		if requestUser.DepartmentID == nil || *requestUser.DepartmentID != approverDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "You can only approve requests from your department")
			return
		}
	}

	err = h.leaveRepo.UpdateStatus(id, "DA_DUYET", approverID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to approve leave request")
		return
	}
	updatedRequest, err := h.leaveRepo.GetByID(id) // LeaveRequestResponse
if err != nil || updatedRequest == nil {
	utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to load updated leave request")
	return
}

approverName := c.GetString("user_name")
updatedRequest.ApprovedByName = &approverName

ws.Emit(
	h.hub,
	ws.EventApproveLeaveRequest,
	updatedRequest,
)

	utils.SuccessResponse(c, http.StatusOK, updatedRequest)
}

func (h *LeaveHandler) Reject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave request ID")
		return
	}

	approverID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	// Check if request exists
	request, err := h.leaveRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get leave request")
		return
	}

	if request == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Leave request not found")
		return
	}

	if request.Status != "CHO_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Leave request is already "+request.Status)
		return
	}

	// Verify rejection permission
	if role == "Trưởng phòng" {
		requestUser, err := h.userRepo.GetByID(request.UserID)
		if err != nil || requestUser == nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to verify access")
			return
		}

		approverDeptID, _ := middleware.GetDepartmentID(c)
		if requestUser.DepartmentID == nil || *requestUser.DepartmentID != approverDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "You can only reject requests from your department")
			return
		}
	}

	err = h.leaveRepo.UpdateStatus(id, "TU_CHOI", approverID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reject leave request")
		return
	}
	updatedRequest, err := h.leaveRepo.GetByID(id) // LeaveRequestResponse
if err != nil || updatedRequest == nil {
	utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to load updated leave request")
	return
}

// approverName := c.GetString("user_name")
// updatedRequest.ApprovedByName = &approverName

ws.Emit(
	h.hub,
	ws.EventRejectLeaveRequest,
	updatedRequest,
)


	utils.SuccessResponse(c, http.StatusOK, updatedRequest)
}
//hàm hủy yêu cầu nghỉ phép
func (h *LeaveHandler) Cancel(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave request ID")
			return
		}	
		userID, _ := middleware.GetUserID(c)

		// Check if request exists
		request, err := h.leaveRepo.GetByID(id)
		// if err != nil {
		// 	utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get leave request"+ err.Error())
		// 	return
		// }	
		if request == nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Leave request not found")
			return
		}	
		if request.UserID != userID {
			utils.ErrorResponse(c, http.StatusForbidden, "You can only cancel your own leave requests")
			return
		}	
		if request.Status != "CHO_DUYET" {
			utils.ErrorResponse(c, http.StatusBadRequest, "Only pending requests can be cancelled")
			return
		}	
		err = h.leaveRepo.CancelRequest(id)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to cancel leave request")
			return
		}
		updatedRequest, err := h.leaveRepo.GetByID(id) // LeaveRequestResponse
if err != nil || updatedRequest == nil {
	utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to load updated leave request")
	return
}

// approverName := c.GetString("user_name")
// updatedRequest.ApprovedByName = &approverName

ws.Emit(
	h.hub,
	"LEAVE_CANCELED",
	updatedRequest,
)

	utils.SuccessResponse(c, http.StatusOK, updatedRequest)
	}
//xóa yêu cầu nghỉ phép
func (h *LeaveHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))	
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid leave request ID")
		return
	}
	// userID, _ := middleware.GetUserID(c)

	// Check if request exists
	request, err := h.leaveRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get leave request")
		return
	}
	if request == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Leave request not found")
		return
	}
	// if request.UserID != userID {
	// 	utils.ErrorResponse(c, http.StatusForbidden, "You can only delete your own leave requests")
	// 	return
	// }	
	if request.Status != "DA_HUY" && request.Status != "TU_CHOI" && request.Status !="DA_DUYET" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Only cancelled or rejected requests can be deleted")
		return
	}	
	err = h.leaveRepo.Delete(id)	
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete leave request")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, nil)
}