package services

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"time"

	"attendance-system/internal/models"
	"attendance-system/internal/repository"
)

type AttendanceService struct {
    repo            *repository.AttendanceRepository
    imageService    *ImageService
    locationService *LocationService
}

func NewAttendanceService(
    repo *repository.AttendanceRepository,
    imageService *ImageService,
    locationService *LocationService,
) *AttendanceService {
    return &AttendanceService{
        repo:            repo,
        imageService:    imageService,
        locationService: locationService,
    }
}

func (s *AttendanceService) CheckIn(
    userID int,
    userName string,
    imageFile io.Reader,
    filename string,
    latitude, longitude float64,
    address, device string,
    shiftID int,
) (*models.CheckIOResponse, error) {
    now := time.Now()
    today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

    // Check if already checked in today
    existing, err := s.repo.GetByUserAndDay(userID, today)
    if err != nil && err != sql.ErrNoRows {
        return nil, err
    }
    
    // if existing != nil && existing.CheckinTime.Valid {
    //     return nil, errors.New("đã check-in hôm nay")
    // }

    // Validate location
    isValid, distance := s.locationService.IsWithinOfficeRadius(latitude, longitude)
    if !isValid {
        return nil, fmt.Errorf("vị trí check-in ngoài phạm vi cho phép (%.0fm từ văn phòng)", distance)
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
    workStatus := s.determineWorkStatus(now, shiftID)

    // Save to database
    checkIO := &models.CheckIO{
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
        LeaveStatus:      "NONE",
    }

    if existing != nil {
        // Update existing record
        checkIO.ID = existing.ID
        err = s.repo.Update(checkIO)
    } else {
        // Create new record
        err = s.repo.Create(checkIO)
    }

    if err != nil {
        return nil, err
    }

    return s.repo.GetByID(checkIO.ID)
}
//hàm checkout tương tự như checkin, chỉ khác là cập nhật các trường checkout
func (s *AttendanceService) CheckOut(
	userID int,
	userName string,
	imageFile io.Reader,
	filename string,
	latitude, longitude float64,
	address, device string,
	shiftID int,
) (*models.CheckIOResponse, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())	
	// Lấy bản ghi CheckIO hiện tại
	existing, err := s.repo.GetByUserAndDay(userID, today)
	if err != nil {
		return nil, err
	}	
	if existing == nil || !existing.CheckinTime.Valid {
		return nil, errors.New("chưa check-in hôm nay")
	}
	// if existing.CheckoutTime.Valid {
	// 	return nil, errors.New("đã check-out hôm nay")
	// }
	// Xác thực vị trí
	isValid, distance := s.locationService.IsWithinOfficeRadius(latitude, longitude)
	if !isValid {
		return nil, fmt.Errorf("vị trí check-out ngoài phạm vi cho phép (%.0fm từ văn phòng)", distance)
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
   workStatus := s.determineWorkStatus(now, shiftID)

    // Save to database
    checkIO := &models.CheckIO{
        UserID:           userID,
        Day:              today,
        CheckoutTime:      sql.NullTime{Time: now, Valid: true},
        CheckoutImage:     sql.NullString{String: imagePath, Valid: true},
        CheckoutLatitude:  sql.NullFloat64{Float64: latitude, Valid: true},
        CheckoutLongitude: sql.NullFloat64{Float64: longitude, Valid: true},
        CheckoutAddress:   sql.NullString{String: address, Valid: true},
        Device:           sql.NullString{String: device, Valid: true},
        ShiftID:          sql.NullInt64{Int64: int64(shiftID), Valid: true},
        WorkStatus:       sql.NullString{String: workStatus, Valid: true},
        LeaveStatus:      "NONE",
    }

    if existing != nil {
        // Update existing record
        checkIO.ID = existing.ID
        err = s.repo.Update(checkIO)
    } else {
        // Create new record
        err = s.repo.Create(checkIO)
    }

    if err != nil {
        return nil, err
    }

    return s.repo.GetByID(checkIO.ID)
}
//hàm Gethistory tương tự như GetByID nhưng lấy theo userID và khoảng thời gian
func (s *AttendanceService) GetHistory(
	userID *int,
	departmentID *int,
	from_date, to_date time.Time,
	limit, offset int,
) ([]*models.CheckIOResponse, int, error) {
	return s.repo.GetHistory(userID, departmentID, from_date, to_date, limit, offset)
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
		ID:               checkIO.ID,
		UserID:           checkIO.UserID,
		
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