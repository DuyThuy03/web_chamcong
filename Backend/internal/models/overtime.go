package models

import (
	"database/sql"
	"time"
)

type Overtime struct {
	ID               int             `json:"id"`
	UserID           int             `json:"user_id"`
	Day              time.Time       `json:"day"`
	StartTime        string          `json:"start_time"`
	EndTime          string          `json:"end_time"`
	TotalHours       float64         `json:"total_hours"`
	BaseRate         float64         `json:"base_rate"`
	AdjustedRate     sql.NullFloat64 `json:"adjusted_rate,omitempty"`
	AdjustmentReason sql.NullString  `json:"adjustment_reason,omitempty"`
	ApprovedBy       sql.NullInt64   `json:"approved_by,omitempty"`
	ApprovedAt       sql.NullTime    `json:"approved_at,omitempty"`
	Status           string          `json:"status"`
	Content          sql.NullString  `json:"content,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
}

type OvertimeResponse struct {
	ID               int        `json:"id"`
	UserID           int        `json:"user_id"`
	UserName         string     `json:"user_name"`
	Day              string     `json:"day"` 
	StartTime        string     `json:"start_time"`
	EndTime          string     `json:"end_time"`
	TotalHours       float64    `json:"total_hours"`
	BaseRate         float64    `json:"base_rate"`
	AdjustedRate     *float64   `json:"adjusted_rate,omitempty"`
	AdjustmentReason *string    `json:"adjustment_reason,omitempty"`
	ApprovedBy       *int       `json:"approved_by,omitempty"`
	ApprovedByName   *string    `json:"approved_by_name,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	Status           string     `json:"status"`
	Content          *string    `json:"content,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}
