package repository

import (
	"attendance-system/internal/models"
	"database/sql"
)

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
    user := &models.User{}
    err := r.db.QueryRow(`
        SELECT id, name, email, date_of_birth, address, gender, phone_number, 
               password, role, department_id, status, created_at
        FROM users WHERE email = $1 
    `, email).Scan(
        &user.ID, &user.Name, &user.Email, &user.DateOfBirth, &user.Address,
        &user.Gender, &user.PhoneNumber, &user.Password, &user.Role,
        &user.DepartmentID, &user.Status, &user.CreatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return user, err
}

// GetUserByID returns User model for update operations
func (r *UserRepository) GetUserByID(id int) (*models.User, error) {
    user := &models.User{}
    err := r.db.QueryRow(`
        SELECT id, name, email, date_of_birth, address, gender, phone_number, 
               password, role, department_id, status, created_at, updated_at
        FROM users WHERE id = $1 
    `, id).Scan(
        &user.ID, &user.Name, &user.Email, &user.DateOfBirth, &user.Address,
        &user.Gender, &user.PhoneNumber, &user.Password, &user.Role,
        &user.DepartmentID, &user.Status, &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return user, err
}

// GetByID returns UserResponse for API responses
func (r *UserRepository) GetByID(id int) (*models.UserResponse, error) {
    user := &models.UserResponse{}
    var dob, address, gender, phone sql.NullString
    var deptID sql.NullInt64
    var deptName sql.NullString
    
    err := r.db.QueryRow(`
        SELECT u.id, u.name, u.email, u.date_of_birth, u.address, u.gender, 
               u.phone_number, u.role, u.department_id, u.status, u.created_at,
               d.name as department_name
        FROM users u
        LEFT JOIN department d ON u.department_id = d.id
        WHERE u.id = $1
    `, id).Scan(
        &user.ID, &user.Name, &user.Email, &dob, &address, &gender,
        &phone, &user.Role, &deptID, &user.Status, &user.CreatedAt, &deptName,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    
    if dob.Valid {
        user.DateOfBirth = &dob.String
    }
    if address.Valid {
        user.Address = &address.String
    }
    if gender.Valid {
        user.Gender = &gender.String
    }
    if phone.Valid {
        user.PhoneNumber = &phone.String
    }
    if deptID.Valid {
        id := int(deptID.Int64)
        user.DepartmentID = &id
    }
    if deptName.Valid {
        user.DepartmentName = &deptName.String
    }
    
    return user, nil
}
//hàm lấy danh sách user theo phòng ban
func (r *UserRepository) GetByDepartment(departmentID int, limit, offset int) ([]*models.UserResponse, int, error) {
    // Get total count
    var total int
    err := r.db.QueryRow(`
        SELECT COUNT(*) FROM users WHERE department_id = $1
    `, departmentID).Scan(&total)
    if err != nil {
        return nil, 0, err
    }
    
    // Get users
    rows, err := r.db.Query(`
        SELECT u.id, u.name, u.email, u.role, u.department_id, u.status, u.created_at,
               d.name as department_name
        FROM users u
        LEFT JOIN department d ON u.department_id = d.id
        WHERE u.department_id = $1
        ORDER BY u.created_at DESC
        LIMIT $2 OFFSET $3
    `, departmentID, limit, offset)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()
    
    users := make([]*models.UserResponse, 0)
    for rows.Next() {
        user := &models.UserResponse{}
        var deptID sql.NullInt64
        var deptName sql.NullString
        
        err := rows.Scan(
            &user.ID, &user.Name, &user.Email, &user.Role,
            &deptID, &user.Status, &user.CreatedAt, &deptName,
        )
        if err != nil {
            return nil, 0, err
        }
        
        if deptID.Valid {
            id := int(deptID.Int64)
            user.DepartmentID = &id
        }
        if deptName.Valid {
            user.DepartmentName = &deptName.String
        }
        
        users = append(users, user)
    }
    
    return users, total, nil
}

func (r *UserRepository) GetAll(limit, offset int) ([]*models.UserResponse, int, error) {
    var total int
    err := r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&total)
    if err != nil {
        return nil, 0, err
    }
    
    rows, err := r.db.Query(`
        SELECT u.id, u.name, u.email, u.role, u.department_id, u.status, u.created_at,
               d.name as department_name
        FROM users u
        LEFT JOIN department d ON u.department_id = d.id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
    `, limit, offset)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()
    
    users := make([]*models.UserResponse, 0)
    for rows.Next() {
        user := &models.UserResponse{}
        var deptID sql.NullInt64
        var deptName sql.NullString
        
        err := rows.Scan(
            &user.ID, &user.Name, &user.Email, &user.Role,
            &deptID, &user.Status, &user.CreatedAt, &deptName,
        )
        if err != nil {
            return nil, 0, err
        }
        
        if deptID.Valid {
            id := int(deptID.Int64)
            user.DepartmentID = &id
        }
        if deptName.Valid {
            user.DepartmentName = &deptName.String
        }
        
        users = append(users, user)
    }
    
    return users, total, nil
}

func (r *UserRepository) UserUpdateProfile(user *models.User) error {
    _, err := r.db.Exec(`
        UPDATE users 
        SET name = $1, email = $2, date_of_birth = $3, address = $4, 
            gender = $5, phone_number = $6, role = $7, department_id = $8,
            status = $9, updated_at = NOW()
        WHERE id = $10
    `, user.Name, user.Email, user.DateOfBirth, user.Address, user.Gender,
        user.PhoneNumber, user.Role, user.DepartmentID, user.Status, user.ID)
    return err
}

func (r *UserRepository) Create(user *models.User) error {
    err := r.db.QueryRow(`
        INSERT INTO users (name, email, password, role, department_id, status, phone_number, date_of_birth, address, gender)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at
    `, user.Name, user.Email, user.Password, user.Role, user.DepartmentID, user.Status, 
       user.PhoneNumber, user.DateOfBirth, user.Address, user.Gender).Scan(&user.ID, &user.CreatedAt)
    return err
}

func (r *UserRepository) Update(user *models.User) error {
    _, err := r.db.Exec(`
        UPDATE users 
        SET name = $1, email = $2, date_of_birth = $3, address = $4, 
            gender = $5, phone_number = $6, role = $7, department_id = $8,
            status = $9, updated_at = NOW()
        WHERE id = $10
    `, user.Name, user.Email, user.DateOfBirth, user.Address, user.Gender,
        user.PhoneNumber, user.Role, user.DepartmentID, user.Status, user.ID)
    return err
}
//hàm xóa user
func (r *UserRepository) Delete(userID int) error {
    _, err := r.db.Exec(`DELETE FROM users WHERE id = $1`, userID)
    return err
}