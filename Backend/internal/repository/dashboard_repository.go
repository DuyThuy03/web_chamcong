package repository

import (
	"attendance-system/internal/models"
	"database/sql"
	"time"
)

type DashboardRepository interface {
	GetDepartmentSummary(departmentID int) (*models.DashboardSummary, error)
	GetPendingLeaveRequests(departmentID int) ([]models.PendingLeaveRequest, error)
}

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetDepartmentSummary(departmentID int) (*models.DashboardSummary, error) {
	today := time.Now().Format("2006-01-02")
	
	query := `
		SELECT 
			COUNT(DISTINCT u.id) as total_members,
			COUNT(DISTINCT CASE WHEN c.checkin_time IS NOT NULL THEN u.id END) as present_today,
			COUNT(DISTINCT CASE WHEN c.work_status = 'LATE' THEN u.id END) as late_today,
			(SELECT COUNT(*) FROM LeaveRequest lr 
			 INNER JOIN users u2 ON lr.user_id = u2.id 
			 WHERE u2.department_id = $1 AND lr.status = 'CHO_DUYET') as pending_leaves
		FROM users u
		LEFT JOIN CheckIO c ON u.id = c.user_id AND c.day = $2::date
		WHERE u.department_id = $1 AND u.status = 'Hoạt động'`
	
	var summary models.DashboardSummary
	err := r.db.QueryRow(query, departmentID, today).Scan(
		&summary.TotalMembers,
		&summary.PresentToday,
		&summary.LateToday,
		&summary.PendingLeaves,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &summary, nil
}

func (r *dashboardRepository) GetPendingLeaveRequests(departmentID int) ([]models.PendingLeaveRequest, error) {
	query := `
		SELECT 
			lr.id,
			lr.user_id,
			u.name as user_name,
			lr.type,
			lr.from_date,
			lr.to_date,
			lr.session,
			lr.reason,
			lr.created_at
		FROM LeaveRequest lr
		INNER JOIN users u ON lr.user_id = u.id
		WHERE u.department_id = $1 AND lr.status = 'CHO_DUYET'
		ORDER BY lr.created_at DESC
		LIMIT 10`
	
	rows, err := r.db.Query(query, departmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var requests []models.PendingLeaveRequest
	for rows.Next() {
		var req models.PendingLeaveRequest
		var fromDate, toDate, createdAt time.Time
		
		err := rows.Scan(
			&req.ID,
			&req.UserID,
			&req.UserName,
			&req.Type,
			&fromDate,
			&toDate,
			&req.Session,
			&req.Reason,
			&createdAt,
		)
		if err != nil {
			return nil, err
		}
		
		req.FromDate = fromDate.Format("2006-01-02")
		req.ToDate = toDate.Format("2006-01-02")
		req.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		
		requests = append(requests, req)
	}
	
	if requests == nil {
		requests = []models.PendingLeaveRequest{}
	}
	
	return requests, nil
}