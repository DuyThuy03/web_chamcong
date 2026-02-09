package repository

import (
	"database/sql"
	"strconv"
	"strings"
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
		INSERT INTO "leaverequest" (user_id, type, from_date, to_date, session, expected_arrival_time, reason, status)
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
		"CHO_DUYET", 
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
}

func (r *LeaveRequestRepository) GetAll(userID int, role string, deptID *int, limit, offset int, status string) ([]models.LeaveRequestResponse, int, error) {
	var countQuery, dataQuery string
	var args []interface{}
	var countArgs []interface{}

	var whereClauses []string

	if role == "Nhân viên" {
		whereClauses = append(whereClauses, "lr.user_id = $1")
		args = append(args, userID)
		countArgs = append(countArgs, userID)
	} else if role == "Trưởng phòng" && deptID != nil {
		whereClauses = append(whereClauses, "u.department_id = $1")
		args = append(args, *deptID)
		countArgs = append(countArgs, *deptID)
	} else {
		
	}

	if status != "" && status != "ALL" {
		
		idx := len(args) + 1
		whereClauses = append(whereClauses, "lr.status = $"+strconv.Itoa(idx))
		args = append(args, status)
		countArgs = append(countArgs, status)
	}

	whereStr := ""
	if len(whereClauses) > 0 {
		whereStr = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	if role == "Trưởng phòng" && deptID != nil {
		countQuery = `
			SELECT COUNT(*) FROM "leaverequest" lr
			JOIN users u ON lr.user_id = u.id
		` + whereStr
	} else if role == "Nhân viên" {
		countQuery = `SELECT COUNT(*) FROM "leaverequest" lr ` + whereStr
	} else {
		
		countQuery = `SELECT COUNT(*) FROM "leaverequest" lr ` + whereStr
	}

	dataQuery = `
		SELECT lr.id, lr.user_id, u.name, lr.type, lr.from_date, lr.to_date,
				lr.session, lr.expected_arrival_time, lr.reason, lr.status,
				lr.approved_by_id, approver.name as approved_by_name, lr.approved_at, lr.created_at
		FROM "leaverequest" lr
		JOIN users u ON lr.user_id = u.id
		LEFT JOIN users approver ON lr.approved_by_id = approver.id
	` + whereStr + `
		ORDER BY lr.created_at DESC
		LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)

	args = append(args, limit, offset)

	var total int
	err := r.db.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var requests []models.LeaveRequestResponse
	for rows.Next() {
		var req models.LeaveRequestResponse
		var fromDate, toDate time.Time
		var session, expectedArrivalTime, reason sql.NullString
		var approvedByID sql.NullInt64
		var approvedByName sql.NullString
		var approvedAt sql.NullTime
		
		err := rows.Scan(
			&req.ID,
			&req.UserID,
			&req.UserName,
			&req.Type,
			&fromDate,
			&toDate,
			&session,
			&expectedArrivalTime,
			&reason,
			&req.Status,
			&approvedByID,
			&approvedByName,
			&approvedAt,
			&req.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		req.FromDate = fromDate.Format("2006-01-02")
		req.ToDate = toDate.Format("2006-01-02")

		if session.Valid {
			req.Session = &session.String
		}
		if expectedArrivalTime.Valid {
			req.ExpectedArrivalTime = &expectedArrivalTime.String
		}
		if reason.Valid {
			req.Reason = &reason.String
		}

		if approvedByID.Valid {
			id := int(approvedByID.Int64)
			req.ApprovedByID = &id
		}

		if approvedByName.Valid {
			req.ApprovedByName = &approvedByName.String
		}

		if approvedAt.Valid {
			req.ApprovedAt = &approvedAt.Time
		}
		
		requests = append(requests, req)
	}

	return requests, total, nil
}

func (r *LeaveRequestRepository) GetByID(id int) (*models.LeaveRequestResponse, error) {
	query := `
		SELECT lr.id, lr.user_id, u.name, lr.type, lr.from_date, lr.to_date,
		       lr.session, lr.expected_arrival_time, lr.reason, lr.status,
		       lr.approved_by_id, approver.name as approved_by_name, lr.approved_at, lr.created_at
		FROM "leaverequest" lr
		JOIN users u ON lr.user_id = u.id
		LEFT JOIN users approver ON lr.approved_by_id = approver.id
		WHERE lr.id = $1
	`

	var req models.LeaveRequestResponse
	var fromDate, toDate time.Time
	var session, expectedArrivalTime, reason sql.NullString
	var approvedByID sql.NullInt64
	var approvedByName sql.NullString
	var approvedAt sql.NullTime
	
	err := r.db.QueryRow(query, id).Scan(
		&req.ID,
		&req.UserID,
		&req.UserName,
		&req.Type,
		&fromDate,
		&toDate,
		&session,
		&expectedArrivalTime,
		&reason,
		&req.Status,
		&approvedByID,
		&approvedByName,
		&approvedAt,
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

	if session.Valid {
		req.Session = &session.String
	}
	if expectedArrivalTime.Valid {
		req.ExpectedArrivalTime = &expectedArrivalTime.String
	}
	if reason.Valid {
		req.Reason = &reason.String
	}

	if approvedByID.Valid {
		id := int(approvedByID.Int64)
		req.ApprovedByID = &id
	}

	if approvedByName.Valid {
		req.ApprovedByName = &approvedByName.String
	}

	if approvedAt.Valid {
		req.ApprovedAt = &approvedAt.Time
	}

	return &req, nil
}

func (r *LeaveRequestRepository) UpdateStatus(id int, status string, approvedByID int, paid *bool) error {
	if paid != nil {
		query := `
			UPDATE "leaverequest"
			SET status = $1, approved_by_id = $2, approved_at = $3, updated_at = $4, paid = $5
			WHERE id = $6
		`
		_, err := r.db.Exec(query, status, approvedByID, time.Now(), time.Now(), *paid, id)
		return err
	}

	query := `
		UPDATE "leaverequest"
		SET status = $1, approved_by_id = $2, approved_at = $3, updated_at = $4
		WHERE id = $5
	`

	_, err := r.db.Exec(query, status, approvedByID, time.Now(), time.Now(), id)
	return err
}

func (r *LeaveRequestRepository) GetUserIDByRequestID(id int) (int, error) {
	var userID int
	query := `SELECT user_id FROM "leaverequest" WHERE id = $1`
	err := r.db.QueryRow(query, id).Scan(&userID)
	return userID, err
}

func (r *LeaveRequestRepository) CancelRequest(id int) error {
	query := `
		UPDATE "leaverequest"
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(query, "DA_HUY", time.Now(), id)
	return err
}

func (r *LeaveRequestRepository) Delete(id int) error {
	query := `
		DELETE FROM "leaverequest"
		WHERE id = $1
	`

	_, err := r.db.Exec(query, id)
	return err
}