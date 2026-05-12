#!/bin/bash
# Log Management Script for Digital Studio (Spring Boot Actuator)

URL="http://localhost:8081/actuator/loggers/com.digitalstudio.app"

show_status() {
    echo "Checking current log level for com.digitalstudio.app..."
    RESPONSE=$(curl -s $URL)
    LEVEL=$(echo $RESPONSE | grep -oP '(?<="effectiveLevel":")[^"]*')
    CONFIGURED=$(echo $RESPONSE | grep -oP '(?<="configuredLevel":")[^"]*')
    
    echo "-------------------------------------------"
    echo "Configured Level: ${CONFIGURED:-NOT_SET}"
    echo "Effective Level:  $LEVEL"
    echo "-------------------------------------------"
}

set_level() {
    NEW_LEVEL=$1
    echo "Setting log level to: $NEW_LEVEL"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $URL \
         -H "Content-Type: application/json" \
         -d "{\"configuredLevel\": \"$NEW_LEVEL\"}")
         
    if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
        echo "SUCCESS: Log level updated."
        show_status
    else
        echo "FAILED: Received HTTP $HTTP_CODE"
    fi
}

case "$1" in
    status)
        show_status
        ;;
    info|INFO)
        set_level "INFO"
        ;;
    debug|DEBUG)
        set_level "DEBUG"
        ;;
    error|ERROR)
        set_level "ERROR"
        ;;
    *)
        echo "Usage: $0 {status|info|debug|error}"
        exit 1
        ;;
esac
