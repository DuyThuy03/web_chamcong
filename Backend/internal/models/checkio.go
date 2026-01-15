package models

import (
    "database/sql"
    "time"
)

type CheckIO struct {
    ID                 int             `json:"id"`
    UserID             int             `json:"user_id"`
    Day                time.Time       `json:"day"`
    CheckinTime        sql.NullTime    `json:"checkin_time,omitempty"`
    CheckoutTime       sql.NullTime    `json:"checkout_time,omitempty"`
    CheckinImage       sql.NullString  `json:"checkin_image,omitempty"`
    CheckoutImage      sql.NullString  `json:"checkout_image,omitempty"`
    CheckinLatitude    sql.NullFloat64 `json:"checkin_latitude,omitempty"`
    CheckinLongitude   sql.NullFloat64 `json:"checkin_longitude,omitempty"`
    CheckoutLatitude   sql.NullFloat64 `json:"checkout_latitude,omitempty"`
    CheckoutLongitude  sql.NullFloat64 `json:"checkout_longitude,omitempty"`
    CheckinAddress     sql.NullString  `json:"checkin_address,omitempty"`
    CheckoutAddress    sql.NullString  `json:"checkout_address,omitempty"`
    Device             sql.NullString  `json:"device,omitempty"`
    ShiftID            sql.NullInt64   `json:"shift_id,omitempty"`
    WorkStatus         sql.NullString  `json:"work_status,omitempty"`
    LeaveStatus        string          `json:"leave_status"`
    CreatedAt          time.Time       `json:"created_at"`
    UpdatedAt          time.Time       `json:"updated_at"`
}

type CheckIOResponse struct {
    ID                 int        `json:"id"`
    UserID             int        `json:"user_id"`
    UserName           string     `json:"user_name"`
    DepartmentName     *string    `json:"department_name,omitempty"`
    Day                string     `json:"day"`
    CheckinTime        *time.Time `json:"checkin_time,omitempty"`
    CheckoutTime       *time.Time `json:"checkout_time,omitempty"`
    CheckinImage       *string    `json:"checkin_image,omitempty"`
    CheckoutImage      *string    `json:"checkout_image,omitempty"`
    CheckinLatitude    *float64   `json:"checkin_latitude,omitempty"`
    CheckinLongitude   *float64   `json:"checkin_longitude,omitempty"`
    CheckoutLatitude   *float64   `json:"checkout_latitude,omitempty"`
    CheckoutLongitude  *float64   `json:"checkout_longitude,omitempty"`
    CheckinAddress     *string    `json:"checkin_address,omitempty"`
    CheckoutAddress    *string    `json:"checkout_address,omitempty"`
    Device             *string    `json:"device,omitempty"`
    ShiftID            *int       `json:"shift_id,omitempty"`
    ShiftName          *string    `json:"shift_name,omitempty"`
    WorkStatus         *string    `json:"work_status,omitempty"`
    LeaveStatus        string     `json:"leave_status"`
    DistanceFromOffice *float64   `json:"distance_from_office,omitempty"`
}