package models

type UserMinimal struct {
	ID             int    `json:"id"`
	Name           string `json:"name"`
	DepartmentName string `json:"department_name"`
	HasCheckedIn   bool   `json:"has_checked_in"`
	HasCheckedOut  bool   `json:"has_checked_out"`
}
