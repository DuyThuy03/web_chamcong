package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"attendance-system/internal/config"
	"attendance-system/internal/database"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.NewPostgresDB(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Cloudinary
	cld, err := cloudinary.NewFromParams(
		cfg.Cloudinary.CloudName,
		cfg.Cloudinary.ApiKey,
		cfg.Cloudinary.ApiSecret,
	)
	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}

	log.Println("Starting migration to Cloudinary...")

	// Get all records
	rows, err := db.DB.Query("SELECT id, checkin_image, checkout_image, day FROM CheckIO")
	if err != nil {
		log.Fatalf("Failed to query check_io: %v", err)
	}
	defer rows.Close()

	uploadsDir := cfg.Upload.Directory

	for rows.Next() {
		var id int
		var checkinImage, checkoutImage sql.NullString
		var day time.Time

		if err := rows.Scan(&id, &checkinImage, &checkoutImage, &day); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		// Process Checkin Image
		if checkinImage.Valid && checkinImage.String != "" && !strings.HasPrefix(checkinImage.String, "http") {
			newURL, err := uploadFile(cld, uploadsDir, checkinImage.String, "checkin", day)
			if err != nil {
				log.Printf("Failed to upload checkin image (ID: %d): %v", id, err)
			} else {
				_, err := db.DB.Exec("UPDATE CheckIO SET checkin_image = $1 WHERE id = $2", newURL, id)
				if err != nil {
					log.Printf("Failed to update checkin image URL (ID: %d): %v", id, err)
				} else {
					log.Printf("Migrated checkin image for ID %d", id)
				}
			}
		}

		// Process Checkout Image
		if checkoutImage.Valid && checkoutImage.String != "" && !strings.HasPrefix(checkoutImage.String, "http") {
			newURL, err := uploadFile(cld, uploadsDir, checkoutImage.String, "checkout", day)
			if err != nil {
				log.Printf("Failed to upload checkout image (ID: %d): %v", id, err)
			} else {
				_, err := db.DB.Exec("UPDATE CheckIO SET checkout_image = $1 WHERE id = $2", newURL, id)
				if err != nil {
					log.Printf("Failed to update checkout image URL (ID: %d): %v", id, err)
				} else {
					log.Printf("Migrated checkout image for ID %d", id)
				}
			}
		}
	}
	log.Println("Migration completed.")
}

func uploadFile(cld *cloudinary.Cloudinary, uploadsDir, dbPath, typeStr string, day time.Time) (string, error) {
	// Clean path
	relativePath := strings.TrimPrefix(dbPath, "/uploads/")
	relativePath = strings.TrimPrefix(relativePath, "uploads/")
	relativePath = strings.TrimPrefix(relativePath, "/")
	relativePath = strings.ReplaceAll(relativePath, "\\", "/")

	localPath := filepath.Join(uploadsDir, relativePath)

	// Check if file exists
	if _, err := os.Stat(localPath); os.IsNotExist(err) {
		return "", fmt.Errorf("file not found: %s", localPath)
	}

	// Prepare Public ID
	filename := filepath.Base(relativePath)
	nameWithoutExt := strings.TrimSuffix(filename, filepath.Ext(filename))
	
	// Create a folder structure similar to services logic
	folder := fmt.Sprintf("attendance/%s/%s", typeStr, day.Format("2006-01-02"))
	publicID := fmt.Sprintf("%s/%s_%d", folder, nameWithoutExt, time.Now().UnixNano())

	// Upload
	resp, err := cld.Upload.Upload(context.Background(), localPath, uploader.UploadParams{
		PublicID:     publicID,
		ResourceType: "image",
		Type:         "upload",
	})
	if err != nil {
		return "", err
	}

	return resp.SecureURL, nil
}
