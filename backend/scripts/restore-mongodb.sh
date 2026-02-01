#!/bin/bash

# MongoDB Restore Script
# Restores the MongoDB database from a backup file

set -e

CONTAINER_NAME="mongodb"
DB_NAME="planner"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"

# Check if backup file was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file.archive.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/mongodb-backup-*.archive.gz 2>/dev/null || echo "  (no backups found)"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '$CONTAINER_NAME' is not running"
    exit 1
fi

echo "WARNING: This will replace the current '$DB_NAME' database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo ""
echo "Restoring MongoDB database..."
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"

# Restore using mongorestore inside the container
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" mongorestore \
    --db="$DB_NAME" \
    --archive \
    --gzip \
    --drop

if [ $? -eq 0 ]; then
    echo "✓ Restore completed successfully"
else
    echo "✗ Restore failed"
    exit 1
fi
