package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"

	"orchestrax/mf-toolkit/graph"
	"orchestrax/mf-toolkit/templates"

	"github.com/gin-gonic/gin"
	"github.com/microcosm-cc/bluemonday"
)

func CoursesHandler(c *gin.Context) {
	// Extract the filter from the query parameter "tag"
	tagFilter := c.DefaultQuery("tag", "") // Default to "marketing"

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

func CourseHandler(c *gin.Context) {
	idParam := c.Param("id")
  	courseID, err := strconv.Atoi(idParam)
    if err != nil {
        c.String(http.StatusBadRequest, "Invalid course ID")
        return
    }

	if courseID == 0 {
		log.Println("ID is required")
		c.String(http.StatusBadRequest, "ID is required")
		return
	}

	course, err := graph.GetCourseByID(courseID)
	if err != nil {
	  	log.Printf("Error fetching course %d: %v\n", courseID, err)
	  	return
	}
	if course.ID == 0 {
		log.Println("Failed to fetch course details")
		c.String(http.StatusNotFound, "Course not found")
		return
	}

	subjectsJson := course.CourseModule

	var parsedItems []templates.SubjectItem
	if string(subjectsJson) != "" {
        // First attempt: Direct JSON array
        if err := json.Unmarshal(subjectsJson, &parsedItems); err != nil {
            // Second attempt: JSON string containing array
            var jsonStr string
            if err := json.Unmarshal(subjectsJson, &jsonStr); err == nil && jsonStr != "" {
                if err := json.Unmarshal([]byte(jsonStr), &parsedItems); err != nil {
                    log.Println("Failed to parse course_module JSON:", err)
                }
            } else {
                log.Println("Failed to parse course_module:", err)
            }
        }
    }

	groups := groupByModule(parsedItems)

	iframeURL := os.Getenv("ENQUIRE_FORM_URL")
	if iframeURL == "" {
		iframeURL = "http://localhost:8081" // optional fallback
	}

	c.Writer.Header().Set("Content-Type", "text/html")
	err = templates.Modal(&course, &groups, iframeURL).Render(c, c.Writer)
	if err != nil {
		log.Println("Failed to render modal:", err)
		c.String(http.StatusInternalServerError, "Failed to render modal: %v", err)
		return
	}
}

func CloseModal(c *gin.Context) {
	c.Status(http.StatusOK)
}

func groupByModule(items []templates.SubjectItem) []templates.ModuleGroup {
	var groups []templates.ModuleGroup
	var current *templates.ModuleGroup

	for _, item := range items {
		if item.Module != "" {
			// start a new group
			g := templates.ModuleGroup{
				Module:   item.Module,
				Subjects: []templates.SubjectItem{{
					Code:    item.Code,
					Name:    item.Name,
					Details: safeHTML(item.Details),
				}},
			}
			groups = append(groups, g)
			current = &groups[len(groups)-1]
		} else if current != nil {
			// append to the most recent group
			current.Subjects = append(current.Subjects, templates.SubjectItem{
				Code:    item.Code,
				Name:    item.Name,
				Details: safeHTML(item.Details),
			})
		}
	}

	return groups
}

func InfoHandler(c *gin.Context) {
  idParam := c.Param("id")
  courseID, err := strconv.Atoi(idParam)
  if err != nil {
	c.String(http.StatusBadRequest, "Invalid course ID")
	return
  }

  section := c.Query("section")

  course, err := graph.GetCourseByID(courseID)
  if err != nil {
	log.Printf("Error fetching course %d: %v\n", courseID, err)
	return
  }
  if course.ID == 0 {
    c.String(http.StatusNotFound, "Course not found")
    return
  }

  var partialHTML string
  switch section {
  case "duration":
    partialHTML = safeHTML(course.DurationAndStudyLoad)
  case "delivery":
    partialHTML = safeHTML(course.DeliveryLongText)
  case "skills":
    partialHTML = safeHTML(course.WhatYoullLearn)
  case "whofor":
    partialHTML = safeHTML(course.WhoIsItFor)
  default:
    partialHTML = safeHTML(course.Overview)
  }

  // Return raw HTML snippet
  c.Writer.Header().Set("Content-Type", "text/html; charset=utf-8")
  c.String(http.StatusOK, partialHTML)
}

func CareerHandler(c *gin.Context) {
  idParam := c.Param("id")
  courseID, err := strconv.Atoi(idParam)
  if err != nil {
	c.String(http.StatusBadRequest, "Invalid course ID")
	return
  }

  section := c.Query("section")

  course, err := graph.GetCourseByID(courseID)
  if err != nil {
    log.Printf("Error fetching course %d: %v\n", courseID, err)
    return
  }
  if course.ID == 0 {
    c.String(http.StatusNotFound, "Course not found")
    return
  }

  var partialHTML string
  switch section {
  case "study":
    partialHTML = safeHTML(course.FurtherStudyAndEducationPathways)
  default:
    partialHTML = safeHTML(course.JobOutcomes)
  }

  // Return raw HTML snippet
  c.Writer.Header().Set("Content-Type", "text/html; charset=utf-8")
  c.String(http.StatusOK, partialHTML)
}

func RecognitionHandler(c *gin.Context) {
  idParam := c.Param("id")
  courseID, err := strconv.Atoi(idParam)
  if err != nil {
	c.String(http.StatusBadRequest, "Invalid course ID")
	return
  }
	
  section := c.Query("section")

  course, err := graph.GetCourseByID(courseID)
  if err != nil {
	log.Printf("Error fetching course %d: %v\n", courseID, err)
	return
  }
  if course.ID == 0 {
    c.String(http.StatusNotFound, "Course not found")
    return
  }

  var partialHTML string
  switch section {
  case "partnership":
    partialHTML = string(course.Partner.Name)
  default:
    partialHTML = safeHTML(course.ProfessionalRecognition)
  }

  // Return raw HTML snippet
  c.Writer.Header().Set("Content-Type", "text/html; charset=utf-8")
  c.String(http.StatusOK, partialHTML)
}

func EligibilityHandler(c *gin.Context) {
  idParam := c.Param("id")
  courseID, err := strconv.Atoi(idParam)
  if err != nil {
	c.String(http.StatusBadRequest, "Invalid course ID")
	return
  }

  section := c.Query("section")

  course, err := graph.GetCourseByID(courseID)
  if err != nil {
	log.Printf("Error fetching course %d: %v\n", courseID, err)
	return
  }
  if course.ID == 0 {
    c.String(http.StatusNotFound, "Course not found")
    return
  }

  var partialHTML string
  switch section {
  case "prior":
    partialHTML = safeHTML(course.RecognitionOfPriorLearning)
  default:
    partialHTML = safeHTML(course.EntryRequirements)
  }

  // Return raw HTML snippet
  c.Writer.Header().Set("Content-Type", "text/html; charset=utf-8")
  c.String(http.StatusOK, partialHTML)
}

func CurriculumHandler(c *gin.Context) {
  idParam := c.Param("id")
  courseID, err := strconv.Atoi(idParam)
  if err != nil {
	c.String(http.StatusBadRequest, "Invalid course ID")
	return
  }

  section := c.Query("section")

  course, err := graph.GetCourseByID(courseID)
  if err != nil {
	log.Printf("Error fetching course %d: %v\n", courseID, err)
	return
  }
  if course.ID == 0 {
    c.String(http.StatusNotFound, "Course not found")
    return
  }

  var partialHTML string
  switch section {
  case "assessment":
    partialHTML = safeHTML(course.Assessment)
  default:
    partialHTML = safeHTML(course.Materials)
  }

  // Return raw HTML snippet
  c.Writer.Header().Set("Content-Type", "text/html; charset=utf-8")
  c.String(http.StatusOK, partialHTML)
}

func safeHTML(s string) string {
    p := bluemonday.UGCPolicy()
    return p.Sanitize(s)
}