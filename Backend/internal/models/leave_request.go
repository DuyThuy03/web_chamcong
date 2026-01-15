package models

import (
    "database/sql"
    "time"
)

type LeaveRequest struct {
    ID                  int            `json:"id"`
    UserID              int            `json:"user_id"`
    Type                string         `json:"type"`
    FromDate            time.Time      `json:"from_date"`
    ToDate              time.Time      `json:"to_date"`
    Session             sql.NullString `json:"session,omitempty"`
    ExpectedArrivalTime sql.NullString `json:"expected_arrival_time,omitempty"`
    Reason              sql.NullString `json:"reason,omitempty"`
    Status              string         `json:"status"`
    ApprovedByID        sql.NullInt64  `json:"approved_by_id,omitempty"`
    ApprovedAt          sql.NullTime   `json:"approved_at,omitempty"`
    CreatedAt           time.Time      `json:"created_at"`
    UpdatedAt           time.Time      `json:"updated_at"`
}

type LeaveRequestResponse struct {
    ID                  int        `json:"id"`
    UserID              int        `json:"user_id"`
    UserName            string     `json:"user_name"`
    Type                string     `json:"type"`
    FromDate            string     `json:"from_date"`
    ToDate              string     `json:"to_date"`
    Session             *string    `json:"session,omitempty"`
    ExpectedArrivalTime *string    `json:"expected_arrival_time,omitempty"`
    Reason              *string    `json:"reason,omitempty"`
    Status              string     `json:"status"`
    ApprovedByID        *int       `json:"approved_by_id,omitempty"`
    ApprovedByName      *string    `json:"approved_by_name,omitempty"`
    ApprovedAt          *time.Time `json:"approved_at,omitempty"`
    CreatedAt           time.Time  `json:"created_at"`
}