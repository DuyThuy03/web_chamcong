package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
    Database DatabaseConfig
    JWT      JWTConfig
    Server   ServerConfig
    Upload   UploadConfig
    Office   OfficeConfig
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
    SSLMode  string
    ClientEncoding string
}

type JWTConfig struct {
    Secret        string
    Expiry        time.Duration
    RefreshExpiry time.Duration
}

type ServerConfig struct {
    Port              string
    Host              string
    BaseURL           string
    CORSAllowedOrigins []string
}

type UploadConfig struct {
    Directory   string
    MaxFileSize int64
}

type OfficeConfig struct {
    Latitude      float64
    Longitude     float64
    RadiusMeters  float64
}

func Load() *Config {
    err := godotenv.Load()
    if err != nil {
        log.Println("Warning: .env file not found, using environment variables")
    }

    jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
    jwtRefreshExpiry, _ := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h"))
    maxUploadSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)
    officeLat, _ := strconv.ParseFloat(getEnv("OFFICE_LATITUDE", "20.962448"), 64)
    officeLon, _ := strconv.ParseFloat(getEnv("OFFICE_LONGITUDE", "105.790762"), 64)
    officeRadius, _ := strconv.ParseFloat(getEnv("OFFICE_RADIUS_METERS", "100"), 64)

    return &Config{
        Database: DatabaseConfig{
            Host:     getEnv("DB_HOST", "localhost"),
            Port:     getEnv("DB_PORT", "5432"),
            User:     getEnv("DB_USER", "postgres"),
            Password: getEnv("DB_PASSWORD", ""),
            DBName:   getEnv("DB_NAME", "attendance_db"),
            SSLMode:  getEnv("DB_SSLMODE", "disable"),
            ClientEncoding: getEnv("DB_CLIENT_ENCODING", "UTF8"),
        },
        JWT: JWTConfig{
            Secret:        getEnv("JWT_SECRET", "your-secret-key"),
            Expiry:        jwtExpiry,
            RefreshExpiry: jwtRefreshExpiry,
        },
        Server: ServerConfig{
            Port:              getEnv("SERVER_PORT", "8001"),
            Host:              getEnv("SERVER_HOST", "0.0.0.0"),
            BaseURL:           getEnv("BASE_URL", "http://localhost:8001"),
            CORSAllowedOrigins: []string{
                "http://localhost:5173",
                "http://localhost:3000",
            },
        },
        Upload: UploadConfig{
            Directory:   getEnv("UPLOAD_DIR", "./uploads"),
            MaxFileSize: maxUploadSize,
        },
        Office: OfficeConfig{
            Latitude:     officeLat,
            Longitude:    officeLon,
            RadiusMeters: officeRadius,
        },
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}