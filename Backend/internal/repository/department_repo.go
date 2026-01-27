package repository

import (
	"database/sql"

	"attendance-system/internal/models"
)

type DepartmentRepository struct {
	db *sql.DB
}

func NewDepartmentRepository(db *sql.DB) *DepartmentRepository {
	return &DepartmentRepository{db: db}
}

func (r *DepartmentRepository) GetAll() ([]models.Department, error) {
	query := `
		SELECT d.id, d.name, d.leader_id, d.created_at, d.updated_at
		FROM department d
		LEFT JOIN users u ON d.leader_id = u.id
		ORDER BY d.name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var departments []models.Department
	for rows.Next() {
		var dept models.Department
		err := rows.Scan(
			&dept.ID,
			&dept.Name,
			&dept.LeaderID,
			
			&dept.CreatedAt,
			&dept.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		departments = append(departments, dept)
	}

	return departments, nil
}


func (r *DepartmentRepository) GetByID(id int) (*models.Department, error) {
	query := `
		SELECT d.id, d.name, d.leader_id, d.created_at, d.updated_at
		FROM department d
		LEFT JOIN users u ON d.leader_id = u.id
		WHERE d.id = $1
	`

	var dept models.Department
	err := r.db.QueryRow(query, id).Scan(
		&dept.ID,
		&dept.Name,
		&dept.LeaderID,
	
		&dept.CreatedAt,
		&dept.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &dept, nil
}
//hàm lấy danh sách nhân viên theo phòng ban

func (r *DepartmentRepository) GetUsersByDepartmentID(deptID int, limit, offset int) ([]models.User, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM users WHERE department_id = $1`
	err := r.db.QueryRow(countQuery, deptID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get users
	query := `
		SELECT u.id, u.email, u.full_name, u.role, u.department_id, 
		       d.name as department_name, u.shift_id, s.name as shift_name,
		       u.phone, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		LEFT JOIN shifts s ON u.shift_id = s.id
		WHERE u.department_id = $1
		ORDER BY u.full_name
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, deptID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.Role,
			&user.DepartmentID,
			&user.Gender,
			&user.PhoneNumber,
			&user.Status,
			&user.DateOfBirth,
			&user.Address,
		
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, nil
}
//Lấy trạng thái điểm danh  của phòng ban

	