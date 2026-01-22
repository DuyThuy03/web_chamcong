package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"attendance-system/internal/models"
)

type AttendanceRepository struct {
    db      *sql.DB
    baseURL string
}
type MonthlyAttendanceSummary struct {
    UserID           int
    UserName         string
    DepartmentName   string
    TotalDays        int
    WorkingDays      int
    AbsentDays       int
    LeaveDays        int
    LateDays         int
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

func (r *AttendanceRepository) GetHistory(
    userID *int,
    departmentID *int,
    username string,
    fromDate, toDate time.Time,
    limit, offset int,
) ([]*models.CheckIOResponse, int, error) {

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

    // ✅ FILTER THEO TÊN
    if username != "" {
        argCount++
        query += " AND LOWER(u.name) LIKE $" + strconv.Itoa(argCount)
        args = append(args, "%"+strings.ToLower(username)+"%")
    }

    // ===== COUNT =====
    countQuery := `SELECT COUNT(*) FROM (` + query + `) as count_table`
    var total int
    if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
        return nil, 0, err
    }

    // ===== DATA =====
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

        if resp.CheckinImage != nil {
            url := r.convertPathToURL(*resp.CheckinImage)
            resp.CheckinImage = &url
        }
        if resp.CheckoutImage != nil {
            url := r.convertPathToURL(*resp.CheckoutImage)
            resp.CheckoutImage = &url
        }

        records = append(records, resp)
    }

    return records, total, nil
}


// GetTodayAttendanceByDepartment - Lấy trạng thái điểm danh hôm nay của thành viên trong phòng ban 

func (r *AttendanceRepository) GetTodayAttendanceByDepartment(departmentID int, today string) ([]*models.CheckIOResponse, error) {
	query := `
		SELECT 
			u.id as user_id,
			u.name as user_name,
			d.name as department_name,
			c.id,
			c.day,
			c.checkin_time,
			c.checkout_time,
			c.checkin_image,
			c.checkout_image,
			c.shift_id,
			s.name as shift_name,
			c.work_status,
			c.leave_status
		FROM users u
		LEFT JOIN department d ON u.department_id = d.id
		LEFT JOIN CheckIO c ON u.id = c.user_id AND c.day = $1::date
		LEFT JOIN shifts s ON c.shift_id = s.id
		WHERE u.department_id = $2 AND u.status = 'Hoạt động' 
		ORDER BY u.name`
	
	rows, err := r.db.Query(query, today, departmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	attendances := make([]*models.CheckIOResponse, 0)
	for rows.Next() {
		resp := &models.CheckIOResponse{}
		var checkioID sql.NullInt64
		var day sql.NullTime
		var deptName sql.NullString
		
		err := rows.Scan(
			&resp.UserID,
			&resp.UserName,
			&deptName,
			&checkioID,
			&day,
			&resp.CheckinTime,
			&resp.CheckoutTime,
			&resp.CheckinImage,
			&resp.CheckoutImage,
			&resp.ShiftID,
			&resp.ShiftName,
			&resp.WorkStatus,
			&resp.LeaveStatus,
		)
		if err != nil {
			return nil, err
		}
		
		if checkioID.Valid {
			id := int(checkioID.Int64)
			resp.ID = id
		}
		
		if day.Valid {
			resp.Day = day.Time
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
		
		attendances = append(attendances, resp)
	}
	
	return attendances, nil
}

// GetTodayAttendanceAll - Lấy trạng thái điểm danh hôm nay của tất cả thành viên (cho Quản lý và Giám đốc)
func (r *AttendanceRepository) GetTodayAttendanceAll(today string) ([]*models.CheckIOResponse, error) {
	query := `
		SELECT 
			u.id as user_id,
			u.name as user_name,
			d.name as department_name,
			c.id,
			c.day,
			c.checkin_time,
			c.checkout_time,
			c.checkin_image,
			c.checkout_image,
			c.shift_id,
			s.name as shift_name,
			c.work_status,
			c.leave_status
		FROM users u
		LEFT JOIN department d ON u.department_id = d.id
		LEFT JOIN CheckIO c ON u.id = c.user_id AND c.day = $1::date
		LEFT JOIN shifts s ON c.shift_id = s.id
		WHERE u.status = 'Hoạt động'
		ORDER BY d.name, u.name`
	
	rows, err := r.db.Query(query, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	attendances := make([]*models.CheckIOResponse, 0)
	for rows.Next() {
		resp := &models.CheckIOResponse{}
		var checkioID sql.NullInt64
		var day sql.NullTime
		var deptName sql.NullString
		
		err := rows.Scan(
			&resp.UserID,
			&resp.UserName,
			&deptName,
			&checkioID,
			&day,
			&resp.CheckinTime,
			&resp.CheckoutTime,
			&resp.CheckinImage,
			&resp.CheckoutImage,
			&resp.ShiftID,
			&resp.ShiftName,
			&resp.WorkStatus,
			&resp.LeaveStatus,
		)
		if err != nil {
			return nil, err
		}
		
		if checkioID.Valid {
			id := int(checkioID.Int64)
			resp.ID = id
		}
		
		if day.Valid {
			resp.Day = day.Time
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
		
		attendances = append(attendances, resp)
	}
	
	return attendances, nil
}

// func (r *AttendanceRepository) GetAttendanceByUserAndDate(userID int, date time.Time) (*models.CheckIO, error) {
// 	query := `
// 		SELECT id, user_id, day, checkin_time, checkout_time, checkin_image, 
// 			checkout_image, checkin_latitude, checkin_longitude, checkout_latitude, 
// 			checkout_longitude, checkin_address, checkout_address, device, shift_id, 
// 			work_status, leave_status, created_at, updated_at
// 		FROM CheckIO
// 		WHERE user_id = $1 AND day = $2`
	
// 	var checkio models.CheckIO
// 	err := r.db.QueryRow(query, userID, date.Format("2006-01-02")).Scan(
// 		&checkio.ID,
// 		&checkio.UserID,
// 		&checkio.Day,
// 		&checkio.CheckinTime,
// 		&checkio.CheckoutTime,
// 		&checkio.CheckinImage,
// 		&checkio.CheckoutImage,
// 		&checkio.CheckinLatitude,
// 		&checkio.CheckinLongitude,
// 		&checkio.CheckoutLatitude,
// 		&checkio.CheckoutLongitude,
// 		&checkio.CheckinAddress,
// 		&checkio.CheckoutAddress,
// 		&checkio.Device,
// 		&checkio.ShiftID,
// 		&checkio.WorkStatus,
// 		&checkio.LeaveStatus,
// 		&checkio.CreatedAt,
// 		&checkio.UpdatedAt,
// 	)
	
// 	if err == sql.ErrNoRows {
// 		return nil, fmt.Errorf("attendance record not found")
// 	}
// 	if err != nil {
// 		return nil, err
// 	}
	
// 	return &checkio, nil
// }
func (r *AttendanceRepository) GetAttendanceHistory(filter models.AttendanceHistoryFilter, departmentID *int) ([]models.AttendanceHistoryResponse, int, error) {
	// Default pagination
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}
	
	offset := (filter.Page - 1) * filter.PageSize
	
	// Build WHERE clause
	whereClauses := []string{}
	args := []interface{}{}
	argID := 1
    
	// Department filter (for Trưởng phòng)
	if departmentID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("u.department_id = $%d", argID))
		args = append(args, *departmentID)
		argID++
	}
	
	// User filter
	if filter.UserID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.user_id = $%d", argID))
		args = append(args, *filter.UserID)
		argID++
	}
	
	// Date range filter
	if filter.FromDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.day >= $%d", argID))
		args = append(args, *filter.FromDate)
		argID++
	}
	
	if filter.ToDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.day <= $%d", argID))
		args = append(args, *filter.ToDate)
		argID++
	}
	
	// Work status filter
	if filter.Status != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.work_status = $%d", argID))
		args = append(args, *filter.Status)
		argID++
	}
	
	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}
	
	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM CheckIO c
		INNER JOIN users u ON c.user_id = u.id
		%s`, whereClause)
	
	var total int
	err := r.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}
	
	// Get paginated data
	args = append(args, filter.PageSize, offset)
	
	dataQuery := fmt.Sprintf(`
		SELECT 
			c.id,
			c.user_id,
			u.name as user_name,
			c.day,
			c.checkin_time,
			c.checkout_time,
			c.work_status,
			c.leave_status,
			s.name as shift_name
		FROM CheckIO c
		INNER JOIN users u ON c.user_id = u.id
		LEFT JOIN shifts s ON c.shift_id = s.id
		%s
		ORDER BY c.day DESC, u.name
		LIMIT $%d OFFSET $%d`, whereClause, argID, argID+1)
	
	rows, err := r.db.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	
	var attendances []models.AttendanceHistoryResponse
	for rows.Next() {
		var att models.AttendanceHistoryResponse
		err := rows.Scan(
			&att.ID,
			&att.UserID,
			&att.UserName,
			&att.Day,
			&att.CheckinTime,
			&att.CheckoutTime,
			&att.WorkStatus,
			&att.LeaveStatus,
			&att.ShiftName,
		)
		if err != nil {
			return nil, 0, err
		}
		attendances = append(attendances, att)
	}
	
	return attendances, total, nil
}
// AttendanceRepository
func (r *AttendanceRepository) IsUserInDepartment(
    userID int,
    departmentID int,
) (bool, error) {

    var exists bool
    err := r.db.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM users
            WHERE id = $1 AND department_id = $2
        )
    `, userID, departmentID).Scan(&exists)

    if err != nil {
        return false, err
    }

    return exists, nil
}

func (r *AttendanceRepository) GetMonthlyAttendanceSummary(
    ctx context.Context,
    year int,
    month int,
    departmentID *int,
) ([]MonthlyAttendanceSummary, error) {

    query := `WITH days_in_month AS (
    SELECT generate_series(
        date_trunc('month', make_date($1, $2, 1)),
        (date_trunc('month', make_date($1, $2, 1)) + interval '1 month - 1 day')::date,
        interval '1 day'
    )::date AS day
)
SELECT
    u.id AS user_id,
    u.name AS user_name,
    d.name AS department_name,

    COUNT(DISTINCT dim.day) AS total_days,

   COUNT(DISTINCT c.day) FILTER (
    WHERE c.work_status IN ('ON_TIME', 'LATE')
     
      AND c.checkin_time IS NOT NULL
      AND c.checkout_time IS NOT NULL
) AS working_days,


    COUNT(DISTINCT dim.day) FILTER (
    WHERE lr.id IS NOT NULL
) AS leave_days,


  COUNT(DISTINCT dim.day)
- COUNT(DISTINCT c.day) FILTER (
    WHERE c.work_status IN ('ON_TIME', 'LATE')
      AND c.leave_status = 'NONE'
      AND c.checkin_time IS NOT NULL
      AND c.checkout_time IS NOT NULL
)
- COUNT(DISTINCT dim.day) FILTER (
    WHERE lr.id IS NOT NULL
) AS absent_days
,

    COUNT(DISTINCT c.day) FILTER (
        WHERE c.work_status = 'LATE'
    ) AS late_days

FROM users u
LEFT JOIN department d ON d.id = u.department_id
CROSS JOIN days_in_month dim
LEFT JOIN CheckIO c
    ON c.user_id = u.id AND c.day = dim.day
LEFT JOIN LeaveRequest lr
    ON lr.user_id = u.id
   AND lr.status = 'DA_DUYET'
   AND dim.day BETWEEN lr.from_date AND lr.to_date

WHERE u.role = 'Nhân viên'
  AND u.status = 'Hoạt động'
  AND ($3::int IS NULL OR u.department_id = $3::int)

GROUP BY u.id, u.name, d.name
ORDER BY u.name;
`

    rows, err := r.db.QueryContext(ctx, query, year, month, departmentID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var results []MonthlyAttendanceSummary

    for rows.Next() {
        var s MonthlyAttendanceSummary
        err := rows.Scan(
            &s.UserID,
            &s.UserName,
            &s.DepartmentName,
            &s.TotalDays,
            &s.WorkingDays,
            &s.LeaveDays,
            &s.AbsentDays,
            &s.LateDays,
        )
        if err != nil {
            return nil, err
        }
        results = append(results, s)
    }

    return results, nil
}
