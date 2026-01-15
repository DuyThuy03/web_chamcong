package models

import "time"

type Department struct {
    ID         int       `json:"id"`
    Name       string    `json:"name"`
    LeaderID   *int      `json:"leader_id,omitempty"`
    LeaderName *string   `json:"leader_name,omitempty"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
}