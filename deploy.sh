#!/bin/bash
echo "Starting Digital Studio Deployment..."

# Ensure we have the necessary directories for volumes
mkdir -p uploads logs lab

echo "Directories ready. Building and starting Docker containers..."
# Use docker compose plugin (standard for modern Docker installations)
docker compose up -d --build

echo ""
echo "Deployment initiated!"
echo "You can view logs with: docker compose logs -f"
echo "The application will be available at http://localhost once the frontend container is ready."
