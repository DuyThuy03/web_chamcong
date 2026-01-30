package repository

func (r *LeaveRequestRepository) GetStatusCounts(userID int, role string, deptID *int) (map[string]int, error) {
	counts := map[string]int{
		"ALL":       0,
		"CHO_DUYET": 0,
		"DA_DUYET":  0,
		"TU_CHOI":   0,
		"DA_HUY":    0,
	}

	var query string
	var args []interface{}

	// Construct Base Query
	query = "SELECT status, COUNT(*) FROM LeaveRequest WHERE 1=1"

	// Role-based filtering (Same as GetAll)
	if role == "Nhân viên" {
		query += " AND user_id = ?"
		args = append(args, userID)
	} else if role == "Quản lý" {
		// Manager sees all requests
	} else if role == "Trưởng phòng" {
		// Department Head sees only their department employees
		query += ` AND user_id IN (
			SELECT id FROM users WHERE department_id = ?
		)`
		if deptID != nil {
			args = append(args, *deptID)
		} else {
			// Fallback: get deptID from user (though caller should have provided it)
			var dID int
			err := r.db.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&dID)
			if err == nil {
				args = append(args, dID)
			} else {
				// If error or no dept, maybe just return empty or error?
				// For safety, let's treat as 0 results if no dept found
				return counts, nil 
			}
		}
	}

	query += " GROUP BY status"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	total := 0
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		counts[status] = count
		total += count
	}

	counts["ALL"] = total
	return counts, nil
}
