package services

import (
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"
	"database/sql"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

// CreateUser - Tạo user mới
func (s *UserService) CreateUser(
	auth *models.AuthContext,
	req *models.CreateUserRequest,
) (*models.User, error) {

	// 1. Check email
	existingUser, err := s.userRepo.GetByEmail(req.Email)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if existingUser != nil {
		return nil, fmt.Errorf("email đã tồn tại")
	}

	// 2. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("lỗi mã hóa mật khẩu: %v", err)
	}

	// 3. Tạo user cơ bản
	user := &models.User{
    Name:     req.Name,
    Email:    req.Email,
    Password: hashedPassword,
    Role:     "Nhân viên",
    Status:   "Hoạt động",
}

// 4. GÁN DEPARTMENT THEO ROLE
switch auth.Role {

case "Trưởng phòng":
    user.DepartmentID = sql.NullInt64{
        Int64: int64(auth.DepartmentID),
        Valid: true,
    }

case "Quản lý", "Giám đốc":
    if req.DepartmentID == nil {
        return nil, fmt.Errorf("phải chọn phòng ban")
    }
    user.DepartmentID = sql.NullInt64{
        Int64: int64(*req.DepartmentID),
        Valid: true,
    }

default:
    return nil, fmt.Errorf("không có quyền tạo thành viên")
}
	// 5. Optional fields
	if req.DateOfBirth != nil {
		if parsedDate, err := time.Parse("2006-01-02", *req.DateOfBirth); err == nil {
			user.DateOfBirth.Time = parsedDate
			user.DateOfBirth.Valid = true
		}
	}

	if req.Address != nil {
		user.Address.String = *req.Address
		user.Address.Valid = true
	}

	if req.Gender != nil {
		user.Gender.String = *req.Gender
		user.Gender.Valid = true
	}

	if req.PhoneNumber != nil {
		user.PhoneNumber.String = *req.PhoneNumber
		user.PhoneNumber.Valid = true
	}

	// 6. Save DB
	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("lỗi khi tạo user: %v", err)
	}

	return user, nil
}


// UpdateUser - Cập nhật user
func (s *UserService) UpdateUser(userID int, req *models.UpdateUserRequest, role string) error {
	// Lấy user hiện tại
	existingUser, err := s.userRepo.GetUserByID(userID)
	if err != nil || existingUser == nil {
		return fmt.Errorf("không tìm thấy user")
	}

	// Kiểm tra email nếu có thay đổi
	if req.Email != nil && *req.Email != existingUser.Email {
		checkUser, _ := s.userRepo.GetByEmail(*req.Email)
		if checkUser != nil {
			return fmt.Errorf("email đã tồn tại")
		}
	}

	// Build user object để update
	user := &models.User{
		ID:           userID,
		Name:         existingUser.Name,
		Email:        existingUser.Email,
		Password:     existingUser.Password,
		Role:         existingUser.Role,
		DepartmentID: existingUser.DepartmentID,
		Status:       existingUser.Status,
		DateOfBirth:  existingUser.DateOfBirth,
		Address:      existingUser.Address,
		Gender:       existingUser.Gender,
		PhoneNumber:  existingUser.PhoneNumber,
	}

	// Update các field từ request
	if req.Name != nil {
		user.Name = *req.Name
	}

	if req.Email != nil {
		user.Email = *req.Email
	}

	if req.DateOfBirth != nil {
		parsedDate, err := time.Parse("2006-01-02", *req.DateOfBirth)
		if err == nil {
			user.DateOfBirth.Time = parsedDate
			user.DateOfBirth.Valid = true
		}
	}

	if req.Address != nil {
		user.Address.String = *req.Address
		user.Address.Valid = true
	}

	if req.Gender != nil {
		user.Gender.String = *req.Gender
		user.Gender.Valid = true
	}

	if req.PhoneNumber != nil {
		user.PhoneNumber.String = *req.PhoneNumber
		user.PhoneNumber.Valid = true
	}

	// Chỉ Quản lý và Giám đốc mới được update role, department, status
	if role == "Quản lý" || role == "Giám đốc" || role == "Trưởng phòng" {
		if req.Role != nil {
			user.Role = *req.Role
		}

		if req.DepartmentID != nil {
			user.DepartmentID.Int64 = int64(*req.DepartmentID)
			user.DepartmentID.Valid = true
		}

		if req.Status != nil {
			user.Status = *req.Status
		}
		if req.NewPassword != nil  {
    hashed, err := bcrypt.GenerateFromPassword(
        []byte(*req.NewPassword),
        bcrypt.DefaultCost,
    )
    if err != nil {
        return err
    }
    user.Password = string(hashed)
}
	}
	

	// Update vào database
	err = s.userRepo.Update(user)
	
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật user: %v", err)
	}

	return nil
}

// DeleteUser - Xóa user (soft delete)
func (s *UserService) DeleteUser(userID int) error {
	existingUser, err := s.userRepo.GetUserByID(userID)
	if err != nil || existingUser == nil {
		return fmt.Errorf("không tìm thấy user")
	}
//	Xóa user khỏi database
	err = s.userRepo.Delete(userID)
	
	// Soft delete bằng cách set status = 'Không hoạt động'
	// existingUser.Status = "Không hoạt động"
	// err = s.userRepo.Update(existingUser)
	if err != nil {
		return fmt.Errorf("lỗi khi xóa user: %v", err)
	}

	return nil
}