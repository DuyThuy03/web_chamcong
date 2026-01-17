package repository

import (
	"database/sql"
	"strconv"
	"strings"
	"time"

	"attendance-system/internal/models"
)

type AttendanceRepository struct {
    db      *sql.DB
    baseURL string
}

func NewAttendanceRepository(db *sql.DB, baseURL string) *AttendanceRepository {
    return &AttendanceRepository{
        db:      db,
        baseURL: baseURL,
    }
}

// Helper function to convert file path to URL
func (r *AttendanceRepository) convertPathToURL(path string) string {
	if path == "" {
		return ""
	}
	// Replace backslashes with forward slashes
	path = strings.ReplaceAll(path, "\\", "/")
	// Add /uploads/ prefix if not already present
	if !strings.HasPrefix(path, "/uploads/") && !strings.HasPrefix(path, "uploads/") {
		path = "/uploads/" + path
	}
	// Return full URL with baseURL
	return r.baseURL + path
}

func (r *AttendanceRepository) Create(checkIO *models.CheckIO) error {
    return r.db.QueryRow(`
        INSERT INTO CheckIO (user_id, day, checkin_time, checkin_image, 
                            checkin_latitude, checkin_longitude, checkin_address,
                            device, shift_id, work_status, leave_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
    `, checkIO.UserID, checkIO.Day, checkIO.CheckinTime, checkIO.CheckinImage,
        checkIO.CheckinLatitude, checkIO.CheckinLongitude, checkIO.CheckinAddress,
        checkIO.Device, checkIO.ShiftID, checkIO.WorkStatus, checkIO.LeaveStatus,
    ).Scan(&checkIO.ID)
}

func (r *AttendanceRepository) Update(checkIO *models.CheckIO) error {
    _, err := r.db.Exec(`
        UPDATE CheckIO 
        SET checkin_time = $1, checkout_time = $2, 
            checkin_image = $3, checkout_image = $4,
            checkin_latitude = $5, checkin_longitude = $6,
            checkout_latitude = $7, checkout_longitude = $8,
            checkin_address = $9, checkout_address = $10,
            device = $11, shift_id = $12, work_status = $13,
            leave_status = $14, updated_at = NOW()
        WHERE id = $15
    `, checkIO.CheckinTime, checkIO.CheckoutTime,
        checkIO.CheckinImage, checkIO.CheckoutImage,
        checkIO.CheckinLatitude, checkIO.CheckinLongitude,
        checkIO.CheckoutLatitude, checkIO.CheckoutLongitude,
        checkIO.CheckinAddress, checkIO.CheckoutAddress,
        checkIO.Device, checkIO.ShiftID, checkIO.WorkStatus,
        checkIO.LeaveStatus, checkIO.ID)
    return err
}

func (r *AttendanceRepository) GetByUserAndDay(userID int, day time.Time) (*models.CheckIO, error) {
    checkIO := &models.CheckIO{}
    err := r.db.QueryRow(`
        SELECT id, user_id, day, checkin_time, checkout_time,
               checkin_image, checkout_image, checkin_latitude, checkin_longitude,
               checkout_latitude, checkout_longitude, checkin_address, checkout_address,
               device, shift_id, work_status, leave_status, created_at
        FROM CheckIO WHERE user_id = $1 AND day = $2
    `, userID, day).Scan(
        &checkIO.ID, &checkIO.UserID, &checkIO.Day,
        &checkIO.CheckinTime, &checkIO.CheckoutTime,
        &checkIO.CheckinImage, &checkIO.CheckoutImage,
        &checkIO.CheckinLatitude, &checkIO.CheckinLongitude,
        &checkIO.CheckoutLatitude, &checkIO.CheckoutLongitude,
        &checkIO.CheckinAddress, &checkIO.CheckoutAddress,
        &checkIO.Device, &checkIO.ShiftID, &checkIO.WorkStatus,
        &checkIO.LeaveStatus, &checkIO.CreatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, err
    }
    return checkIO, err
}

func (r *AttendanceRepository) GetByID(id int) (*models.CheckIOResponse, error) {
    resp := &models.CheckIOResponse{}
    var deptName sql.NullString
    
    err := r.db.QueryRow(`
        SELECT c.id, c.user_id, u.name as user_name, d.name as department_name,
               c.day, c.checkin_time, c.checkout_time,
               c.checkin_image, c.checkout_image,
               c.checkin_latitude, c.checkin_longitude,
               c.checkout_latitude, c.checkout_longitude,
               c.checkin_address, c.checkout_address,
               c.device, c.shift_id, s.name as shift_name,
               c.work_status, c.leave_status
        FROM CheckIO c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN department d ON u.department_id = d.id
        LEFT JOIN shifts s ON c.shift_id = s.id
        WHERE c.id = $1
    `, id).Scan(
        &resp.ID, &resp.UserID, &resp.UserName, &deptName,
        &resp.Day, &resp.CheckinTime, &resp.CheckoutTime,
        &resp.CheckinImage, &resp.CheckoutImage,
        &resp.CheckinLatitude, &resp.CheckinLongitude,
        &resp.CheckoutLatitude, &resp.CheckoutLongitude,
        &resp.CheckinAddress, &resp.CheckoutAddress,
        &resp.Device, &resp.ShiftID, &resp.ShiftName,
        &resp.WorkStatus, &resp.LeaveStatus,
    )
    
    if err != nil {
        return nil, err
    }
    
    if deptName.Valid {
        resp.DepartmentName = &deptName.String
    }
    
    // Convert image paths to URLs
    if resp.CheckinImage != nil {
        imageURL := r.convertPathToURL(*resp.CheckinImage)
        resp.CheckinImage = &imageURL
    }
    if resp.CheckoutImage != nil {
        imageURL := r.convertPathToURL(*resp.CheckoutImage)
        resp.CheckoutImage = &imageURL
    }
    
    return resp, nil
}

func (r *AttendanceRepository) GetHistory(userID *int, departmentID *int, fromDate, toDate time.Time, limit, offset int) ([]*models.CheckIOResponse, int, error) {
    query := `
        SELECT c.id, c.user_id, u.name as user_name, d.name as department_name,
               c.day, c.checkin_time, c.checkout_time,
               c.checkin_image, c.checkout_image,
               c.shift_id, s.name as shift_name,
               c.work_status, c.leave_status
        FROM CheckIO c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN department d ON u.department_id = d.id
        LEFT JOIN shifts s ON c.shift_id = s.id
        WHERE c.day BETWEEN $1 AND $2
    `
    
    args := []interface{}{fromDate, toDate}
    argCount := 2
    
    if userID != nil {
    argCount++
    query += " AND c.user_id = $" + strconv.Itoa(argCount)
    args = append(args, *userID)
}

if departmentID != nil {
    argCount++
    query += " AND u.department_id = $" + strconv.Itoa(argCount)
    args = append(args, *departmentID)
}

    
    // Get total count
    countQuery := `SELECT COUNT(*) FROM (` + query + `) as count_table`
    var total int
    err := r.db.QueryRow(countQuery, args...).Scan(&total)
    if err != nil {
        return nil, 0, err
    }
    
    // Get records
   query += " ORDER BY c.day DESC, c.checkin_time DESC"
argCount++
query += " LIMIT $" + strconv.Itoa(argCount)
args = append(args, limit)

argCount++
query += " OFFSET $" + strconv.Itoa(argCount)
args = append(args, offset)

rows, err := r.db.Query(query, args...)
if err != nil {
    return nil, 0, err
}
defer rows.Close()

records := make([]*models.CheckIOResponse, 0)
for rows.Next() {
    resp := &models.CheckIOResponse{}
        var deptName sql.NullString
        
        err := rows.Scan(
            &resp.ID, &resp.UserID, &resp.UserName, &deptName,
            &resp.Day, &resp.CheckinTime, &resp.CheckoutTime,
            &resp.CheckinImage, &resp.CheckoutImage,
            &resp.ShiftID, &resp.ShiftName,
            &resp.WorkStatus, &resp.LeaveStatus,
        )
        if err != nil {
            return nil, 0, err
        }
        
        if deptName.Valid {
            resp.DepartmentName = &deptName.String
        }
        
        // Convert image paths to URLs
        if resp.CheckinImage != nil {
            imageURL := r.convertPathToURL(*resp.CheckinImage)
            resp.CheckinImage = &imageURL
        }
        if resp.CheckoutImage != nil {
            imageURL := r.convertPathToURL(*resp.CheckoutImage)
            resp.CheckoutImage = &imageURL
        }
        
        records = append(records, resp)
    }
    
    return records, total, nil
}
//hàm GetByUserAndDay trả về bản ghi CheckIO của người dùng trong ngày cụ thể
// func (r *AttendanceRepository) GetByUserAndDay(userID int, day time.Time) (*models.CheckIOResponse, error)