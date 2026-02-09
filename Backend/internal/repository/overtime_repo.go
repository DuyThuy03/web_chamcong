package repository

import (
	"attendance-system/internal/models"
	"database/sql"
	"strconv"
	"strings"
	"time"
)

type OvertimeRepository struct {
	db *sql.DB
}

func NewOvertimeRepository(db *sql.DB) *OvertimeRepository {
	return &OvertimeRepository{db: db}
}

func (r *OvertimeRepository) Create(ot *models.Overtime) error {
	query := `
		INSERT INTO "overtime" (user_id, day, start_time, end_time, total_hours, base_rate, status, content)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	
	return r.db.QueryRow(
		query,
		ot.UserID,
		ot.Day,
		ot.StartTime,
		ot.EndTime,
		ot.TotalHours,
		ot.BaseRate,
		"CHO_DUYET",
		ot.Content,
	).Scan(&ot.ID, &ot.CreatedAt)
}

func (r *OvertimeRepository) GetAll(userID int, role string, deptID *int, limit, offset int, status string) ([]models.OvertimeResponse, int, error) {
	var countQuery, dataQuery string
	var args []interface{}
	var countArgs []interface{}

	var whereClauses []string

	if role == "Nhân viên" {
		whereClauses = append(whereClauses, "o.user_id = $1")
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
		whereClauses = append(whereClauses, "o.status = $"+strconv.Itoa(idx))
		args = append(args, status)
		countArgs = append(countArgs, status)
	}

	whereStr := ""
	if len(whereClauses) > 0 {
		whereStr = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	countQuery = `
		SELECT COUNT(*) FROM "overtime" o
		JOIN users u ON o.user_id = u.id
	` + whereStr

	dataQuery = `
		SELECT o.id, o.user_id, u.name, o.day, o.start_time, o.end_time,
		       o.total_hours, o.base_rate, o.adjusted_rate, o.adjustment_reason,
		       o.status, o.approved_by, approver.name, o.approved_at, o.created_at, o.content
		FROM "overtime" o
		JOIN users u ON o.user_id = u.id
		LEFT JOIN users approver ON o.approved_by = approver.id
	` + whereStr + `
		ORDER BY o.created_at DESC
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

	var responses []models.OvertimeResponse
	for rows.Next() {
		var resp models.OvertimeResponse
		var day time.Time
		var adjustedRate sql.NullFloat64
		var adjustmentReason sql.NullString
		var approvedBy sql.NullInt64
		var approvedByName sql.NullString
		var approvedAt sql.NullTime
		var content sql.NullString

		err := rows.Scan(
			&resp.ID,
			&resp.UserID,
			&resp.UserName,
			&day,
			&resp.StartTime,
			&resp.EndTime,
			&resp.TotalHours,
			&resp.BaseRate,
			&adjustedRate,
			&adjustmentReason,
			&resp.Status,
			&approvedBy,
			&approvedByName,
			&approvedAt,
			&resp.CreatedAt,
			&content,
		)
		if err != nil {
			return nil, 0, err
		}

		resp.Day = day.Format("2006-01-02")

		if adjustedRate.Valid {
			val := adjustedRate.Float64
			resp.AdjustedRate = &val
		}
		if adjustmentReason.Valid {
			resp.AdjustmentReason = &adjustmentReason.String
		}
		if approvedBy.Valid {
			val := int(approvedBy.Int64)
			resp.ApprovedBy = &val
		}
		if approvedByName.Valid {
			resp.ApprovedByName = &approvedByName.String
		}
		if approvedAt.Valid {
			resp.ApprovedAt = &approvedAt.Time
		}
		if content.Valid {
			resp.Content = &content.String
		}

		responses = append(responses, resp)
	}

	return responses, total, nil
}

func (r *OvertimeRepository) GetByID(id int) (*models.OvertimeResponse, error) {
	query := `
		SELECT o.id, o.user_id, u.name, o.day, o.start_time, o.end_time,
		       o.total_hours, o.base_rate, o.adjusted_rate, o.adjustment_reason,
		       o.status, o.approved_by, approver.name, o.approved_at, o.created_at, o.content
		FROM "overtime" o
		JOIN users u ON o.user_id = u.id
		LEFT JOIN users approver ON o.approved_by = approver.id
		WHERE o.id = $1
	`
	var resp models.OvertimeResponse
	var day time.Time
	var adjustedRate sql.NullFloat64
	var adjustmentReason sql.NullString
	var approvedBy sql.NullInt64
	var approvedByName sql.NullString
	var approvedAt sql.NullTime
	var content sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&resp.ID,
		&resp.UserID,
		&resp.UserName,
		&day,
		&resp.StartTime,
		&resp.EndTime,
		&resp.TotalHours,
		&resp.BaseRate,
		&adjustedRate,
		&adjustmentReason,
		&resp.Status,
		&approvedBy,
		&approvedByName,
		&approvedAt,
		&resp.CreatedAt,
		&content,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	resp.Day = day.Format("2006-01-02")
	if adjustedRate.Valid {
		val := adjustedRate.Float64
		resp.AdjustedRate = &val
	}
	if adjustmentReason.Valid {
		resp.AdjustmentReason = &adjustmentReason.String
	}
	if approvedBy.Valid {
		val := int(approvedBy.Int64)
		resp.ApprovedBy = &val
	}
	if approvedByName.Valid {
		resp.ApprovedByName = &approvedByName.String
	}
	if approvedAt.Valid {
		resp.ApprovedAt = &approvedAt.Time
	}
	if content.Valid {
		resp.Content = &content.String
	}

	return &resp, nil
}

func (r *OvertimeRepository) UpdateStatus(id int, status string, approvedByID int, rate *float64) error {
	if rate != nil {
		query := `
			UPDATE "overtime"
			SET status = $1, approved_by = $2, approved_at = $3, adjusted_rate = $4
			WHERE id = $5
		`
		_, err := r.db.Exec(query, status, approvedByID, time.Now(), *rate, id)
		return err
	}
	
	query := `
		UPDATE "overtime"
		SET status = $1, approved_by = $2, approved_at = $3
		WHERE id = $4
	`
	_, err := r.db.Exec(query, status, approvedByID, time.Now(), id)
	return err
}

func (r *OvertimeRepository) Delete(id int) error {
	_, err := r.db.Exec(`DELETE FROM "overtime" WHERE id = $1`, id)
	return err
}
