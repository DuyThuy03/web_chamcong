package services

import (
	"math"
)

type LocationService struct {
    officeLatitude  float64
    officeLongitude float64
    radiusMeters    float64
}

func NewLocationService(lat, lon, radius float64) *LocationService {
    return &LocationService{
        officeLatitude:  lat,
        officeLongitude: lon,
        radiusMeters:    radius,
    }
}

// Calculate distance between two points using Haversine formula
func (s *LocationService) CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
    const earthRadius = 6371000 // meters

    lat1Rad := lat1 * math.Pi / 180
    lat2Rad := lat2 * math.Pi / 180
    deltaLat := (lat2 - lat1) * math.Pi / 180
    deltaLon := (lon2 - lon1) * math.Pi / 180

    a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
        math.Cos(lat1Rad)*math.Cos(lat2Rad)*
            math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
    
    c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

    return earthRadius * c
}

func (s *LocationService) IsWithinOfficeRadius(latitude, longitude float64) (bool, float64) {
    distance := s.CalculateDistance(
        s.officeLatitude,
        s.officeLongitude,
        latitude,
        longitude,
    )
    return distance <= s.radiusMeters, distance
}

func (s *LocationService) GetOfficeLocation() (float64, float64) {
    return s.officeLatitude, s.officeLongitude
}
