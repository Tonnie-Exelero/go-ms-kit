# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o micro-frontend-toolkit

# Run stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/micro-frontend-toolkit .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/.env .
EXPOSE 8080
CMD ["./micro-frontend-toolkit"]