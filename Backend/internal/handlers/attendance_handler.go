package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/services"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

type AttendanceHandler struct {
    attendanceService *services.AttendanceService
}

func NewAttendanceHandler(attendanceService *services.AttendanceService) *AttendanceHandler {
    return &AttendanceHandler{
        attendanceService: attendanceService,
    }
}

type CheckInRequest struct {
    Latitude    float64 `form:"latitude" binding:"required"`
    Longitude   float64 `form:"longitude" binding:"required"`
    Address     string  `form:"address"`
    Device      string  `form:"device" binding:"required"`
    ShiftID     int     `form:"shift_id" binding:"required"`
    Accuracy    float64 `form:"accuracy"`
    FactoryName string  `form:"factory_name"`
    Note        string  `form:"note"`
    CheckinType string  `form:"checkin_type"`
    AccompanyingUserIDs []int `form:"accompanying_user_ids"`
}
type CheckOutRequest struct {
    Latitude    float64 `form:"latitude" binding:"required"`
    Longitude   float64 `form:"longitude" binding:"required"`
    Address     string  `form:"address"`
    Device      string  `form:"device" binding:"required"`
    ShiftID     int     `form:"shift_id" binding:"required"`
    Accuracy    float64 `form:"accuracy"`
    FactoryName string  `form:"factory_name"`
    Note        string  `form:"note"`
    CheckinType string  `form:"checkin_type"`
    AccompanyingUserIDs []int `form:"accompanying_user_ids"`
}

func (h *AttendanceHandler) CheckIn(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    userName := c.GetString("user_name") 

    var req CheckInRequest
    if err := c.ShouldBind(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }

    file, header, err := c.Request.FormFile("image")
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image is required")
        return
    }
    defer file.Close()

    if header.Size > 10*1024*1024 {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image size too large (max 10MB)")
        return
    }

    contentType := header.Header.Get("Content-Type")
    if contentType != "image/jpeg" && contentType != "image/png" {
        utils.ErrorResponse(c, http.StatusBadRequest, "Only JPEG and PNG images are allowed")
        return
    }

    result, err := h.attendanceService.CheckIn(
        userID,
        userName,
        file,
        header.Filename,
        req.Latitude,
        req.Longitude,
        req.Accuracy,
        req.Address,
        req.Device,
        req.ShiftID,
        req.CheckinType,
        req.FactoryName,
        req.Note,
        req.AccompanyingUserIDs,
    )

    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
        return
    }

    utils.SuccessMessageResponse(c, http.StatusOK, "Check-in successful", result)
}

func (h *AttendanceHandler) CheckOut(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    userName := c.GetString("user_name")

    var req CheckOutRequest
    if err := c.ShouldBind(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }

    file, header, err := c.Request.FormFile("image")
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image is required")
        return
    }
    defer file.Close()

    if header.Size > 10*1024*1024 {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image size too large")
        return
    }

    result, err := h.attendanceService.CheckOut(
        userID,
        userName,
        file,
        header.Filename,
        req.Latitude,
        req.Longitude,
        req.Accuracy,
        req.Address,
        req.Device,
        req.ShiftID,
        req.CheckinType,
        req.FactoryName,
        req.Note,
        req.AccompanyingUserIDs,
    )

    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
        return
    }

    utils.SuccessMessageResponse(c, http.StatusOK, "Check-out successful", result)
}

func (h *AttendanceHandler) GetHistory(c *gin.Context) {
	currentUserID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)

	userIDStr := c.Query("user_id")
	userName := strings.TrimSpace(c.Query("user_name")) 
	fromDateStr := c.Query("from_date")
	toDateStr := c.Query("to_date")
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	var targetUserID *int
	var departmentID *int

	switch role {

	case "Nhân viên":
		targetUserID = &currentUserID

	case "Trưởng phòng":
		currentDeptID, _ := middleware.GetDepartmentID(c)
		departmentID = &currentDeptID

		if userIDStr != "" {
			uid, err := strconv.Atoi(userIDStr)
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user_id")
				return
			}

			ok, err := h.attendanceService.CanDepartmentHeadAccessUser(
				uid,
				currentDeptID,
			)
			if err != nil {
				utils.ErrorResponse(c, http.StatusInternalServerError, "Permission check failed")
				return
			}

			if !ok {
				utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
				return
			}

			targetUserID = &uid
		}

	default:

		if userIDStr != "" {
			uid, err := strconv.Atoi(userIDStr)
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user_id")
				return
			}
			targetUserID = &uid
		}
	}

	var fromDate, toDate time.Time
	var err error

	if fromDateStr != "" {
		fromDate, err = time.Parse("2006-01-02", fromDateStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid from_date format")
			return
		}
	} else {
		t := time.Now().AddDate(0, 0, -30)
		fromDate = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local)
	}

	if toDateStr != "" {
		toDate, err = time.Parse("2006-01-02", toDateStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid to_date format")
			return
		}
	} else {
		t := time.Now()
		toDate = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.Local)
	}

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	records, total, err := h.attendanceService.GetHistory(
		targetUserID,
		departmentID,
		userName, 
		fromDate,
		toDate,
		limit,
		offset,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get attendance history")
		return
	}

	totalPages := (total + limit - 1) / limit

	utils.PaginatedSuccessResponse(c, http.StatusOK, records, utils.Pagination{
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

func (h *AttendanceHandler) GetToday(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    today := time.Now()
    dayStart := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
    
    record, err := h.attendanceService.GetByUserAndDay(userID, dayStart)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get today's attendance")
        return
    }

    if record == nil {
        utils.SuccessResponse(c, http.StatusOK, nil)
        return
    }

    utils.SuccessResponse(c, http.StatusOK, record)
}

func (h *AttendanceHandler) GetMonthlyAttendanceSummary(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	role, _ := middleware.GetUserRole(c)
	departmentIDValue, _ := middleware.GetDepartmentID(c)
	departmentID := &departmentIDValue

	monthStr := c.Query("month") 
	if monthStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Month parameter is required")
		return
	}

	monthTime, err := time.Parse("2006-01", monthStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid month format. Use YYYY-MM")
		return
	}

	summary, err := h.attendanceService.GetMonthlySummary(
		c.Request.Context(),
		userID,
		role,
		departmentID,
		monthTime,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, summary)
}

func (h *AttendanceHandler) UpdateAttendance(c *gin.Context) {
	
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid attendance ID")
		return
	}

	var req models.UpdateAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	role, _ := middleware.GetUserRole(c)
	currentUserID, _ := middleware.GetUserID(c)
	deptIDValue, _ := middleware.GetDepartmentID(c)
	var deptID *int
	if deptIDValue != 0 {
		deptID = &deptIDValue
	}

	updatedRecord, err := h.attendanceService.UpdateAttendance(role, deptID, currentUserID, id, req)
	if err != nil {

		if strings.Contains(err.Error(), "quyền") || strings.Contains(err.Error(), "permission") {
			utils.ErrorResponse(c, http.StatusForbidden, err.Error())
		} else if strings.Contains(err.Error(), "not found") {
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	utils.SuccessMessageResponse(c, http.StatusOK, "Cập nhật thành công", updatedRecord)
}

func (h *AttendanceHandler) GetHistoryDetails(c *gin.Context) {
	
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid attendance ID")
		return
	}


	// Currently just returning history for the record. 
    // Usually should check if user can view this attendance (Manager/DeptHead/Owner).
    // For now assuming valid token is enough or adding check based on role.
    
    // We can rely on service layer or just fetch. CheckIO view permissions are usually broad for Manager/DeptHead.
    
	history, err := h.attendanceService.GetAttendanceHistoryDetails(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get history details")
		return
	}
	
	utils.SuccessResponse(c, http.StatusOK, history)
}
