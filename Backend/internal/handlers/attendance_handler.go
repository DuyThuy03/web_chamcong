package handlers

import (
	"net/http"
	"strconv"
	"time"

	"attendance-system/internal/middleware"
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
    Latitude  float64 `form:"latitude" binding:"required"`
    Longitude float64 `form:"longitude" binding:"required"`
    Address   string  `form:"address"`
    Device    string  `form:"device" binding:"required"`
    ShiftID   int     `form:"shift_id" binding:"required"`
}
type CheckOutRequest struct {
    Latitude  float64 `form:"latitude" binding:"required"`
    Longitude float64 `form:"longitude" binding:"required"`
    Address   string  `form:"address"`
    Device    string  `form:"device" binding:"required"`
    ShiftID   int     `form:"shift_id" binding:"required"`
}

func (h *AttendanceHandler) CheckIn(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    userName := c.GetString("user_name") // Set this in auth middleware if needed

    var req CheckInRequest
    if err := c.ShouldBind(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
        return
    }

    // Get uploaded image
    file, header, err := c.Request.FormFile("image")
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image is required")
        return
    }
    defer file.Close()

    // Validate file size (10MB max)
    if header.Size > 10*1024*1024 {
        utils.ErrorResponse(c, http.StatusBadRequest, "Image size too large (max 10MB)")
        return
    }

    // Validate file type
    contentType := header.Header.Get("Content-Type")
    if contentType != "image/jpeg" && contentType != "image/png" {
        utils.ErrorResponse(c, http.StatusBadRequest, "Only JPEG and PNG images are allowed")
        return
    }

    // Process check-in
    result, err := h.attendanceService.CheckIn(
        userID,
        userName,
        file,
        header.Filename,
        req.Latitude,
        req.Longitude,
        req.Address,
        req.Device,
        req.ShiftID,
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

    // Process check-out (similar to check-in but updates existing record)
    result, err := h.attendanceService.CheckOut(
        userID,
        userName,
        file,
        header.Filename,
        req.Latitude,
        req.Longitude,
        req.Address,
        req.Device,
        req.ShiftID,
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

        // Parse query parameters
        userIDStr := c.Query("user_id")
        departmentIDStr := c.Query("department_id")
        fromDateStr := c.Query("from_date")
        toDateStr := c.Query("to_date")
        pageStr := c.DefaultQuery("page", "1")
        limitStr := c.DefaultQuery("limit", "20")

        var targetUserID *int
        var departmentID *int

        // Permission checks
        if role == "Nhân viên" {
            // Employees can only see their own records
            targetUserID = &currentUserID
        } else if role == "Trưởng phòng" {
            // Department leaders can see their department
            if userIDStr != "" {
                uid, err := strconv.Atoi(userIDStr)
                    if err != nil {
                        utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user_id")
                        return
                    }
                if !middleware.CheckUserAccess(c, uid) {
                    utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
                    return
                }
                targetUserID = &uid
            }
            if departmentIDStr != "" {
                did, err := strconv.Atoi(departmentIDStr)
                if err != nil {
                    utils.ErrorResponse(c, http.StatusBadRequest, "Invalid department_id")
                    return
                }
                currentDeptID, _ := middleware.GetDepartmentID(c)
                if currentDeptID != did {
                    utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
                    return
                }
                departmentID = &did
            }
        } else {
            // Managers and directors can see all
            if userIDStr != "" {
                uid, err := strconv.Atoi(userIDStr)
                if err != nil {
                    utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user_id")
                    return
                }
                 targetUserID = &uid
            }
            if departmentIDStr != "" {
                did, _ := strconv.Atoi(departmentIDStr)
                departmentID = &did
            }
        }

        // Parse dates
        var fromDate, toDate time.Time
        var err error

        if fromDateStr != "" {
            fromDate, err = time.Parse("2006-01-02", fromDateStr)
            if err != nil {
                utils.ErrorResponse(c, http.StatusBadRequest, "Invalid from_date format")
                return
            }
        } else {
            // Default to 30 days ago
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

        // Get attendance history
        records, total, err := h.attendanceService.GetHistory(
            targetUserID,
            departmentID,
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

        pagination := utils.Pagination{
            Total:      total,
            Page:       page,
            Limit:      limit,
            TotalPages: totalPages,
        }

        utils.PaginatedSuccessResponse(c, http.StatusOK, records, pagination)
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