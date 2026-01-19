package handlers

import (
	"attendance-system/internal/middleware"
	"attendance-system/internal/services"

	"attendance-system/internal/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	dashboardService services.DashboardService
}

func NewDashboardHandler(dashboardService services.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
	}
}
func (h *DashboardHandler) GetDepartmentDashboard(c *gin.Context) {
	role, _ := middleware.GetUserRole(c)
	
	var departmentID int
	
	// Giám đốc và Quản lý có thể xem dashboard của bất kỳ phòng nào
	if role == "Giám đốc" || role == "Quản lý" {
		deptIDParam := c.Query("department_id")
		if deptIDParam == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "department_id is required for Giám đốc/Quản lý")
			return
		}
		var err error
		departmentID, err = strconv.Atoi(deptIDParam)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "invalid department_id")
			return
		}
	} else if role == "Trưởng phòng" {
		// Trưởng phòng chỉ xem dashboard phòng của mình
		deptID, exists := middleware.GetDepartmentID(c)
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "phòng ban không tồn tại")
			return
		}
		departmentID = deptID
	} else {
		utils.ErrorResponse(c, http.StatusForbidden, "không đủ quyền truy cập")
		return
	}
	
	// Lấy dữ liệu dashboard từ service
	dashboardData, err := h.dashboardService.GetDepartmentDashboard(departmentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Trả về dữ liệu dashboard
	utils.SuccessResponse(c, http.StatusOK, dashboardData)
}