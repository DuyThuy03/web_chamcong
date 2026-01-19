package services

import (
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"time"
)

type DashboardService interface {
	GetDepartmentDashboard(departmentID int) (*models.DepartmentDashboardResponse, error)
}

type dashboardService struct {
	dashboardRepo  repository.DashboardRepository
	attendanceRepo *repository.AttendanceRepository
}

func NewDashboardService(
	dashboardRepo repository.DashboardRepository,
	attendanceRepo *repository.AttendanceRepository,
) DashboardService {
	return &dashboardService{
		dashboardRepo:  dashboardRepo,
		attendanceRepo: attendanceRepo,
	}
}

func (s *dashboardService) GetDepartmentDashboard(departmentID int) (*models.DepartmentDashboardResponse, error) {
	// Get summary
	summary, err := s.dashboardRepo.GetDepartmentSummary(departmentID)
	if err != nil {
		return nil, err
	}
	
	// Get today's attendance
	checkIORecords, err := s.attendanceRepo.GetTodayAttendanceByDepartment(departmentID, time.Now().Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	
	// Get pending leave requests
	pendingLeaves, err := s.dashboardRepo.GetPendingLeaveRequests(departmentID)
	if err != nil {
		return nil, err
	}
	
	// Convert CheckIOResponse to TodayAttendanceResponse
	todayAttendance := make([]models.TodayAttendanceResponse, 0, len(checkIORecords))
	for _, record := range checkIORecords {
		if record != nil {
			todayAttendance = append(todayAttendance, models.TodayAttendanceResponse{
				UserID:       record.UserID,
				UserName:     record.UserName,
				Day:          record.Day,
				CheckinTime:  record.CheckinTime,
				CheckoutTime: record.CheckoutTime,
				WorkStatus:   record.WorkStatus,
				LeaveStatus:  record.LeaveStatus,
				ShiftName:    record.ShiftName,
			})
		}
	}
	
	// Ensure arrays are not nil
	if pendingLeaves == nil {
		pendingLeaves = []models.PendingLeaveRequest{}
	}
	
	return &models.DepartmentDashboardResponse{
		Summary: *summary,
		TodayAttendance: models.TodayAttendanceData{
			Date:  time.Now().Format("2006-01-02"),
			Items: todayAttendance,
		},
		PendingLeaveRequests: pendingLeaves,
	}, nil
}