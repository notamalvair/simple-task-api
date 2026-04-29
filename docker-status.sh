#!/bin/bash
echo "=== Task API ==="
docker inspect task-api --format='{{.State.Status}}'
echo "=== Prometheus ==="
docker inspect prometheus --format='{{.State.Status}}'
