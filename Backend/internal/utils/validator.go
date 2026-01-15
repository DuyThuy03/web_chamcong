package utils

import (
    "regexp"
    "strings"
)

func IsValidEmail(email string) bool {
    emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
    return emailRegex.MatchString(email)
}

func IsValidPhone(phone string) bool {
    phoneRegex := regexp.MustCompile(`^[0-9]{10,11}$`)
    return phoneRegex.MatchString(strings.ReplaceAll(phone, " ", ""))
}

func IsValidRole(role string) bool {
    validRoles := []string{"Nhân viên", "Trưởng phòng", "Quản lý", "Giám đốc"}
    for _, r := range validRoles {
        if r == role {
            return true
        }
    }
    return false
}

func IsValidWorkStatus(status string) bool {
    validStatuses := []string{"Đúng giờ", "Đi muộn", "Vắng mặt"}
    for _, s := range validStatuses {
        if s == status {
            return true
        }
    }
    return false
}