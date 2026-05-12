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

FAILED=0

check_port() {
    local port=$1
    local name=$2
    if nc -z localhost $port 2>/dev/null; then
        echo -e "[ OK ] $name is listening on port $port"
    else
        echo -e "[FAIL] $name is NOT listening on port $port"
        FAILED=1
    fi
}

check_port 3306 "Database (MariaDB)"
check_port 8081 "Backend (Spring Boot)"
check_port 80   "Frontend (Nginx)"

echo ""
echo "--- Application Health (Actuator) ---"
if nc -z localhost 8081 2>/dev/null; then
    HEALTH_RESPONSE=$(curl -s http://localhost:8081/actuator/health)
    if [ -n "$HEALTH_RESPONSE" ]; then
        if echo "$HEALTH_RESPONSE" | grep -q '"status":"UP"'; then
            echo -e "[ OK ] Spring Boot application is UP and Healthy"
        else
            echo -e "[WARN] Application reports unhealthy or degraded state"
            echo "       Details: $HEALTH_RESPONSE"
            FAILED=1
        fi
    else
        echo -e "[FAIL] Actuator reachable but returned empty response"
        FAILED=1
    fi
else
    echo -e "[FAIL] Backend not running, skipping health check"
    FAILED=1
fi

echo ""
echo "--- Resource Usage ---"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" digital-studio-db digital-studio-backend digital-studio-frontend

echo ""
echo "==========================================="

if [ $FAILED -eq 1 ]; then
    echo "CRITICAL: One or more services are NOT running correctly."
    exit 1
fi

echo "All services are running perfectly."
exit 0
