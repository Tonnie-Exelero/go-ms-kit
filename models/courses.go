package models

import (
	"encoding/json"
)

// Course represents the structure of the course returned by the GraphQL query.
type Course struct {
    ID                                  int      `json:"id"`
    GUID                                string   `json:"guid"`
    CourseName                          string   `json:"course_name"`
    Level                               []string `json:"level"`
    Delivery                            []string `json:"delivery"`
    DeliveryLongText                    string   `json:"delivery_long_text"`
    Locations                           []string `json:"locations"`
    CourseCode                          string   `json:"course_code"`
    Overview                            string   `json:"overview"`
    WhoIsItFor                          string   `json:"who_is_it_for"`
    WhatYoullLearn                      string   `json:"what_youll_learn"`
    DurationAndStudyLoad                string   `json:"duration_and_study_load"`
    JobOutcomes                         string   `json:"job_outcomes"`
    EntryRequirements                   string   `json:"entry_requirements"`
    CourseFeatures                      string   `json:"course_features"`
    WorkPlacement                       string   `json:"work_placement"`
    RecognitionOfPriorLearning          string   `json:"recognition_of_prior_learning"`
    Assessment                          string   `json:"assessment"`
    FurtherStudyAndEducationPathways    string   `json:"further_study_and_education_pathways"`
    ProfessionalRecognition             string   `json:"professional_recognition"`
    Materials                           string   `json:"materials"`
    PaymentOptions                      string   `json:"payment_options"`
    AdditionalInformation               string   `json:"additional_information"`
    GeoTargeting                        string   `json:"geo_targeting"`
    CourseModule                        json.RawMessage `json:"course_module"`
    TopPanel                            json.RawMessage `json:"top_panel"`
    Testimonials                        json.RawMessage `json:"testimonies"`
    StartDate                           string   `json:"start_date"`
    Frequency                           []string `json:"frequency"`
    DurationLength                      string   `json:"duration_length"`
    DurationUnit                        string   `json:"duration_unit"`
    PartnerID                           int      `json:"partner_id"`
    Partner                             Partner  `json:"partner"`
    BrandID                             int      `json:"brand_id"`
    Brand                               Brand    `json:"brand"`
}

type Brand struct {
    ID            int    `json:"id"`
    ProviderName  string `json:"provider_name"`
    AboutProvider string `json:"about_provider"`
    Logo          string `json:"logo"`
    RTOCode       string `json:"rto_code"`
}

type Partner struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Logo string `json:"logo"`
}