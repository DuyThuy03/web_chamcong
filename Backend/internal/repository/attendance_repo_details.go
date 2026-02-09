package repository

import (
	"context"
)

func (r *AttendanceRepository) GetMonthlyDailyDetails(
    ctx context.Context,
    year int,
    month int,
    departmentID *int,
) ([]DailyAttendanceDetailRow, error) {
    query := `
    WITH days_in_month AS (
        SELECT generate_series(
            date_trunc('month', make_date($1, $2, 1)),
            (date_trunc('month', make_date($1, $2, 1)) + interval '1 month - 1 day')::date,
            interval '1 day'
        )::date AS day
    )
    SELECT 
        u.id as user_id,
        d.day,
        COALESCE(c.work_unit,
            CASE 
                WHEN c.checkin_time IS NOT NULL AND c.checkout_time IS NOT NULL THEN
                    CASE 
                         -- 0=Sunday, 6=Saturday
                        WHEN EXTRACT(DOW FROM d.day) = 0 THEN 0 
                        WHEN EXTRACT(DOW FROM d.day) = 6 THEN
                            CASE 
                                WHEN (
                                     EXTRACT(EPOCH FROM (c.checkout_time - c.checkin_time)) - 
                                     CASE 
                                         WHEN c.checkin_time::time < '13:30:00'::time AND c.checkout_time::time > '12:00:00'::time THEN
                                             EXTRACT(EPOCH FROM (
                                                  LEAST(c.checkout_time::time, '13:30:00'::time) - GREATEST(c.checkin_time::time, '12:00:00'::time)
                                             ))
                                         ELSE 0
                                     END
                                ) / 3600.0 >= 4 THEN 0.5
                                WHEN (
                                     EXTRACT(EPOCH FROM (c.checkout_time - c.checkin_time)) - 
                                     CASE 
                                         WHEN c.checkin_time::time < '13:30:00'::time AND c.checkout_time::time > '12:00:00'::time THEN
                                             EXTRACT(EPOCH FROM (
                                                  LEAST(c.checkout_time::time, '13:30:00'::time) - GREATEST(c.checkin_time::time, '12:00:00'::time)
                                             ))
                                         ELSE 0
                                     END
                                ) / 3600.0 >= 2 THEN 0.25
                                ELSE 0.0
                            END
                        ELSE -- Weekdays
                             CASE 
                                WHEN (
                                     EXTRACT(EPOCH FROM (c.checkout_time - c.checkin_time)) - 
                                     CASE 
                                         WHEN c.checkin_time::time < '13:30:00'::time AND c.checkout_time::time > '12:00:00'::time THEN
                                             EXTRACT(EPOCH FROM (
                                                  LEAST(c.checkout_time::time, '13:30:00'::time) - GREATEST(c.checkin_time::time, '12:00:00'::time)
                                             ))
                                         ELSE 0
                                     END
                                ) / 3600.0 >= 8 THEN 1.0
                                WHEN (
                                     EXTRACT(EPOCH FROM (c.checkout_time - c.checkin_time)) - 
                                     CASE 
                                         WHEN c.checkin_time::time < '13:30:00'::time AND c.checkout_time::time > '12:00:00'::time THEN
                                             EXTRACT(EPOCH FROM (
                                                  LEAST(c.checkout_time::time, '13:30:00'::time) - GREATEST(c.checkin_time::time, '12:00:00'::time)
                                             ))
                                         ELSE 0
                                     END
                                ) / 3600.0 >= 4 THEN 0.5
                                ELSE 0.0
                            END
                    END
                ELSE NULL
            END
        ) as work_unit,
        c.work_status,
        c.checkin_type,
        c.factory_name,
        c.note,
        (SELECT type FROM leaverequest lr WHERE lr.user_id = u.id AND d.day BETWEEN lr.from_date AND lr.to_date AND lr.status = 'DA_DUYET' LIMIT 1) as leave_type,
        (SELECT paid FROM leaverequest lr WHERE lr.user_id = u.id AND d.day BETWEEN lr.from_date AND lr.to_date AND lr.status = 'DA_DUYET' LIMIT 1) as is_paid_leave,
        (SELECT SUM(total_hours) FROM overtime o WHERE o.user_id = u.id AND o.day = d.day AND o.status = 'DA_DUYET') as ot_hours,
        (SELECT SUM(total_hours * COALESCE(adjusted_rate, base_rate, 1)) FROM overtime o WHERE o.user_id = u.id AND o.day = d.day AND o.status = 'DA_DUYET') as ot_weighted
    FROM users u
    CROSS JOIN days_in_month d
    LEFT JOIN CheckIO c ON u.id = c.user_id AND c.day = d.day AND c.is_valid = TRUE
    WHERE u.role = 'Nhân viên' AND u.status = 'Hoạt động'
    AND ($3::int IS NULL OR u.department_id = $3::int)
    ORDER BY u.id, d.day
    `

    rows, err := r.db.QueryContext(ctx, query, year, month, departmentID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var results []DailyAttendanceDetailRow
    for rows.Next() {
        var row DailyAttendanceDetailRow
        err := rows.Scan(
            &row.UserID,
            &row.Day,
            &row.WorkUnit,
            &row.WorkStatus,
            &row.CheckinType,
            &row.FactoryName,
            &row.Note,
            &row.LeaveType,
            &row.IsPaidLeave,
            &row.OTHours,
            &row.OTWeighted,
        )
        if err != nil {
            return nil, err
        }
        results = append(results, row)
    }
    return results, nil
}
