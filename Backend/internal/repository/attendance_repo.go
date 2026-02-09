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
    UserID                int
    UserName              string
    DepartmentName        string
    TotalDays             int
    TotalStandardWorkDays float64
    TotalOTHours          float64
    TotalPaidLeaveDays    float64
    TotalWorkDays         float64
    AbsentDays            float64
    LateDays              int
    BaseSalary            float64
    TotalBaseSalary       float64
    TotalOTSalary         float64
    TotalSalary           float64
}

type DailyAttendanceDetailRow struct {
    UserID       int
    Day          time.Time
    WorkUnit     sql.NullFloat64
    WorkStatus   sql.NullString
    CheckinType  sql.NullString
    FactoryName  sql.NullString
    Note         sql.NullString
    LeaveType    sql.NullString
    OTHours      sql.NullFloat64
    IsPaidLeave  sql.NullBool
    OTWeighted   sql.NullFloat64
}

func NewAttendanceRepository(db *sql.DB, baseURL string) *AttendanceRepository {
    return &AttendanceRepository{
        db:      db,
        baseURL: baseURL,
    }
}

func (r *AttendanceRepository) convertPathToURL(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http") {
		return path
	}
	
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
                            device, shift_id, work_status, leave_status, checkin_type, factory_name, note,
                            work_hours, work_unit, is_valid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id
    `, checkIO.UserID, checkIO.Day, checkIO.CheckinTime, checkIO.CheckinImage,
        checkIO.CheckinLatitude, checkIO.CheckinLongitude, checkIO.CheckinAddress,
        checkIO.Device, checkIO.ShiftID, checkIO.WorkStatus, checkIO.LeaveStatus,
        checkIO.CheckinType, checkIO.FactoryName, checkIO.Note,
        checkIO.WorkHours, checkIO.WorkUnit, checkIO.IsValid,
    ).Scan(&checkIO.ID)
}

func (r *AttendanceRepository) Update(checkIO *models.CheckIO) error {
    _, err := r.db.Exec(`
        UPDATE CheckIO 
        SET 
         checkout_time = $1,
         checkout_image = $2,
         checkout_latitude = $3, checkout_longitude = $4, checkout_address = $5,
         checkin_type = $6, factory_name = $7,
         note = $8,
         work_hours = $9, work_unit = $10, 
         is_valid = $11,
         updated_at = NOW()
        WHERE id = $12
    `, 
    checkIO.CheckoutTime, 
    checkIO.CheckoutImage,
    checkIO.CheckoutLatitude, checkIO.CheckoutLongitude, checkIO.CheckoutAddress,
    checkIO.CheckinType, checkIO.FactoryName,
    checkIO.Note,
    checkIO.WorkHours, checkIO.WorkUnit, 
    checkIO.IsValid, 
    checkIO.ID)
    return err
}

func (r *AttendanceRepository) GetByUserAndDay(userID int, day time.Time) (*models.CheckIO, error) {
    checkIO := &models.CheckIO{}
    err := r.db.QueryRow(`
        SELECT id, user_id, day, checkin_time, checkout_time,
               checkin_image, checkout_image, checkin_latitude, checkin_longitude,
               checkout_latitude, checkout_longitude, checkin_address, checkout_address,
               device, shift_id, work_status, leave_status, checkin_type, factory_name, note,
               work_hours, work_unit, is_valid, created_at
        FROM CheckIO WHERE user_id = $1 AND day = $2
    `, userID, day).Scan(
        &checkIO.ID, &checkIO.UserID, &checkIO.Day,
        &checkIO.CheckinTime, &checkIO.CheckoutTime,
        &checkIO.CheckinImage, &checkIO.CheckoutImage,
        &checkIO.CheckinLatitude, &checkIO.CheckinLongitude,
        &checkIO.CheckoutLatitude, &checkIO.CheckoutLongitude,
        &checkIO.CheckinAddress, &checkIO.CheckoutAddress,
        &checkIO.Device, &checkIO.ShiftID, &checkIO.WorkStatus,
        &checkIO.LeaveStatus, &checkIO.CheckinType, &checkIO.FactoryName, &checkIO.Note,
        &checkIO.WorkHours, &checkIO.WorkUnit, &checkIO.IsValid, &checkIO.CreatedAt,
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
               c.work_status, c.leave_status, c.checkin_type, c.factory_name, c.note, c.work_unit
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
        &resp.WorkStatus, &resp.LeaveStatus, &resp.CheckinType, &resp.FactoryName, &resp.Note, &resp.WorkUnit,
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
               c.work_status, c.leave_status, c.checkin_type, c.factory_name, c.note, c.work_unit, c.work_hours
        FROM CheckIO c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN department d ON u.department_id = d.id
        LEFT JOIN shifts s ON c.shift_id = s.id
        WHERE c.day BETWEEN $1 AND $2
    `

// ... (lines 186-225 skipped for brevity in replacement, but wait, I can only replace block)
// I must replace the query definition AND the scan usage.
// Since they are far apart (lines 173 and 237), I should use MULTI replace or handle them carefully.
// But the tool is `replace_file_content`.
// I will split this into TWO edits or ONE big block if contiguous? No, they are separated by ~50 lines.
// I will use `replace_file_content` for Query first, then Scan.
// Wait, I can't do multiple replace calls in one step, but I can check if I can include all context.
// No, too large.
// I'll do Query update first.

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
            &resp.WorkStatus, &resp.LeaveStatus, &resp.CheckinType, &resp.FactoryName, &resp.Note, &resp.WorkUnit, &resp.WorkHours,
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
			c.leave_status,
            c.checkin_type, c.factory_name, c.note
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
            &resp.CheckinType, &resp.FactoryName, &resp.Note,
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
			c.leave_status,
            c.checkin_type, c.factory_name, c.note
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
            &resp.CheckinType, &resp.FactoryName, &resp.Note,
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

    query := `
    WITH days_in_month AS (
        SELECT generate_series(
            date_trunc('month', make_date($1, $2, 1)),
            (date_trunc('month', make_date($1, $2, 1)) + interval '1 month - 1 day')::date,
            interval '1 day'
        )::date AS day
    ),
    raw_work_data AS (
        SELECT 
           user_id,
           work_status,
           day,
           work_unit,
           EXTRACT(DOW FROM day) as day_of_week, -- 0=Sunday, 6=Saturday
           (
             EXTRACT(EPOCH FROM (checkout_time - checkin_time)) - 
             CASE 
                 WHEN checkin_time::time < '13:30:00'::time AND checkout_time::time > '12:00:00'::time THEN
                     EXTRACT(EPOCH FROM (
                          LEAST(checkout_time::time, '13:30:00'::time) - GREATEST(checkin_time::time, '12:00:00'::time)
                     ))
                 ELSE 0
             END
           ) / 3600.0 as effective_hours
        FROM CheckIO
        WHERE EXTRACT(YEAR FROM day) = $1 AND EXTRACT(MONTH FROM day) = $2
        AND is_valid = TRUE
        AND (
            (checkin_time IS NOT NULL AND (checkout_time IS NOT NULL OR work_unit IS NOT NULL))
            OR
            (work_unit IS NOT NULL)
        )
    ),
    work_data AS (
       SELECT user_id, 
              SUM(
                COALESCE(work_unit,
                    CASE 
                        WHEN day_of_week = 0 THEN 0 -- Sunday, no standard work counted typically, or OT only
                        WHEN day_of_week = 6 THEN -- Saturday
                            CASE 
                                WHEN effective_hours >= 4 THEN 0.5 -- Full Saturday shift (morning)
                                WHEN effective_hours >= 2 THEN 0.25 -- Partial
                                ELSE 0.0
                            END
                        ELSE -- Weekdays
                             CASE 
                                WHEN effective_hours >= 8 THEN 1.0
                                WHEN effective_hours >= 4 THEN 0.5
                                ELSE 0.0
                            END
                    END
                )
              ) as total_standard_work,
              COUNT(*) FILTER (WHERE effective_hours >= 4) as attended_days,
              COUNT(*) FILTER (WHERE work_status = 'LATE') as late_count
       FROM raw_work_data
       GROUP BY user_id
    ),
    ot_data AS (
       SELECT user_id, SUM(total_hours * COALESCE(adjusted_rate, base_rate, 1)) as total_ot_hours_weighted
       FROM overtime
       WHERE EXTRACT(YEAR FROM day) = $1 AND EXTRACT(MONTH FROM day) = $2
       AND status = 'DA_DUYET'
       GROUP BY user_id
    ),
    ot_raw_hours AS (
       SELECT user_id, SUM(total_hours) as total_ot_hours_raw
       FROM overtime
       WHERE EXTRACT(YEAR FROM day) = $1 AND EXTRACT(MONTH FROM day) = $2
       AND status = 'DA_DUYET'
       GROUP BY user_id
    ),
    leave_data AS (
        SELECT 
            lr.user_id, 
            COUNT(d.day) as paid_leave_days,
            COUNT(d.day) FILTER (WHERE d.day <= CURRENT_DATE) as passed_paid_leave_days
        FROM LeaveRequest lr
        JOIN days_in_month d ON d.day BETWEEN lr.from_date AND lr.to_date
        WHERE lr.status = 'DA_DUYET' AND lr.paid = TRUE
        GROUP BY lr.user_id
    ),
    month_stats AS (
        SELECT 
            COUNT(*) as total_days_raw,
            SUM(
                CASE 
                    WHEN EXTRACT(DOW FROM day) = 0 THEN 0   -- Sunday
                    WHEN EXTRACT(DOW FROM day) = 6 THEN 0.5 -- Saturday
                    ELSE 1.0                                -- Weekday
                END
            ) as total_weighted_work_days,
            SUM(
                CASE 
                    WHEN day <= CURRENT_DATE THEN
                        CASE 
                            WHEN EXTRACT(DOW FROM day) = 0 THEN 0
                            WHEN EXTRACT(DOW FROM day) = 6 THEN 0.5
                            ELSE 1.0
                        END
                    ELSE 0
                END
            ) as total_weighted_passed_days
        FROM days_in_month
    )
    SELECT 
        u.id, 
        u.name, 
        d.name,
        (SELECT total_days_raw FROM month_stats) as days_in_month,
        COALESCE(w.total_standard_work, 0),
        COALESCE(o.total_ot_hours_weighted, 0),
        COALESCE(ld.paid_leave_days, 0),
        (COALESCE(w.total_standard_work, 0) + COALESCE(ld.paid_leave_days, 0)) as total_work_days,
        CAST(GREATEST(0, ROUND((SELECT total_weighted_passed_days FROM month_stats) - COALESCE(w.total_standard_work, 0) - COALESCE(ld.passed_paid_leave_days, 0))) AS INTEGER) as absent_days_weighted, -- Logic check needed here, absent days usually integer
        COALESCE(w.late_count, 0),
        COALESCE(u.base_salary, 0),
        
        -- Total Base Salary (Base is Daily Salary)
        (COALESCE(u.base_salary, 0) * (COALESCE(w.total_standard_work, 0) + COALESCE(ld.paid_leave_days, 0))) as total_base_salary,

        -- Total OT Salary = (Base / 8) * WeightedOTHours (Converted Hours)
        ((COALESCE(u.base_salary, 0) / 8.0) * COALESCE(o.total_ot_hours_weighted, 0)) as total_ot_salary,

        -- Total Salary Sum
        (
            (COALESCE(u.base_salary, 0) * (COALESCE(w.total_standard_work, 0) + COALESCE(ld.paid_leave_days, 0)))
            +
            ((COALESCE(u.base_salary, 0) / 8.0) * COALESCE(o.total_ot_hours_weighted, 0))
        ) as final_total_salary

    FROM users u
    LEFT JOIN department d ON d.id = u.department_id
    LEFT JOIN work_data w ON u.id = w.user_id
    LEFT JOIN ot_data o ON u.id = o.user_id
    LEFT JOIN ot_raw_hours orh ON u.id = orh.user_id
    LEFT JOIN leave_data ld ON u.id = ld.user_id
    WHERE u.role = 'Nhân viên' AND u.status = 'Hoạt động'
    AND ($3::int IS NULL OR u.department_id = $3::int)
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
        var deptName sql.NullString // Handle potential null department
        err := rows.Scan(
            &s.UserID,
            &s.UserName,
            &deptName,
            &s.TotalDays,
            &s.TotalStandardWorkDays,
            &s.TotalOTHours,
            &s.TotalPaidLeaveDays,
            &s.TotalWorkDays,
            &s.AbsentDays,
            &s.LateDays,
			&s.BaseSalary,
			&s.TotalBaseSalary,
			&s.TotalOTSalary,
			&s.TotalSalary,
        )
        if err != nil {
            return nil, err
        }
        if deptName.Valid {
            s.DepartmentName = deptName.String
        }
        results = append(results, s)
    }

    return results, nil
}

func (r *AttendanceRepository) GetCheckIOByID(id int) (*models.CheckIO, error) {
    checkIO := &models.CheckIO{}
    err := r.db.QueryRow(`
        SELECT id, user_id, day, checkin_time, checkout_time,
               checkin_image, checkout_image, checkin_latitude, checkin_longitude,
               checkout_latitude, checkout_longitude, checkin_address, checkout_address,
               device, shift_id, work_status, leave_status, checkin_type, factory_name, note,
               work_hours, work_unit, is_valid, created_at, updated_at
        FROM CheckIO WHERE id = $1
    `, id).Scan(
        &checkIO.ID, &checkIO.UserID, &checkIO.Day,
        &checkIO.CheckinTime, &checkIO.CheckoutTime,
        &checkIO.CheckinImage, &checkIO.CheckoutImage,
        &checkIO.CheckinLatitude, &checkIO.CheckinLongitude,
        &checkIO.CheckoutLatitude, &checkIO.CheckoutLongitude,
        &checkIO.CheckinAddress, &checkIO.CheckoutAddress,
        &checkIO.Device, &checkIO.ShiftID, &checkIO.WorkStatus,
        &checkIO.LeaveStatus, &checkIO.CheckinType, &checkIO.FactoryName, &checkIO.Note,
        &checkIO.WorkHours, &checkIO.WorkUnit, &checkIO.IsValid, 
        &checkIO.CreatedAt, &checkIO.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil // Return nil if not found
    }
	if err != nil {
		return nil, err
	}
	return checkIO, nil
}

func (r *AttendanceRepository) InsertEditHistory(history models.AttendanceEditHistory) error {
	_, err := r.db.Exec(`
		INSERT INTO attendance_edit_history (checkin_id, editor_id, old_values, new_values, change_reason)
		VALUES ($1, $2, $3, $4, $5)
	`, history.CheckinID, history.EditorID, history.OldValues, history.NewValues, history.ChangeReason)
	return err
}

func (r *AttendanceRepository) GetEditHistory(checkinID int) ([]models.AttendanceEditHistory, error) {
	rows, err := r.db.Query(`
		SELECT h.id, h.checkin_id, h.editor_id, u.name as editor_name, 
			   h.old_values, h.new_values, h.change_reason, h.created_at
		FROM attendance_edit_history h
		JOIN users u ON h.editor_id = u.id
		WHERE h.checkin_id = $1
		ORDER BY h.created_at DESC
	`, checkinID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.AttendanceEditHistory
	for rows.Next() {
		var h models.AttendanceEditHistory
		var changeReason sql.NullString
		// Scan directly into the fields. lib/pq handles JSON/JSONB as []byte which fits json.RawMessage
		if err := rows.Scan(&h.ID, &h.CheckinID, &h.EditorID, &h.EditorName, 
							&h.OldValues, &h.NewValues, &changeReason, &h.CreatedAt); err != nil {
			return nil, err
		}
		if changeReason.Valid {
			h.ChangeReason = changeReason.String
		}
		history = append(history, h)
	}
	return history, nil
}
