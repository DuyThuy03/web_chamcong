package models

type MonthlySummaryResponse struct {
	UserID         int     `json:"user_id"`
	UserName       string  `json:"user_name"`
	DepartmentName string  `json:"department_name"`
	TotalDays     int     `json:"total_days"`
	WorkingDays   int     `json:"working_days"`
	AbsentDays    int     `json:"absent_days"`
	LeaveDays     int     `json:"leave_days"`
	LateDays      int     `json:"late_days"`
}