package repository

import (
	"database/sql"

	"attendance-system/internal/models"
)

type ShiftRepository struct {
	db *sql.DB
}

func NewShiftRepository(db *sql.DB) *ShiftRepository {
	return &ShiftRepository{db: db}
}

func (r *ShiftRepository) GetAll() ([]models.Shift, error) {
	query := `
		SELECT id, name, start_time, end_time, late_after_min, created_at, updated_at
		FROM shifts
		ORDER BY start_time
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shifts []models.Shift
	for rows.Next() {
		var shift models.Shift
		err := rows.Scan(
			&shift.ID,
			&shift.Name,
			&shift.StartTime,
			&shift.EndTime,
			&shift.LateAfterMin,
			&shift.CreatedAt,
			&shift.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		shifts = append(shifts, shift)
	}

	return shifts, nil
}

func (r *ShiftRepository) GetByID(id int) (*models.Shift, error) {
	query := `
		SELECT id, name, start_time, end_time, late_after_min, created_at, updated_at
		FROM shifts
		WHERE id = $1
	`

	var shift models.Shift
	err := r.db.QueryRow(query, id).Scan(
		&shift.ID,
		&shift.Name,
		&shift.StartTime,
		&shift.EndTime,
		&shift.LateAfterMin,
		&shift.CreatedAt,
		&shift.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &shift, nil
}
