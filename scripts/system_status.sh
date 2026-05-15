#!/bin/bash
# System Status Script for Raspberry Pi 5

echo "==========================================="
echo "   RASPBERRY PI 5 SYSTEM HEALTH"
echo "==========================================="

# 1. CPU Temperature
if command -v vcgencmd &> /dev/null; then
    TEMP=$(vcgencmd measure_temp | grep -oP '[0-9.]+')
    echo "CPU Temp:     $TEMP°C"
else
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
        echo "CPU Temp:     $(($TEMP/1000))°C"
    else
        echo "CPU Temp:     N/A"
    fi
fi

# 2. RAM Usage
echo -n "RAM Usage:    "
free -h | grep Mem | awk '{print $3 "/" $2}' 2>/dev/null || echo "N/A"

# 3. Disk Space (Root)
echo -n "Disk Space:   "
df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}' 2>/dev/null || echo "N/A"

# 4. Storage Breakdown
echo "-------------------------------------------"
echo "   STORAGE BREAKDOWN"
echo "-------------------------------------------"

get_size() {
    local path=$1
    if [ -d "$path" ]; then
        du -sh "$path" 2>/dev/null | awk '{print $1}'
    else
        echo "MISSING"
    fi
}

echo "Uploads:      $(get_size "../uploads")"
echo "Lab Files:    $(get_size "../lab")"
echo "App Logs:     $(get_size "./logs")"

# 5. Docker Containers
echo "-------------------------------------------"
echo "   DOCKER CONTAINER STATUS"
echo "-------------------------------------------"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "NAMES"
else
    echo "Docker not installed"
fi

echo "==========================================="
