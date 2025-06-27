package handlers

import (
	"log"
	"net/http"

	"github.com/Tonnie-Exelero/go-ms-kit/graph"
	"github.com/Tonnie-Exelero/go-ms-kit/templates"

	"github.com/gin-gonic/gin"
)

// HomeHandler renders the main index page using Templ
func HomeHandler(c *gin.Context) {
	// Extract the filter from the query parameter "tag"
	tagFilter := c.DefaultQuery("tag", "marketing") // Default to "marketing"

	courses, err := graph.GetCourses(tagFilter)
	if err != nil {
		log.Println("Failed to fetch courses:", err)
		return
	}


	c.Writer.Header().Set("Content-Type", "text/html")
	err = templates.Home(&courses).Render(c, c.Writer)
	if err != nil {
		log.Println("Failed to render index:", err)
		c.String(http.StatusInternalServerError, "Template render error: %v", err)
		return
	}
}
