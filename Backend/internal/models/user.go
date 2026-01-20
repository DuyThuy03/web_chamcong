package models

import (
    "database/sql"
    "time"
)

type User struct {
    ID           int            `json:"id"`
    Name         string         `json:"name"`
    Email        string         `json:"email"`
    DateOfBirth  sql.NullTime   `json:"date_of_birth,omitempty"`
    Address      sql.NullString `json:"address,omitempty"`
    Gender       sql.NullString `json:"gender,omitempty"`
    PhoneNumber  sql.NullString `json:"phone_number,omitempty"`
    Password     string         `json:"-"`
    Role         string         `json:"role"`
    DepartmentID sql.NullInt64  `json:"department_id,omitempty"`
    Status       string         `json:"status"`
    CreatedAt    time.Time      `json:"created_at"`
    UpdatedAt    time.Time      `json:"updated_at"`
}
type UserResponse struct {
    ID             int        `json:"id"`
    Name           string     `json:"name"`
    Email          string     `json:"email"`
    DateOfBirth    *string    `json:"date_of_birth,omitempty"`
    Address        *string    `json:"address,omitempty"`
    Gender         *string    `json:"gender,omitempty"`
    PhoneNumber    *string    `json:"phone_number,omitempty"`
    Role           string     `json:"role"`
    DepartmentID   *int       `json:"department_id,omitempty"`
    DepartmentName *string    `json:"department_name,omitempty"`
    Status         string     `json:"status"`
    Password      *string     `json:"-"`
    CreatedAt      time.Time  `json:"created_at"`
UpdatedAt      time.Time  `json:"updated_at"`
 }
type UpdateUserRequest struct {
	Name         *string `json:"name,omitempty"`
	Email        *string `json:"email,omitempty"`
	DateOfBirth  *string `json:"date_of_birth,omitempty"`
	Address      *string `json:"address,omitempty"`
	Gender       *string `json:"gender,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	Role         *string `json:"role,omitempty"`
	DepartmentID *int    `json:"department_id,omitempty"`
	Status       *string `json:"status,omitempty"`
    NewPassword  *string  `json:"new_password,omitempty"`
}

// type UserResponse struct {
// 	ID             int        `json:"id"`
// 	Name           string     `json:"name"`
// 	Email          string     `json:"email"`
// 	DateOfBirth    *string    `json:"date_of_birth,omitempty"`
// 	Address        *string    `json:"address,omitempty"`
// 	Gender         *string    `json:"gender,omitempty"`
// 	PhoneNumber    *string    `json:"phone_number,omitempty"`
// 	Role           string     `json:"role"`
// 	DepartmentID   *int       `json:"department_id,omitempty"`
// 	DepartmentName *string    `json:"department_name,omitempty"`
// 	Status         string     `json:"status"`
// 	CreatedAt      time.Time  `json:"created_at"`
// 	UpdatedAt      time.Time  `json:"updated_at"`
// }
type CreateUserRequest struct {
	Name         string  `json:"name" binding:"required"`
	Email        string  `json:"email" binding:"required,email"`
	DateOfBirth  *string `json:"date_of_birth,omitempty"`
	Address      *string `json:"address,omitempty"`
	Gender       *string `json:"gender,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	Password     string  `json:"password" binding:"required"`
	
	DepartmentID *int    `json:"department_id,omitempty"`
}
