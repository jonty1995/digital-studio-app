@echo off
echo Starting Digital Studio Deployment...

:: Ensure we have the necessary directories for volumes (Relative to project root)
if not exist "../uploads" mkdir "../uploads"
if not exist "../logs" mkdir "../logs"
if not exist "../lab" mkdir "../lab"

echo Directories ready. Building and starting Docker containers...
docker compose -f ../docker-compose.yml up -d --build

echo.
echo Deployment initiated!
echo You can view logs with: docker compose logs -f
echo The application will be available at http://localhost once the frontend container is ready.
pause
