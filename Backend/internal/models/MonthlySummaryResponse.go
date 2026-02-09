package models

type MonthlySummaryResponse struct {
	UserID                int                              `json:"user_id"`
	UserName              string                           `json:"user_name"`
	DepartmentName        string                           `json:"department_name"`
	TotalDays             int                              `json:"total_days"`
	TotalStandardWorkDays float64                          `json:"total_standard_work_days"` 
	TotalOTHours          float64                          `json:"total_ot_hours"`
	TotalPaidLeaveDays    float64                          `json:"total_paid_leave_days"` 
	TotalWorkDays         float64                          `json:"total_work_days"`       
	AbsentDays            int                              `json:"absent_days"`
	LateDays              int                              `json:"late_days"`
	BaseSalary            float64                          `json:"base_salary"`
	TotalBaseSalary       float64                          `json:"total_base_salary"`
	TotalOTSalary         float64                          `json:"total_ot_salary"`
	TotalSalary           float64                          `json:"total_salary"`
	DailyDetails          map[string]DailyAttendanceDetail `json:"daily_details"`
}

type DailyAttendanceDetail struct {
	WorkUnit      float64 `json:"work_unit"`
	IsLate        bool    `json:"is_late"`
	LeaveType     string  `json:"leave_type,omitempty"`
	OvertimeHours float64 `json:"overtime_hours,omitempty"`
	Note          string  `json:"note,omitempty"`

	CheckinType     string  `json:"checkin_type,omitempty"`
	FactoryName     string  `json:"factory_name,omitempty"`
	IsPaidLeave     bool    `json:"is_paid_leave,omitempty"`
	OTHoursWeighted float64 `json:"ot_hours_weighted,omitempty"`
}