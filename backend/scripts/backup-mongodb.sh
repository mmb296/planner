#!/bin/bash

# MongoDB Backup Script
# Backs up the MongoDB database from the Docker container

set -e

CONTAINER_NAME="mongodb"
DB_NAME="planner"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mongodb-backup-${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting MongoDB backup..."
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '$CONTAINER_NAME' is not running"
    exit 1
fi

# Create backup using mongodump inside the container
docker exec "$CONTAINER_NAME" mongodump \
    --db="$DB_NAME" \
    --archive \
    --gzip > "${BACKUP_FILE}.archive.gz"

if [ $? -eq 0 ]; then
    echo "✓ Backup completed successfully: ${BACKUP_FILE}.archive.gz"
    
    # Show backup file size
    if [ -f "${BACKUP_FILE}.archive.gz" ]; then
        SIZE=$(du -h "${BACKUP_FILE}.archive.gz" | cut -f1)
        echo "  Backup size: $SIZE"
    fi
    
    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR"/mongodb-backup-*.archive.gz 2>/dev/null | tail -5 || echo "  (no previous backups)"
else
    echo "✗ Backup failed"
    exit 1
fi
