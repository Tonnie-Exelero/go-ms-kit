package graph

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

type TestimonialEntry struct {
	FullName    string `json:"full_name"`
	CourseName  string `json:"course_name"`
	Testimonial string `json:"testimonial"`
}

func GetCourseByID(id int) (CourseView, error) {
	// 1. Build our GraphQL query with a $id variable
	query := `
		query($id: Int!) {
			api_v1_coursesCollection(filter: { id: { eq: $id } }) {
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

	// 2. Marshal the request body with query + variables
	payload := map[string]interface{}{
		"query":     query,
		"variables": map[string]int{"id": id},
	}
	reqBody, err := json.Marshal(payload)
	if err != nil {
		log.Println("Failed to marshal GraphQL payload:", err)
		return CourseView{}, err
	}

	// 3. Prepare the HTTP request
	req, err := http.NewRequest("POST", os.Getenv("SS_GRAPHQL"), bytes.NewBuffer(reqBody))
	if err != nil {
		log.Println("Failed to create request:", err)
		return CourseView{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", os.Getenv("SS_ANON_KEY"))
	req.Header.Set("ss-api-key", os.Getenv("SS_API_KEY"))

	// 4. Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Failed to send request:", err)
		return CourseView{}, err
	}
	defer func() {
		if cerr := resp.Body.Close(); cerr != nil {
			log.Println("Failed to close response body:", cerr)
			if err == nil {
				err = cerr
			}
		}
	}()

	// 5. Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("Failed to read GraphQL response:", err)
		return CourseView{}, err
	}

	// 6. Unmarshal into the `edges[].node` shape	
	var wrapper GraphQLResponse
	if err := json.Unmarshal(body, &wrapper); err != nil {
		log.Println("Failed to unmarshal GraphQL response:", err)
		return CourseView{}, err
	}

	// 7. Handle the case where no course was found
	if len(wrapper.Data.APIV1CoursesCollection.Edges) == 0 {
		log.Printf("No course found with id %d\n", id)
		return CourseView{}, nil // or return an error if you prefer
	}

	// 8. Extract the first node
	course := wrapper.Data.APIV1CoursesCollection.Edges[0].Node

	// 9. Convert []graphql.String → []string, then join with commas
	var deliveryVals []string
	for _, gs := range course.Delivery {
		deliveryVals = append(deliveryVals, string(gs))
	}
	deliveryText := strings.Join(deliveryVals, ", ")

	// 10. Parse testimonials JSON array and extract first testimonial
	var testimonialText string
	if string(course.Testimonials) != "" {
        var entries []TestimonialEntry

        // First attempt: Unmarshal as JSON array
        if err := json.Unmarshal(course.Testimonials, &entries); err != nil {
            // Second attempt: Unmarshal as JSON string containing array
            var jsonStr string
            if err := json.Unmarshal(course.Testimonials, &jsonStr); err == nil && jsonStr != "" {
                if err := json.Unmarshal([]byte(jsonStr), &entries); err != nil {
                    log.Println("Failed to parse testimonials JSON:", err)
                }
            } else {
                log.Println("Failed to parse testimonials:", err)
            }
        }

        if len(entries) > 0 {
            testimonialText = entries[0].Testimonial
        }
    }

	// Convert ID to string
	idText := fmt.Sprint(course.ID)

	// Format Geo Targeting
	formattedGeoTargeting := formatValue("geo", string(course.GeoTargeting))

	return CourseView{
		Course: course,
		IDText: idText,
		DeliveryText: deliveryText,
		TestimonialText: testimonialText,
		GeoTargeting: formattedGeoTargeting,
		DeliveryLongText: safeHTML(course.DeliveryLongText),
		Overview: safeHTML(course.Overview),
		WhoIsItFor: safeHTML(course.WhoIsItFor),
		WhatYoullLearn: safeHTML(course.WhatYoullLearn),
		DurationAndStudyLoad: safeHTML(course.DurationAndStudyLoad),
		JobOutcomes: safeHTML(course.JobOutcomes),
		EntryRequirements: safeHTML(course.EntryRequirements),
		CourseFeatures: safeHTML(course.CourseFeatures),
		WorkPlacement: safeHTML(course.WorkPlacement),
		RecognitionOfPriorLearning: safeHTML(course.RecognitionOfPriorLearning),
		Assessment: safeHTML(course.Assessment),
		FurtherStudyAndEducationPathways: safeHTML(course.FurtherStudyAndEducationPathways),
		ProfessionalRecognition: safeHTML(course.ProfessionalRecognition),
		Materials: safeHTML(course.Materials),
		PaymentOptions: safeHTML(course.PaymentOptions),
		AdditionalInformation: safeHTML(course.AdditionalInformation),
	}, nil
}

func safeHTML(s string) string {
    p := bluemonday.UGCPolicy()
    return p.Sanitize(s)
}