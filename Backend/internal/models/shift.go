package models

import "time"

type Shift struct {
    ID           int       `json:"id"`
    Name         string    `json:"name"`
    StartTime    string    `json:"start_time"`
    EndTime      string    `json:"end_time"`
    LateAfterMin int       `json:"late_after_min"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}