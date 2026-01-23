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
)

type ManagerHandler struct {
	userRepo       *repository.UserRepository
	attendanceRepo *repository.AttendanceRepository
	userService    *services.UserService
}

func NewManagerHandler(userRepo *repository.UserRepository, attendanceRepo *repository.AttendanceRepository, userService *services.UserService) *ManagerHandler {
	return &ManagerHandler{
		userRepo:       userRepo,
		attendanceRepo: attendanceRepo,
		userService:    userService,
	}
}

// GetTodayAttendanceStatus - Xem trạng thái điểm danh hôm nay của tất cả thành viên
// Trưởng phòng: xem thành viên trong phòng
// Quản lý và Giám đốc: xem tất cả
		func (h *ManagerHandler) GetTodayAttendanceStatus(c *gin.Context) {
			role, _ := middleware.GetUserRole(c)
			deptID, _ := middleware.GetDepartmentID(c)

			today := time.Now().Format("2006-01-02")
			
			var attendances []*models.CheckIOResponse
			var err error

			if role == "Trưởng phòng" {
				// Trưởng phòng chỉ xem được thành viên trong phòng
				attendances, err = h.attendanceRepo.GetTodayAttendanceByDepartment(deptID, today)
			} else if role == "Quản lý" || role == "Giám đốc" {
				// Quản lý và Giám đốc xem tất cả
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

// GetMemberAttendanceHistory - Xem lịch sử chấm công của một thành viên
// func (h *ManagerHandler) GetMemberAttendanceHistory(c *gin.Context) {
// 	role, _ := middleware.GetUserRole(c)
// 	currentDeptID, _ := middleware.GetDepartmentID(c)

// 	// Lấy user_id từ query parameter
// 	userIDStr := c.Query("user_id")
// 	if userIDStr == "" {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "Thiếu tham số user_id")
// 		return
// 	}

// 	userID, err := strconv.Atoi(userIDStr)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "user_id không hợp lệ")
// 		return
// 	}

// 	// Kiểm tra quyền truy cập
// 	if role == "Trưởng phòng" {
// 		// Kiểm tra user có cùng phòng ban không
// 		user, err := h.userRepo.GetUserByID(userID)
// 		if err != nil || user == nil {
// 			utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
// 			return
// 		}

// 		if !user.DepartmentID.Valid || int(user.DepartmentID.Int64) != currentDeptID {
// 			utils.ErrorResponse(c, http.StatusForbidden, "Bạn chỉ có thể xem lịch sử của thành viên trong phòng")
// 			return
// 		}
// 	}

// 	// Lấy tham số phân trang và ngày
// 	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
// 	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
// 	fromDateStr := c.DefaultQuery("from_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
// 	toDateStr := c.DefaultQuery("to_date", time.Now().Format("2006-01-02"))

// 	if page < 1 {
// 		page = 1
// 	}
// 	if limit < 1 || limit > 100 {
// 		limit = 20
// 	}

// 	offset := (page - 1) * limit

// 	fromDate, err := time.Parse("2006-01-02", fromDateStr)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "from_date không hợp lệ")
// 		return
// 	}

// 	toDate, err := time.Parse("2006-01-02", toDateStr)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "to_date không hợp lệ")
// 		return
// 	}

// 	// Lấy lịch sử
// 	history, total, err := h.attendanceRepo.GetHistory(&userID, nil, fromDate, toDate, limit, offset)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy lịch sử chấm công: "+err.Error())
// 		return
// 	}

// 	totalPages := (total + limit - 1) / limit
// 	pagination := utils.Pagination{
// 		Total:      total,
// 		Page:       page,
// 		Limit:      limit,
// 		TotalPages: totalPages,
// 	}

// 	utils.PaginatedSuccessResponse(c, http.StatusOK, history, pagination)
// }

// GetDepartmentAttendanceHistory - Xem lịch sử chấm công của toàn bộ phòng ban
// func (h *ManagerHandler) GetDepartmentAttendanceHistory(c *gin.Context) {
// 	role, _ := middleware.GetUserRole(c)
// 	currentDeptID, _ := middleware.GetDepartmentID(c)

// 	// Lấy department_id từ query (nếu là Quản lý hoặc Giám đốc)
// 	var deptID *int
// 	deptIDStr := c.Query("department_id")
	
// 	if role == "Trưởng phòng" {
// 		// Trưởng phòng chỉ xem được phòng ban của mình
// 		deptID = &currentDeptID
// 	} else if role == "Quản lý" || role == "Giám đốc" {
// 		// Quản lý và Giám đốc có thể chọn phòng ban hoặc xem tất cả
// 		if deptIDStr != "" {
// 			id, err := strconv.Atoi(deptIDStr)
// 			if err != nil {
// 				utils.ErrorResponse(c, http.StatusBadRequest, "department_id không hợp lệ")
// 				return
// 			}
// 			deptID = &id
// 		}
// 		// Nếu không có department_id, deptID = nil => xem tất cả
// 	} else {
// 		utils.ErrorResponse(c, http.StatusForbidden, "Bạn không có quyền truy cập")
// 		return
// 	}

// 	// Lấy tham số phân trang và ngày
// 	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
// 	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
// 	fromDateStr := c.DefaultQuery("from_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
// 	toDateStr := c.DefaultQuery("to_date", time.Now().Format("2006-01-02"))

// 	if page < 1 {
// 		page = 1
// 	}
// 	if limit < 1 || limit > 100 {
// 		limit = 20
// 	}

// 	offset := (page - 1) * limit

// 	fromDate, err := time.Parse("2006-01-02", fromDateStr)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "from_date không hợp lệ")
// 		return
// 	}

// 	toDate, err := time.Parse("2006-01-02", toDateStr)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusBadRequest, "to_date không hợp lệ")
// 		return
// 	}

// 	// Lấy lịch sử
// 	history, total, err := h.attendanceRepo.GetHistory(nil, deptID, fromDate, toDate, limit, offset)
// 	if err != nil {
// 		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy lịch sử chấm công: "+err.Error())
// 		return
// 	}

// 	totalPages := (total + limit - 1) / limit
// 	pagination := utils.Pagination{
// 		Total:      total,
// 		Page:       page,
// 		Limit:      limit,
// 		TotalPages: totalPages,
// 	}

// 	utils.PaginatedSuccessResponse(c, http.StatusOK, history, pagination)
// }

// GetDepartmentMembers - Lấy danh sách thành viên trong phòng ban
func (h *ManagerHandler) GetDepartmentMembers(c *gin.Context) {
	role, _ := middleware.GetUserRole(c)
	currentDeptID, _ := middleware.GetDepartmentID(c)

	// Lấy department_id từ query
	var deptID int
	deptIDStr := c.Query("department_id")
	
	if role == "Trưởng phòng" {
		// Trưởng phòng chỉ xem được phòng ban của mình
		deptID = currentDeptID
	} else if role == "Quản lý" || role == "Giám đốc" {
		// Quản lý và Giám đốc có thể chọn phòng ban
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

	// Lấy tham số phân trang
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Lấy danh sách thành viên
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

// CreateMember - Tạo thành viên mới (chỉ Quản lý và Giám đốc)
func (h *ManagerHandler) CreateMember(c *gin.Context) {
	// 1️⃣ Lấy info người đang đăng nhập từ context
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Chưa đăng nhập")
		return
	}

	role, _ := middleware.GetUserRole(c)
	deptID, _ := middleware.GetDepartmentID(c)

	// 2️⃣ Bind request
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
		return
	}

	// 3️⃣ Gọi service (truyền thông tin auth)
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

	// 4️⃣ Lấy user đầy đủ để trả về
	userResponse, err := h.userRepo.GetByID(user.ID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, userResponse)
}



// UpdateMember - Cập nhật thành viên trong phòng ban
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

	// Kiểm tra user tồn tại
	existingUser, err := h.userRepo.GetUserByID(id)
	if err != nil || existingUser == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
		return
	}

	// Kiểm tra quyền
	if role == "Trưởng phòng" {
		// Trưởng phòng chỉ update được thành viên trong phòng
		if !existingUser.DepartmentID.Valid || int(existingUser.DepartmentID.Int64) != currentDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Bạn chỉ có thể cập nhật thành viên trong phòng")
			return
		}
	}

	// Cập nhật
	err = h.userService.UpdateUser(id, &req, role)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi cập nhật thành viên: "+err.Error())
		return
	}

	// Lấy thông tin đã cập nhật
	updatedUser, err := h.userRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi lấy thông tin thành viên: "+err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, updatedUser)
}

// DeleteMember - Xóa thành viên (chỉ Quản lý và Giám đốc)
func (h *ManagerHandler) DeleteMember(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "ID không hợp lệ")
		return
	}

	// Kiểm tra user tồn tại
	existingUser, err := h.userRepo.GetUserByID(id)
	if err != nil || existingUser == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Không tìm thấy thành viên")
		return
	}

	// Xóa (soft delete - set status = 'inactive')
	err = h.userService.DeleteUser(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Lỗi khi xóa thành viên: "+err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Xóa thành viên thành công"})
}

// GetMemberDetail - Xem chi tiết thành viên
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

	// Kiểm tra quyền
	if role == "Trưởng phòng" {
		// Trưởng phòng chỉ xem được thành viên trong phòng
		if user.DepartmentID == nil || *user.DepartmentID != currentDeptID {
			utils.ErrorResponse(c, http.StatusForbidden, "Bạn chỉ có thể xem thành viên trong phòng")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, user)
}
