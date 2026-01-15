package repository

import (
	"database/sql"
	"time"

	"attendance-system/internal/models"
)

type LeaveRequestRepository struct {
	db *sql.DB
}

func NewLeaveRequestRepository(db *sql.DB) *LeaveRequestRepository {
	return &LeaveRequestRepository{db: db}
}

func (r *LeaveRequestRepository) Create(req *models.LeaveRequest) error {
	query := `
		INSERT INTO leave_requests (user_id, type, from_date, to_date, session, expected_arrival_time, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(
		query,
		req.UserID,
		req.Type,
		req.FromDate,
		req.ToDate,
		req.Session,
		req.ExpectedArrivalTime,
		req.Reason,
		"pending",
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
}

func (r *LeaveRequestRepository) GetAll(userID int, role string, deptID *int, limit, offset int) ([]models.LeaveRequestResponse, int, error) {
	var countQuery, dataQuery string
	var args []interface{}

	// Build queries based on role
	if role == "Nhân viên" {
		countQuery = `SELECT COUNT(*) FROM leave_requests WHERE user_id = $1`
		dataQuery = `
			SELECT lr.id, lr.user_id, u.full_name, lr.type, lr.from_date, lr.to_date,
			       lr.session, lr.expected_arrival_time, lr.reason, lr.status,
			       lr.approved_by_id, approver.full_name as approved_by_name, lr.approved_at, lr.created_at
			FROM leave_requests lr
			JOIN users u ON lr.user_id = u.id
			LEFT JOIN users approver ON lr.approved_by_id = approver.id
			WHERE lr.user_id = $1
			ORDER BY lr.created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{userID, limit, offset}
	} else if role == "Trưởng phòng" && deptID != nil {
		countQuery = `
			SELECT COUNT(*) FROM leave_requests lr
			JOIN users u ON lr.user_id = u.id
			WHERE u.department_id = $1
		`
		dataQuery = `
			SELECT lr.id, lr.user_id, u.full_name, lr.type, lr.from_date, lr.to_date,
			       lr.session, lr.expected_arrival_time, lr.reason, lr.status,
			       lr.approved_by_id, approver.full_name as approved_by_name, lr.approved_at, lr.created_at
			FROM leave_requests lr
			JOIN users u ON lr.user_id = u.id
			LEFT JOIN users approver ON lr.approved_by_id = approver.id
			WHERE u.department_id = $1
			ORDER BY lr.created_at DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{*deptID, limit, offset}
	} else {
		// Admin/Manager - see all
		countQuery = `SELECT COUNT(*) FROM leave_requests`
		dataQuery = `
			SELECT lr.id, lr.user_id, u.full_name, lr.type, lr.from_date, lr.to_date,
			       lr.session, lr.expected_arrival_time, lr.reason, lr.status,
			       lr.approved_by_id, approver.full_name as approved_by_name, lr.approved_at, lr.created_at
			FROM leave_requests lr
			JOIN users u ON lr.user_id = u.id
			LEFT JOIN users approver ON lr.approved_by_id = approver.id
			ORDER BY lr.created_at DESC
			LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	// Get total count
	var total int
	var err error
	if role == "Nhân viên" || (role == "Trưởng phòng" && deptID != nil) {
		err = r.db.QueryRow(countQuery, args[0]).Scan(&total)
	} else {
		err = r.db.QueryRow(countQuery).Scan(&total)
	}
	if err != nil {
		return nil, 0, err
	}

	// Get data
	rows, err := r.db.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var requests []models.LeaveRequestResponse
	for rows.Next() {
		var req models.LeaveRequestResponse
		var fromDate, toDate time.Time
		err := rows.Scan(
			&req.ID,
			&req.UserID,
			&req.UserName,
			&req.Type,
			&fromDate,
			&toDate,
			&req.Session,
			&req.ExpectedArrivalTime,
			&req.Reason,
			&req.Status,
			&req.ApprovedByID,
			&req.ApprovedByName,
			&req.ApprovedAt,
			&req.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		req.FromDate = fromDate.Format("2006-01-02")
		req.ToDate = toDate.Format("2006-01-02")
		requests = append(requests, req)
	}

	return requests, total, nil
}

func (r *LeaveRequestRepository) GetByID(id int) (*models.LeaveRequestResponse, error) {
	query := `
		SELECT lr.id, lr.user_id, u.full_name, lr.type, lr.from_date, lr.to_date,
		       lr.session, lr.expected_arrival_time, lr.reason, lr.status,
		       lr.approved_by_id, approver.full_name as approved_by_name, lr.approved_at, lr.created_at
		FROM leave_requests lr
		JOIN users u ON lr.user_id = u.id
		LEFT JOIN users approver ON lr.approved_by_id = approver.id
		WHERE lr.id = $1
	`

	var req models.LeaveRequestResponse
	var fromDate, toDate time.Time
	err := r.db.QueryRow(query, id).Scan(
		&req.ID,
		&req.UserID,
		&req.UserName,
		&req.Type,
		&fromDate,
		&toDate,
		&req.Session,
		&req.ExpectedArrivalTime,
		&req.Reason,
		&req.Status,
		&req.ApprovedByID,
		&req.ApprovedByName,
		&req.ApprovedAt,
		&req.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	req.FromDate = fromDate.Format("2006-01-02")
	req.ToDate = toDate.Format("2006-01-02")

	return &req, nil
}

func (r *LeaveRequestRepository) UpdateStatus(id int, status string, approvedByID int) error {
	query := `
		UPDATE leave_requests
		SET status = $1, approved_by_id = $2, approved_at = $3, updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query, status, approvedByID, time.Now(), time.Now(), id)
	return err
}

func (r *LeaveRequestRepository) GetUserIDByRequestID(id int) (int, error) {
	var userID int
	query := `SELECT user_id FROM leave_requests WHERE id = $1`
	err := r.db.QueryRow(query, id).Scan(&userID)
	return userID, err
}
