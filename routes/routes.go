package routes

import (
	"github.com/Tonnie-Exelero/go-ms-kit/handlers"
	"github.com/Tonnie-Exelero/go-ms-kit/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes defines all application routes.
func SetupRoutes(router *gin.Engine) {
	// Public routes
	router.GET("/", handlers.HomeHandler)
	router.GET("/courses/:id", handlers.CourseHandler)
	router.GET("/courses/:id/curriculum", handlers.CurriculumHandler)
	router.GET("/courses/:id/eligibility", handlers.EligibilityHandler)
	router.GET("/courses/:id/career", handlers.CareerHandler)
	router.GET("/courses/:id/recognition", handlers.RecognitionHandler)
	router.GET("/courses/:id/info", handlers.InfoHandler)
	router.GET("/close-modal", handlers.CloseModal)
	router.POST("/auth/callback", handlers.AuthCallback)

	// Protected routes group (example)
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// Example protected route
		protected.GET("/profile", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"user":  "John Doe",
				"email": "john.doe@example.com",
			})
		})
	}
}
