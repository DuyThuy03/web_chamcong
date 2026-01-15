package handlers

import (
	"net/http"
	"strconv"

	"attendance-system/internal/repository"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

type DepartmentHandler struct {
	deptRepo *repository.DepartmentRepository
}

func NewDepartmentHandler(deptRepo *repository.DepartmentRepository) *DepartmentHandler {
	return &DepartmentHandler{deptRepo: deptRepo}
}

func (h *DepartmentHandler) GetAll(c *gin.Context) {
	departments, err := h.deptRepo.GetAll()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get departments")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, departments)
}

func (h *DepartmentHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid department ID")
		return
	}

	department, err := h.deptRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get department")
		return
	}

	if department == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Department not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, department)
}

func (h *DepartmentHandler) GetUsers(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid department ID")
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

	users, total, err := h.deptRepo.GetUsersByDepartmentID(id, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get department users")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"users": users,
		"pagination": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}
