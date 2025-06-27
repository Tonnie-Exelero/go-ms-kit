package graph

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"orchestrax/mf-toolkit/models" // Adjust the import path as necessary
	"os"
	"strings"
)

type CourseView struct {
	models.Course
	IDText                           string
	DeliveryText                     string
	FrequencyText                    string
	TestimonialText                  string
	DeliveryLongText                 string
	Overview                         string
	WhoIsItFor                       string
	WhatYoullLearn                   string
	DurationAndStudyLoad             string
	JobOutcomes                      string
	EntryRequirements                string
	CourseFeatures                   string
	WorkPlacement                    string
	RecognitionOfPriorLearning       string
	Assessment                       string
	FurtherStudyAndEducationPathways string
	ProfessionalRecognition          string
	Materials                        string
	PaymentOptions                   string
	AdditionalInformation            string
	GeoTargeting                     string
}

type GraphQLResponse struct {
	Data struct {
		APIV1CoursesCollection struct {
			Edges []struct {
				Cursor string        `json:"cursor"`
				Node   models.Course `json:"node"`
			} `json:"edges"`
		} `json:"api_v1_coursesCollection"`
	} `json:"data"`
}

var dataMap = map[string]map[string]string{
    "delivery": {
        "in_class": "In Class",
        "blended":  "Blended",
        "online":   "Online",
        "virtual":  "Virtual",
    },
    "frequency": {
        "SELF_PACED": "Self Paced",
		"FULL_TIME":  "Full Time", 
		"PART_TIME":  "Part Time",
    },
	"geo": {
        "NONE":        "none",
		"WARNING":     "warning",
		"RESTRICTION": "restriction", 
    },
}

func GetCourses(tagFilter string) ([]CourseView, error) {
	// 1. Build GraphQL query payload
	query := `
		query {
			api_v1_coursesCollection {
				edges {
					cursor
					node {
						id
						guid
						course_name
						level
						delivery
						delivery_long_text
						locations
						course_code
						overview
						who_is_it_for
						what_youll_learn
						duration_and_study_load
						job_outcomes
						entry_requirements
						course_features
						work_placement
						recognition_of_prior_learning
						assessment
						further_study_and_education_pathways
						professional_recognition
						materials
						payment_options
						additional_information
						geo_targeting
						course_module
						top_panel
						start_date
						frequency
						duration_length
						duration_unit
						partner_id
						partner {
							id
							name
							logo
						}
						testimonies
						brand_id
						brand {
							id
							provider_name
							about_provider
							logo
							rto_code
						}
					}
				}
			}
		}
	`

	requestBody := map[string]string{
		"query": query,
	}
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		log.Println("Failed to marshal request body:", err)
		return nil, err
	}

	// 2. Send HTTP request
	req, err := http.NewRequest("POST", os.Getenv("SS_GRAPHQL"), bytes.NewBuffer(jsonData))
	if err != nil {
		log.Println("Failed to create request:", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", os.Getenv("SS_ANON_KEY"))
	req.Header.Set("ss-api-key", os.Getenv("SS_API_KEY"))	

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Failed to send request:", err)
		return nil, err
	}
	defer func() {
		if cerr := resp.Body.Close(); cerr != nil {
			log.Println("Failed to close response body:", cerr)
			if err == nil {
				err = cerr
			}
		}
	}()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("Failed to read response body:", err)
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"unexpected status: %d", 
			resp.StatusCode, 
			
		)
	}

	// 3. Unmarshal into the edges→node shape
	var response GraphQLResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf(
			"error decoding JSON: %w", 
			err, 
		)
	}	

	// 4. Flatten edges into view objects & join Delivery slice
	var result []CourseView
	for _, edge := range response.Data.APIV1CoursesCollection.Edges {
		c := edge.Node

		// Convert and format Delivery values
		var dvals []string
		for _, gs := range c.Delivery {
			formatted := formatValue("delivery", string(gs))
			dvals = append(dvals, formatted)
		}
		dtext := strings.Join(dvals, ", ")

		// Convert and format Frequency values
		var freq []string
		for _, gs := range c.Frequency {
			formatted := formatValue("frequency", string(gs))
			freq = append(freq, formatted)
		}
		freqtext := strings.Join(freq, ", ")

		// Convert ID to string
		idText := fmt.Sprint(c.ID)

		// Append our view
		result = append(result, CourseView{
			Course:        c,
			IDText:        idText,
			DeliveryText:  dtext,
			FrequencyText: freqtext,
			Overview: safeHTML(c.Overview),
			JobOutcomes: safeHTML(c.JobOutcomes),
		})
	}

	return result, nil
}

// Format data to human readable
func formatValue(category, value string) string {
    if mappings, ok := dataMap[category]; ok {
        // Exact case-sensitive lookup
        if formatted, ok := mappings[value]; ok {
            return formatted
        }
    }
    return value
}