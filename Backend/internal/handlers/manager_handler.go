package handlers

import (
	"net/http"
	"strconv"
	"time"

	"attendance-system/internal/middleware"
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/services"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
	
	ws "attendance-system/internal/websocket"
)

type ManagerHandler struct {
	userRepo       *repository.UserRepository
	attendanceRepo *repository.AttendanceRepository
	userService    *services.UserService
	hub            *ws.Hub
}

func NewManagerHandler(userRepo *repository.UserRepository, attendanceRepo *repository.AttendanceRepository, userService *services.UserService, hub *ws.Hub) *ManagerHandler {
	return &ManagerHandler{
		userRepo:       userRepo,
		attendanceRepo: attendanceRepo,
		userService:    userService,
		hub:            hub,
	}
}

		func (h *ManagerHandler) GetTodayAttendanceStatus(c *gin.Context) {
			role, _ := middleware.GetUserRole(c)
			deptID, _ := middleware.GetDepartmentID(c)

			today := time.Now().Format("2006-01-02")
			
			var attendances []*models.CheckIOResponse
			var err error

			if role == "Trưởng phòng" {
				
				attendances, err = h.attendanceRepo.GetTodayAttendanceByDepartment(deptID, today)
			} else if role == "Quản lý" || role == "Giám đốc" {
				
				attendances, err = h.attendanceRepo.GetTodayAttendanceAll(today)
			} else {
				utils.ErrorResponse(c, http.StatusForbidden, "Bạn không có quyền truy cập")
				return
			}

			if err != nil {
				utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy dữ liệu điểm danh: "+err.Error())
				return
			}

			utils.SuccessResponse(c, http.StatusOK, attendances)
		}

func (h *ManagerHandler) GetDepartmentMembers(c *gin.Context) {
	role, _ := middleware.GetUserRole(c)
	currentDeptID, _ := middleware.GetDepartmentID(c)

	var deptID int
	deptIDStr := c.Query("department_id")
	
	if role == "Trưởng phòng" {
		
		deptID = currentDeptID
	} else if role == "Quản lý" || role == "Giám đốc" {
		
		if deptIDStr == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "Thiếu tham số department_id")
			return
		}
		id, err := strconv.Atoi(deptIDStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "department_id không hợp lệ")
			return
		}
		deptID = id
	} else {
		utils.ErrorResponse(c, http.StatusForbidden, "Bạn không có quyền truy cập")
		return
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

	users, total, err := h.userRepo.GetByDepartment(deptID, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy danh sách thành viên: "+err.Error())
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

func (h *ManagerHandler) CreateMember(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Chưa đăng nhập")
		return
	}

	role, _ := middleware.GetUserRole(c)
	deptID, _ := middleware.GetDepartmentID(c)

	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
		return
	}

	auth := &models.AuthContext{
		UserID:       userID,
		Role:         role,
		DepartmentID: deptID,
	}

	user, err := h.userService.CreateUser(auth, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userResponse, err := h.userRepo.GetByID(user.ID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, userResponse)

	ws.Emit(h.hub, ws.EventUserCreated, userResponse)
}

func (h *ManagerHandler) UpdateMember(c *gin.Context) {
	role, _ := middleware.GetUserRole(c)
	currentDeptID, _ := middleware.GetDepartmentID(c)

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID không hợp lệ")
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
		return
	}

	existingUser, err := h.userRepo.GetUserByID(id)
	if err != nil || existingUser == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
		return
	}

	if role == "Trưởng phòng" {
		
		if !existingUser.DepartmentID.Valid || int(existingUser.DepartmentID.Int64) != currentDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Bạn chỉ có thể cập nhật thành viên trong phòng")
			return
		}
	}

	err = h.userService.UpdateUser(id, &req, role)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi cập nhật thành viên: "+err.Error())
		return
	}

	updatedUser, err := h.userRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy thông tin thành viên: "+err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, updatedUser)

	ws.Emit(h.hub, ws.EventUserUpdated, updatedUser)
}

func (h *ManagerHandler) DeleteMember(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID không hợp lệ")
		return
	}

	existingUser, err := h.userRepo.GetUserByID(id)
	if err != nil || existingUser == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
		return
	}

	err = h.userService.DeleteUser(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi xóa thành viên: "+err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Xóa thành viên thành công"})

	ws.Emit(h.hub, ws.EventUserDeleted, map[string]int{"id": id})
}

func (h *ManagerHandler) GetMemberDetail(c *gin.Context) {
	role, _ := middleware.GetUserRole(c)
	currentDeptID, _ := middleware.GetDepartmentID(c)

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID không hợp lệ")
		return
	}

	user, err := h.userRepo.GetByID(id)
	if err != nil || user == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
		return
	}

	if role == "Trưởng phòng" {
		
		if user.DepartmentID == nil || *user.DepartmentID != currentDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Bạn chỉ có thể xem thành viên trong phòng")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, user)
}
