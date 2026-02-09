package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

type AttendanceEditHistory struct {
	ID           int             `json:"id"`
	CheckinID    int             `json:"checkin_id"`
	EditorID     int             `json:"editor_id"`
	EditorName   string          `json:"editor_name"`
	OldValues    json.RawMessage `json:"old_values"`
	NewValues    json.RawMessage `json:"new_values"`
	ChangeReason string          `json:"change_reason,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

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
    LeaveStatus        sql.NullString  `json:"leave_status"`
    FactoryName        sql.NullString  `json:"factory_name,omitempty"`
    Note               sql.NullString  `json:"note,omitempty"`
    WorkHours          sql.NullFloat64 `json:"work_hours,omitempty"`
    WorkUnit           sql.NullFloat64 `json:"work_unit,omitempty"`
    IsValid            bool            `json:"is_valid"`
    CheckinType        sql.NullString  `json:"checkin_type,omitempty"`
    CreatedAt          time.Time       `json:"created_at"`
    UpdatedAt          time.Time       `json:"updated_at"`
}

type CheckIOResponse struct {
    ID                 int        `json:"id"`
    UserID             int        `json:"user_id"`
    UserName           string     `json:"user_name"`
    DepartmentName     *string    `json:"department_name,omitempty"`
    Day                time.Time     `json:"day"`
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
    LeaveStatus         sql.NullString      `json:"leave_status"`
    FactoryName        *string    `json:"factory_name,omitempty"`
    Note               *string    `json:"note,omitempty"`
    CheckinType        *string    `json:"checkin_type,omitempty"`
    DistanceFromOffice *float64   `json:"distance_from_office,omitempty"`
    WorkUnit           *float64   `json:"work_unit,omitempty"`
    WorkHours          *float64   `json:"work_hours,omitempty"`
}
type TodayAttendanceResponse struct {
	UserID       int        `json:"user_id"`
	UserName     string     `json:"user_name"`
	Day          time.Time  `json:"day"`
	CheckinTime  *time.Time `json:"checkin_time,omitempty"`
	CheckoutTime *time.Time `json:"checkout_time,omitempty"`
	WorkStatus   *string    `json:"work_status,omitempty"`
	LeaveStatus  sql.NullString     `json:"leave_status"`
	ShiftName    *string    `json:"shift_name,omitempty"`
}

type AttendanceHistoryResponse struct {
	ID           int        `json:"id"`
	UserID       int        `json:"user_id"`
	UserName     string     `json:"user_name"`
	Day          time.Time  `json:"day"`
	CheckinTime  *time.Time `json:"checkin_time,omitempty"`
	CheckoutTime *time.Time `json:"checkout_time,omitempty"`
	WorkStatus   *string    `json:"work_status,omitempty"`
	LeaveStatus  sql.NullString     `json:"leave_status"`
	ShiftName    *string    `json:"shift_name,omitempty"`
    FactoryName  *string    `json:"factory_name,omitempty"`
    Note         *string    `json:"note,omitempty"`
    CheckinType  *string    `json:"checkin_type,omitempty"`
}

type AttendanceHistoryFilter struct {
	UserID    *int       `form:"user_id"`
	FromDate  *time.Time `form:"from_date"`
	ToDate    *time.Time `form:"to_date"`
	Status    *string    `form:"status"`
	Page      int        `form:"page"`
	PageSize  int        `form:"page_size"`
}

type UpdateAttendanceRequest struct {
	CheckinTime  *time.Time `json:"checkin_time"`
	CheckoutTime *time.Time `json:"checkout_time"`
	WorkStatus   *string    `json:"work_status"`
	WorkUnit     *float64   `json:"work_unit"`
	IsValid      *bool      `json:"is_valid"`
	Note         *string    `json:"note"`
}