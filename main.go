package main

import (
	"log"
	"os"

	"github.com/Tonnie-Exelero/go-ms-kit/tree/main/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create a Gin router
	router := gin.Default()

	// Serve static assets (CSS, JS, images)
	router.Static("/assets", "./assets")

	// Setup application routes
	routes.SetupRoutes(router)

	log.Printf("Server running on port %s", port)
	router.Run(":" + port)
}
