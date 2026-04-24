#!/bin/bash
# Status check script for Digital Studio on Raspberry Pi 5

echo "==========================================="
echo "   DIGITAL STUDIO SERVICE STATUS"
echo "==========================================="
echo ""

# 1. Check Docker Containers
echo "--- Docker Containers ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "digital-studio|NAMES"
echo ""

# 2. Check Network Ports
echo "--- Network Connectivity ---"

check_port() {
    local port=$1
    local name=$2
    if nc -z localhost $port 2>/dev/null; then
        echo -e "[ OK ] $name is listening on port $port"
    else
        echo -e "[FAIL] $name is NOT listening on port $port"
    fi
}

check_port 3306 "Database (MariaDB)"
check_port 8081 "Backend (Spring Boot)"
check_port 80   "Frontend (Nginx)"

echo ""
echo "--- Resource Usage ---"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" digital-studio-db digital-studio-backend digital-studio-frontend

echo ""
echo "==========================================="
