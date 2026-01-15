package handlers

import (
	"net/http"
	"strconv"

	"attendance-system/internal/repository"
	"attendance-system/internal/utils"

	"github.com/gin-gonic/gin"
)

type ShiftHandler struct {
	shiftRepo *repository.ShiftRepository
}

func NewShiftHandler(shiftRepo *repository.ShiftRepository) *ShiftHandler {
	return &ShiftHandler{shiftRepo: shiftRepo}
}

func (h *ShiftHandler) GetAll(c *gin.Context) {
	shifts, err := h.shiftRepo.GetAll()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get shifts")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, shifts)
}

func (h *ShiftHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid shift ID")
		return
	}

	shift, err := h.shiftRepo.GetByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get shift")
		return
	}

	if shift == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Shift not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, shift)
}
