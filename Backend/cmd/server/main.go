package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"attendance-system/internal/config"
	"attendance-system/internal/database"
	"attendance-system/internal/handlers"
	"attendance-system/internal/middleware"
	"attendance-system/internal/repository"
	"attendance-system/internal/services"
    


	"github.com/gin-gonic/gin"
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

    log.Println("Database connection established")

    // Initialize repositories
    userRepo := repository.NewUserRepository(db.DB)
    attendanceRepo := repository.NewAttendanceRepository(db.DB, cfg.Server.BaseURL)
    departmentRepo := repository.NewDepartmentRepository(db.DB)
    shiftRepo := repository.NewShiftRepository(db.DB)
    leaveRequestRepo := repository.NewLeaveRequestRepository(db.DB)

    // Initialize services
    imageService, err := services.NewImageService(cfg.Upload.Directory)
    if err != nil {
        log.Fatalf("Failed to initialize image service: %v", err)
    }

    locationService := services.NewLocationService(
        cfg.Office.Latitude,
        cfg.Office.Longitude,
        cfg.Office.RadiusMeters,
    )

    attendanceService := services.NewAttendanceService(
        attendanceRepo,
        imageService,
        locationService,
        cfg.Server.BaseURL,
    )

    userService := services.NewUserService(userRepo)

    // Initialize handlers
    authHandler := handlers.NewAuthHandler(userRepo, cfg)
    userHandler := handlers.NewUserHandler(userRepo)
    attendanceHandler := handlers.NewAttendanceHandler(attendanceService)
    departmentHandler := handlers.NewDepartmentHandler(departmentRepo)
    shiftHandler := handlers.NewShiftHandler(shiftRepo)
    leaveHandler := handlers.NewLeaveHandler(leaveRequestRepo, userRepo)
    managerHandler := handlers.NewManagerHandler(userRepo, attendanceRepo, userService)
    dashboardHandler := handlers.NewDashboardHandler(
        services.NewDashboardService(
            repository.NewDashboardRepository(db.DB),
            attendanceRepo,
        ),
    )

    // Setup Gin router
    router := setupRouter(cfg, authHandler, userHandler, attendanceHandler, departmentHandler, shiftHandler, leaveHandler, managerHandler, dashboardHandler)

    // Start server
    addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
    log.Printf("Server starting on %s", addr)
    
    if err := router.Run(addr); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

func setupRouter(
    cfg *config.Config,
    authHandler *handlers.AuthHandler,
    userHandler *handlers.UserHandler,
    attendanceHandler *handlers.AttendanceHandler,
    departmentHandler *handlers.DepartmentHandler,
    shiftHandler *handlers.ShiftHandler,
    leaveHandler *handlers.LeaveHandler,
    managerHandler *handlers.ManagerHandler,
    dashboardHandler *handlers.DashboardHandler,
) *gin.Engine {
    
    // Set Gin mode
    gin.SetMode(gin.ReleaseMode)

    router := gin.Default()
   router.Use(func(c *gin.Context) {
    origin := c.Request.Header.Get("Origin")

    // CHỈ echo lại origin, KHÔNG ĐƯỢC "*"
    c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
    c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
    c.Writer.Header().Set("Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    )
    c.Writer.Header().Set("Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    )

    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }
    c.Next()
})

    // CORS middleware
    // router.Use(func(c *gin.Context) {
    //     c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
    //     c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
    //     c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
    //     c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

    //     if c.Request.Method == "OPTIONS" {
    //         c.AbortWithStatus(204)
    //         return
    //     }
    //     c.Next()
    // })

    // API v1 routes
    v1 := router.Group("/api/v1")
    {
        // Health check
        v1.GET("/health", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{
                "status": "OKE",
                "time":   time.Now(),
            })
        })

        // Public routes
        auth := v1.Group("/auth")
        {
            auth.POST("/login", authHandler.Login)
            auth.POST("/refresh", authHandler.RefreshToken)
            auth.POST("/logout", authHandler.Logout)
        }

        // Protected routes
        protected := v1.Group("")
        protected.Use(middleware.AuthMiddleware(cfg))
        {
            // User profile
            protected.GET("/profile", authHandler.GetProfile)
            protected.PUT("/profile", userHandler.UpdateProfile)

            // Attendance routes
            attendance := protected.Group("/attendance")
            {
                attendance.POST("/checkin", attendanceHandler.CheckIn)
                attendance.POST("/checkout", attendanceHandler.CheckOut)
                attendance.GET("/today", attendanceHandler.GetToday)
                attendance.GET("/history", 
                    middleware.CheckAttendanceAccess(),
                    attendanceHandler.GetHistory,
                )
            }

            // User management (admin only)
            users := protected.Group("/users")
            users.Use(middleware.RequireRole("Giám đốc", "Quản lý", "Trưởng phòng"))
            {
                users.GET("", userHandler.GetAll)
                users.GET("/:id", userHandler.GetByID)
                users.PUT("/:id", 
                    middleware.CheckUserAccessMiddleware(),
                    userHandler.Update,
                )
                users.POST("", authHandler.AddUser)
            }

            // Department routes (leaders and above)
            departments := protected.Group("/departments")
            departments.Use(middleware.RequireRole("Trưởng phòng", "Quản lý", "Giám đốc"))
            {
                departments.GET("", departmentHandler.GetAll)
                departments.GET("/:id", departmentHandler.GetByID)
                departments.GET("/:id/users", departmentHandler.GetUsers)
            }

            // Shift management
            shifts := protected.Group("/shifts")
            {
                shifts.GET("", shiftHandler.GetAll)
                shifts.GET("/:id", shiftHandler.GetByID)
            }

            // ⭐ DASHBOARD ROUTE - NEW
            dashboard := protected.Group("/dashboard")
            dashboard.Use(middleware.RequireRole("Trưởng phòng", "Quản lý", "Giám đốc"))
            {
                // Dashboard tổng quan phòng ban
                // Trưởng phòng: tự động lấy department_id từ token
                // Quản lý/Giám đốc: phải truyền ?department_id=X
                dashboard.GET("/department", dashboardHandler.GetDepartmentDashboard)
            }

            // Manager routes - Trưởng phòng, Quản lý, Giám đốc
            manager := protected.Group("/manager")
            manager.Use(middleware.RequireManagerRole())
            {
                // Xem trạng thái điểm danh hôm nay
                manager.GET("/attendance/today", managerHandler.GetTodayAttendanceStatus)
                
                // Xem lịch sử chấm công của thành viên
                manager.GET("/attendance/member-history", managerHandler.GetMemberAttendanceHistory)
                
                // Xem lịch sử chấm công của phòng ban
                manager.GET("/attendance/department-history", managerHandler.GetDepartmentAttendanceHistory)
                
                // Quản lý thành viên
                manager.GET("/members", managerHandler.GetDepartmentMembers)
                manager.GET("/members/:id", managerHandler.GetMemberDetail)
                manager.PUT("/members/:id", managerHandler.UpdateMember)
                
                // CRUD thành viên - chỉ Quản lý và Giám đốc
                manager.POST("/members", 
                    middleware.RequireAdminRole(),
                    managerHandler.CreateMember,
                )
                manager.DELETE("/members/:id",
                    middleware.RequireAdminRole(),
                    managerHandler.DeleteMember,
                )
            }

            // Leave requests
            leaves := protected.Group("/leaves")
            {
                leaves.POST("", leaveHandler.Create)
                leaves.GET("", leaveHandler.GetAll)
                leaves.GET("/:id", leaveHandler.GetByID)
                leaves.PUT("/:id/approve", 
                    middleware.RequireRole("Trưởng phòng", "Quản lý", "Giám đốc"),
                    leaveHandler.Approve,
                )
                leaves.PUT("/:id/reject",
                    middleware.RequireRole("Trưởng phòng", "Quản lý", "Giám đốc"),
                    leaveHandler.Reject,
                )
            }
        }
    }

    // Serve uploaded images
    router.Static("/uploads", cfg.Upload.Directory)
    
    // ⭐ SERVE FRONTEND STATIC FILES
    router.Static("/assets", "./frontend/dist/assets")
    
    // Serve index.html for root and SPA routes (but not /api or /health or /uploads)
    router.NoRoute(func(c *gin.Context) {
        // Don't serve index.html for API routes, health check, or uploads
        path := c.Request.URL.Path
        if len(path) >= 4 && path[:4] == "/api" {
            c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
            return
        }
        if path == "/health" || len(path) >= 8 && path[:8] == "/uploads" {
            c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
            return
        }
        // Serve frontend for all other routes
        c.File("./frontend/dist/index.html")
    })

    return router
}