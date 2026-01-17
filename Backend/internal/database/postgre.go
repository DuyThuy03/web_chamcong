// internal/database/postgres.go
package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"attendance-system/internal/config"

	_ "github.com/lib/pq"
)

type Database struct {
    *sql.DB
}

func NewPostgresDB(cfg *config.DatabaseConfig) (*Database, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s client_encoding=%s TimeZone=Asia/Ho_Chi_Minh",
        cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode, cfg.ClientEncoding,
    )

    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Test connection
    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    log.Println("Database connected successfully")

    return &Database{db}, nil
}

func (d *Database) Close() error {
    return d.DB.Close()
}

// Health check
func (d *Database) HealthCheck() error {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    return d.PingContext(ctx)
}