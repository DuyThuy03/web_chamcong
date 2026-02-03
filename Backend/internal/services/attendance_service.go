package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"attendance-system/internal/models"
	"attendance-system/internal/repository"
	ws "attendance-system/internal/websocket"
)

type AttendanceService struct {
    repo            *repository.AttendanceRepository
    imageService    *ImageService
    locationService *LocationService
    baseURL         string
	hub			 *ws.Hub
}

func NewAttendanceService(
    repo *repository.AttendanceRepository,
    imageService *ImageService,
    locationService *LocationService,
    baseURL string,
	hub *ws.Hub,
) *AttendanceService {
    return &AttendanceService{
        repo:            repo,
        imageService:    imageService,
        locationService: locationService,
        baseURL:         baseURL,
		hub:			 hub,
    }
}

// Helper function to convert file path to URL
func (s *AttendanceService) convertPathToURL(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http") {
		return path
	}
	// Replace backslashes with forward slashes
	path = strings.ReplaceAll(path, "\\", "/")
	// Add /uploads/ prefix if not already present
	if !strings.HasPrefix(path, "/uploads/") && !strings.HasPrefix(path, "uploads/") {
		path = "/uploads/" + path
	}
	// Return full URL with baseURL
	return s.baseURL + path
}

func (s *AttendanceService) CheckIn(
    userID int,
    userName string,
    imageFile io.Reader,
    filename string,
    latitude, longitude, accuracy float64,
    address, device string,
    shiftID int,
    checkinType string,
    factoryName string,
    note string,
) (*models.CheckIOResponse, error) {
    now := time.Now()
    today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

    // Set default checkin type if empty
    if checkinType == "" {
        checkinType = "OFFICE"
    }

    // Check if already checked in today
    existing, err := s.repo.GetByUserAndDay(userID, today)
    if err != nil && err != sql.ErrNoRows {
        return nil, err
    }
    
    if existing != nil && existing.CheckinTime.Valid {
        return nil, errors.New("đã check-in hôm nay")
    }

    // Logic based on Checkin Type
    if checkinType == "FACTORY" {
        if factoryName == "" {
             return nil, errors.New("tên nhà máy không được để trống khi check-in tại nhà máy")
        }
    } else {
        // OFFICE (Default)
        // Validate location
        isValid, distance := s.locationService.IsWithinOfficeRadius(latitude, longitude, accuracy)
        if !isValid {
            if distance == 0 {
                 return nil, fmt.Errorf("Tín hiệu GPS yếu (Độ lệch: %.0fm > %.0fm). Vui lòng ra nơi thoáng hơn.", accuracy, s.locationService.accuracy)
            }
            return nil, fmt.Errorf("vị trí check-in ngoài phạm vi cho phép (%.0fm từ văn phòng)", distance)
        }
    }

    // Process image with overlay
    overlayInfo := OverlayInfo{
        UserName:  userName,
        Timestamp: now,
        Latitude:  latitude,
        Longitude: longitude,
        Address:   address,
        Device:    device,
    }
    
    imagePath, err := s.imageService.ProcessAndSaveImage(imageFile, filename, true, overlayInfo)
    if err != nil {
        return nil, fmt.Errorf("failed to process image: %w", err)
    }

    // Determine work status
    workStatus := "ON_TIME"
    if checkinType == "OFFICE" {
        // Only check shift constraints for OFFICE
        workStatus = s.determineWorkStatus(now, shiftID)
    }

    // Save to database
    var checkIO *models.CheckIO
    
    if existing != nil {
        // Update existing record
        checkIO = existing
        checkIO.CheckinTime = sql.NullTime{Time: now, Valid: true}
        checkIO.CheckinImage = sql.NullString{String: imagePath, Valid: true}
        checkIO.CheckinLatitude = sql.NullFloat64{Float64: latitude, Valid: true}
        checkIO.CheckinLongitude = sql.NullFloat64{Float64: longitude, Valid: true}
        checkIO.CheckinAddress = sql.NullString{String: address, Valid: true}
        checkIO.Device = sql.NullString{String: device, Valid: true}
        checkIO.ShiftID = sql.NullInt64{Int64: int64(shiftID), Valid: true}
        checkIO.WorkStatus = sql.NullString{String: workStatus, Valid: true}
        checkIO.CheckinType = sql.NullString{String: checkinType, Valid: true}
        checkIO.FactoryName = sql.NullString{String: factoryName, Valid: true}
        checkIO.Note = sql.NullString{String: note, Valid: true}
        err = s.repo.Update(checkIO)
    } else {
        // Create new record
        checkIO = &models.CheckIO{
            UserID:           userID,
            Day:              today,
            CheckinTime:      sql.NullTime{Time: now, Valid: true},
            CheckinImage:     sql.NullString{String: imagePath, Valid: true},
            CheckinLatitude:  sql.NullFloat64{Float64: latitude, Valid: true},
            CheckinLongitude: sql.NullFloat64{Float64: longitude, Valid: true},
            CheckinAddress:   sql.NullString{String: address, Valid: true},
            Device:           sql.NullString{String: device, Valid: true},
            ShiftID:          sql.NullInt64{Int64: int64(shiftID), Valid: true},
            WorkStatus:       sql.NullString{String: workStatus, Valid: true},
            LeaveStatus:     sql.NullString{},
            CheckinType:      sql.NullString{String: checkinType, Valid: true},
            FactoryName:      sql.NullString{String: factoryName, Valid: true},
            Note:             sql.NullString{String: note, Valid: true},
        }
        err = s.repo.Create(checkIO)
    }

    if err != nil {
        return nil, err
    }
	result, err := s.repo.GetByID(checkIO.ID)
if err != nil {
	return nil, err
}


ws.Emit(
	s.hub,
	ws.EventAttendanceCheckin,
	result,
)

    return result, nil
}
//hàm checkout tương tự như checkin, chỉ khác là cập nhật các trường checkout
func (s *AttendanceService) CheckOut(
	userID int,
	userName string,
	imageFile io.Reader,
	filename string,
	latitude, longitude, accuracy float64,
	address, device string,
	shiftID int,
    checkinType string,
    factoryName string,
    note string,
) (*models.CheckIOResponse, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)	
	// Lấy bản ghi CheckIO hiện tại
	existing, err := s.repo.GetByUserAndDay(userID, today)
	if err != nil {
		return nil, err
	}	
	if existing == nil || !existing.CheckinTime.Valid {
		return nil, errors.New("chưa check-in hôm nay")
	}
	if existing.CheckoutTime.Valid {
		return nil, errors.New("đã check-out hôm nay")
	}

    // Default or passed checkinType
    if checkinType == "" {
        // If not specified, maybe default to OFFICE? 
        // Or if the user doesn't change it, use the existing one?
        // But user might want to switch. 
        // Assume Frontend sends the selected option. If empty, default "OFFICE".
        checkinType = "OFFICE"
    }

	// Logic CheckinType
    if checkinType == "FACTORY" {
         if factoryName == "" {
             // If existing is already factory and name is set, maybe reuse?
             // But safer to require it again if type is passed as Factory
             if existing.FactoryName.String == "" {
                return nil, errors.New("tên nhà máy không được để trống khi check-out tại nhà máy")
             }
             // Use existing factory name if not provided but type matches?
             // Let's enforce providing it or using existing if type matches.
             factoryName = existing.FactoryName.String
         }
    } else {
        // OFFICE
        // Xác thực vị trí
        isValid, distance := s.locationService.IsWithinOfficeRadius(latitude, longitude, accuracy)
        if !isValid {
            if distance == 0 {
                return nil, fmt.Errorf("Tín hiệu GPS yếu (Độ lệch: %.0fm > %.0fm). Vui lòng ra nơi thoáng hơn.", accuracy, s.locationService.accuracy)
            }
            return nil, fmt.Errorf("vị trí check-out ngoài phạm vi cho phép (%.0fm từ văn phòng)", distance)
        }
    }

	// Xử lý hình ảnh với overlay
	overlayInfo := OverlayInfo{
		UserName:  userName,
		Timestamp: now,
		Latitude:  latitude,
		Longitude: longitude,
		Address:   address,
		Device:    device,
	}	
	imagePath, err := s.imageService.ProcessAndSaveImage(imageFile, filename, false, overlayInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to process image: %w", err)
	}

	// Update existing record with checkout data
	existing.CheckoutTime = sql.NullTime{Time: now, Valid: true}
	existing.CheckoutImage = sql.NullString{String: imagePath, Valid: true}
	existing.CheckoutLatitude = sql.NullFloat64{Float64: latitude, Valid: true}
	existing.CheckoutLongitude = sql.NullFloat64{Float64: longitude, Valid: true}
	existing.CheckoutAddress = sql.NullString{String: address, Valid: true}
	existing.Device = sql.NullString{String: device, Valid: true}
    
    // Update type/factory/note if changed or set
    existing.CheckinType = sql.NullString{String: checkinType, Valid: true}
    if factoryName != "" {
        existing.FactoryName = sql.NullString{String: factoryName, Valid: true}
    }
    if note != "" {
        // Append or replace? "thêm vào ghi chú"
        existing.Note = sql.NullString{String: note, Valid: true} // Replace likely intended
    } else {
         // Keep existing? existing.Note
    }
    
	err = s.repo.Update(existing)
	if err != nil {
		return nil, err
	}
 result , err := s.repo.GetByID(existing.ID)
 if err != nil {
	 return nil, err
 }
 ws.Emit(
	s.hub,
	ws.EventAttendanceCheckout,
	result,
)
	return result, nil
}
//hàm Gethistory tương tự như GetByID nhưng lấy theo userID và khoảng thời gian
func (s *AttendanceService) GetHistory(
	userID *int,
	departmentID *int,
	username string,
	from_date, to_date time.Time,
	limit, offset int,
) ([]*models.CheckIOResponse, int, error) {
	return s.repo.GetHistory(userID, departmentID, username, from_date, to_date, limit, offset)
}
//hàm GetByUserAndDay lấy bản ghi CheckIO theo userID và ngày
func (s *AttendanceService) GetByUserAndDay(
	userID int,
	day time.Time,
) (*models.CheckIOResponse, error) {

	checkIO, err := s.repo.GetByUserAndDay(userID, day)
	if err != nil {
		return nil, err
	}

	if checkIO == nil {
		return nil, nil
	}

	resp := &models.CheckIOResponse{
		ID:          checkIO.ID,
		UserID:      checkIO.UserID,
		Day:         checkIO.Day,
		LeaveStatus: checkIO.LeaveStatus,
	
	}

	// ===== Time =====
	if checkIO.CheckinTime.Valid {
		resp.CheckinTime = &checkIO.CheckinTime.Time
	}
	if checkIO.CheckoutTime.Valid {
		resp.CheckoutTime = &checkIO.CheckoutTime.Time
	}

	// ===== Image =====
	if checkIO.CheckinImage.Valid {
		imageURL := s.convertPathToURL(checkIO.CheckinImage.String)
		resp.CheckinImage = &imageURL
	}
	if checkIO.CheckoutImage.Valid {
		imageURL := s.convertPathToURL(checkIO.CheckoutImage.String)
		resp.CheckoutImage = &imageURL
	}

	// ===== GPS =====
	if checkIO.CheckinLatitude.Valid {
		resp.CheckinLatitude = &checkIO.CheckinLatitude.Float64
	}
	if checkIO.CheckinLongitude.Valid {
		resp.CheckinLongitude = &checkIO.CheckinLongitude.Float64
	}
	if checkIO.CheckoutLatitude.Valid {
		resp.CheckoutLatitude = &checkIO.CheckoutLatitude.Float64
	}
	if checkIO.CheckoutLongitude.Valid {
		resp.CheckoutLongitude = &checkIO.CheckoutLongitude.Float64
	}

	// ===== Address =====
	if checkIO.CheckinAddress.Valid {
		resp.CheckinAddress = &checkIO.CheckinAddress.String
	}
	if checkIO.CheckoutAddress.Valid {
		resp.CheckoutAddress = &checkIO.CheckoutAddress.String
	}

	// ===== Device & Shift =====
	if checkIO.Device.Valid {
		resp.Device = &checkIO.Device.String
	}
	if checkIO.ShiftID.Valid {
		shiftID := int(checkIO.ShiftID.Int64)
		resp.ShiftID = &shiftID
	}

	// ===== Status =====
	if checkIO.WorkStatus.Valid {
		resp.WorkStatus = &checkIO.WorkStatus.String
	}
	if checkIO.LeaveStatus.Valid {
		// Ensure CheckIOResponse has LeaveStatus field if needed, or if it is mapped elsewhere?
		// Repo GetByUserAndDay maps LeaveStatus to checkIO.LeaveStatus
		// The CheckIOResponse struct has LeaveStatus sql.NullString, so it is copied directly in initialization?
		// Let's check initialization at line 313 (Step 128)
		// resp := &models.CheckIOResponse{ ... LeaveStatus: checkIO.LeaveStatus ... }
		// So LeaveStatus is already there.
	}

    // ===== Factory & Note =====
    if checkIO.CheckinType.Valid {
        resp.CheckinType = &checkIO.CheckinType.String
    }
    if checkIO.FactoryName.Valid {
        resp.FactoryName = &checkIO.FactoryName.String
    }
    if checkIO.Note.Valid {
        resp.Note = &checkIO.Note.String
    }

	return resp, nil
}

	


func (s *AttendanceService) determineWorkStatus(checkTime time.Time, shiftID int) string {
    // This is simplified - you should get shift info from DB
    // For now, assume 08:15 is late threshold
    hour := checkTime.Hour()
    minute := checkTime.Minute()
    
    if hour > 8 || (hour == 8 && minute > 15) {
        return "LATE"
    }
	
    return "ON_TIME"
}

// func (s *AttendanceService) GetTodayAttendanceByDepartment(departmentID int) ([]models.TodayAttendanceResponse, error) {
// 	return s.repo.GetTodayAttendanceByDepartment(departmentID)
// }

func (s *AttendanceService) GetAttendanceHistory(
	user models.User,
    filter models.AttendanceHistoryFilter,
    departmentID *int,
) (*models.PaginationResponse, error) {

    // Nếu là trưởng phòng mà không có departmentID => lỗi
    if user.Role == "Trưởng phòng" && departmentID == nil {
        return nil, errors.New("department_id is required for department head")
    }

    attendances, total, err := s.repo.GetAttendanceHistory(filter, departmentID)
    if err != nil {
        return nil, err
    }

    totalPages := int(math.Ceil(float64(total) / float64(filter.PageSize)))

    return &models.PaginationResponse{
        Page:       filter.Page,
        PageSize:   filter.PageSize,
        TotalPages: totalPages,
        TotalItems: total,
        Data:       attendances,
    }, nil
}
// AttendanceService
func (s *AttendanceService) CanDepartmentHeadAccessUser(
    targetUserID int,
    departmentID int,
) (bool, error) {
    return s.repo.IsUserInDepartment(targetUserID, departmentID)
}

func (s *AttendanceService) GetMonthlySummary(
	ctx context.Context,
	userID int,
	role string,
	departmentID *int,
	month time.Time,
) ([]models.MonthlySummaryResponse, error) {

	year := month.Year()
	monthNum := int(month.Month())

	var filterDepartmentID *int
	switch role {
	case "Quản lý":
		filterDepartmentID = nil
	case "Trưởng phòng", "Nhân viên":
		filterDepartmentID = departmentID
	default:
		return nil, errors.New("permission denied")
	}

	
	repoResults, err := s.repo.GetMonthlyAttendanceSummary(
		ctx,
		year,
		monthNum,
		filterDepartmentID,
	)
	if err != nil {
		return nil, err
	}

	results := make([]models.MonthlySummaryResponse, 0, len(repoResults))
	for _, r := range repoResults {
		results = append(results, models.MonthlySummaryResponse{
			UserID:         r.UserID,
			UserName:       r.UserName,
			DepartmentName: r.DepartmentName,
			TotalDays:      r.TotalDays,
			WorkingDays:    r.WorkingDays,
			AbsentDays:     r.AbsentDays,
			LeaveDays:      r.LeaveDays,
			LateDays:       r.LateDays,
		})
	}

	return results, nil
}

