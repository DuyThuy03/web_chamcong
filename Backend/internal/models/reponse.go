package models

type PaginationResponse struct {
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
	TotalItems int         `json:"total_items"`
	Data       interface{} `json:"data"`
}

type DashboardSummary struct {
	TotalMembers  int `json:"total_members"`
	PresentToday  int `json:"present_today"`
	LateToday     int `json:"late_today"`
	PendingLeaves int `json:"pending_leaves"`
}

type TodayAttendanceData struct {
	Date  string                    `json:"date"`
	Items []TodayAttendanceResponse `json:"items"`
}

type PendingLeaveRequest struct {
	ID        int     `json:"id"`
	UserID    int     `json:"user_id"`
	UserName  string  `json:"user_name"`
	Type      string  `json:"type"`
	FromDate  string  `json:"from_date"`
	ToDate    string  `json:"to_date"`
	Session   *string `json:"session,omitempty"`
	Reason    *string `json:"reason,omitempty"`
	CreatedAt string  `json:"created_at"`
}

type DepartmentDashboardResponse struct {
	Summary              DashboardSummary      `json:"summary"`
	TodayAttendance      TodayAttendanceData   `json:"today_attendance"`
	PendingLeaveRequests []PendingLeaveRequest `json:"pending_leave_requests"`
}