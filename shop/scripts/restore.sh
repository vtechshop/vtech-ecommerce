# FILE: scripts/restore.sh
#!/bin/bash

# Restore script for Shop platform
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_date>"
    echo "Example: ./restore.sh 20241201_120000"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/var/backups/shop"
MONGO_URI="mongodb://localhost:27017/shop"

echo "Restoring backup from $BACKUP_DATE"

# Restore MongoDB
if [ -f "$BACKUP_DIR/mongo_$BACKUP_DATE.tar.gz" ]; then
    echo "Restoring MongoDB..."
    tar -xzf "$BACKUP_DIR/mongo_$BACKUP_DATE.tar.gz" -C "$BACKUP_DIR"
    mongorestore --uri="$MONGO_URI" --drop "$BACKUP_DIR/mongo_$BACKUP_DATE"
    rm -rf "$BACKUP_DIR/mongo_$BACKUP_DATE"
else
    echo "MongoDB backup not found!"
    exit 1
fi

# Restore uploads
if [ -f "$BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz" ]; then
    echo "Restoring uploads..."
    tar -xzf "$BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz" -C /var/www/shop/apps/api/
else
    echo "Uploads backup not found!"
fi

echo "Restore completed!"