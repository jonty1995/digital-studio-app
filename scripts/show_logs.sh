#!/bin/bash
# Show live backend logs for Digital Studio on Raspberry Pi 5

echo "--- Streaming Live Backend Logs (Press Ctrl+C to stop) ---"
docker compose logs -f backend
