package services

import (
	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	"attendance-system/internal/utils"
	"database/sql"
	"fmt"
	"time"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

func (s *UserService) CreateUser(
	auth *models.AuthContext,
	req *models.CreateUserRequest,
) (*models.User, error) {

	existingUser, err := s.userRepo.GetByEmail(req.Email)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if existingUser != nil {
		return nil, fmt.Errorf("email đã tồn tại")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("lỗi mã hóa mật khẩu: %v", err)
	}

    role := req.Role
    if role == "" {
        role = "Nhân viên"
    }

	user := &models.User{
    Name:       req.Name,
    Email:      req.Email,
    Password:   hashedPassword,
    Role:       role,
    Status:     "Hoạt động",
    BaseSalary: req.BaseSalary,
}

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

	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("lỗi khi tạo user: %v", err)
	}

	return user, nil
}

func (s *UserService) UpdateUser(userID int, req *models.UpdateUserRequest, role string) error {
	
	existingUser, err := s.userRepo.GetUserByID(userID)
	if err != nil || existingUser == nil {
		return fmt.Errorf("không tìm thấy user")
	}

	if req.Email != nil && *req.Email != existingUser.Email {
		checkUser, _ := s.userRepo.GetByEmail(*req.Email)
		if checkUser != nil {
			return fmt.Errorf("email đã tồn tại")
		}
	}

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
		BaseSalary:   existingUser.BaseSalary,
	}

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
        if req.BaseSalary != nil {
            user.BaseSalary = *req.BaseSalary
        }
		newPass := req.NewPassword
		if newPass == nil {
			newPass = req.Password
		}
		
		if newPass != nil {
			hashed, err := utils.HashPassword(*newPass)
			if err != nil {
				return err
			}
			user.Password = hashed
		}
	}

	err = s.userRepo.Update(user)
	
	if err != nil {
		return fmt.Errorf("lỗi khi cập nhật user: %v", err)
	}

	return nil
}

func (s *UserService) DeleteUser(userID int) error {
	existingUser, err := s.userRepo.GetUserByID(userID)
	if err != nil || existingUser == nil {
		return fmt.Errorf("không tìm thấy user")
	}

	err = s.userRepo.Delete(userID)

	if err != nil {
		return fmt.Errorf("lỗi khi xóa user: %v", err)
	}

	return nil
}