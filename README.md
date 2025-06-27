# Micro Frontend Toolkit

This is a fast-track toolkit for building micro frontend services using Go 1.22, Gin, HTMX, and Templ. The project is organized into a typical web application structure with separate folders for handlers, middleware, routes, and assets. It also includes a sample authentication flow using a service like Supabase Auth.

## Features

- **Go 1.22 & Gin:** High-performance backend service.
- **HTMX:** Dynamic frontend interactions without heavy JavaScript frameworks.
- **Templ:** Compile-time safe templating engine.
- **Structured project:** Organized folders for handlers, middleware, routes, and assets.
- **Authentication:** Example middleware and endpoint for Supabase-like auth.
- **Docker & Makefile:** Ready-to-use Dockerfile and Makefile for easy building and running.
- **Environment variables:** Configuration via a .env file.

## Project Structure

```
github.com/Tonnie-Exelero/go-ms-kit/tree/main/
├── Dockerfile
├── Makefile
├── .env
├── go.mod
├── main.go
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── images/
│       └── logo.png
├── handlers/
│   ├── auth.go
│   ├── home.go
│   └── course.go
├── middleware/
│   └── auth.go
├── routes/
│   └── routes.go
└── templates/
    ├── index.templ
    ├── cards.templ
    ├── card.templ
    └── home.templ

```

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone [MF-Toolkit URL](https://github.com/DarrylOrchestraX/orchestrax-mf-toolkit.git)
   cd github.com/Tonnie-Exelero/go-ms-kit/tree/main

   ```

2. **Using Toolkit**

```
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Context-Aware Micro Frontend</title>
    <!-- Optionally include a meta tag to override the default keyword -->
    <!-- <meta name="mf-keyword" content="custom-keyword"> -->
  </head>
  <body>
    <!-- Main container for the inline view -->
    <div id="mf-container"></div>
    <!-- (If using inline detail mode, include a container for details) -->
    <div id="mf-detail-container"></div>

    <!-- Include the SDK -->
    <script src="https://yourcdn.com/micro-frontend-sdk.js"></script>

    <script>
      document.addEventListener("DOMContentLoaded", function() {
        MicroFrontend.init({
          mainMode: "inline",
          detailMode: "modal",
          target: "#mf-container",
          serviceUrl: "https://microfrontend.example.com/items",
          defaultKeyword: "courses" // This is used if no meta tag is found.
        });
      });
    </script>
  </body>
</html>
```
