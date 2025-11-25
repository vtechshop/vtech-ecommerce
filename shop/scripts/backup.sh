# FILE: scripts/backup.sh
#!/bin/bash

# Backup script for Shop platform
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/shop"
MONGO_URI="mongodb://localhost:27017/shop"

echo "Starting backup at $DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# MongoDB backup
echo "Backing up MongoDB..."
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/mongo_$DATE"

# Compress MongoDB backup
tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" -C "$BACKUP_DIR" "mongo_$DATE"
rm -rf "$BACKUP_DIR/mongo_$DATE"

# Backup uploads
echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /var/www/shop/apps/api/uploads

# Clean old backups (keep last 7 days)
echo "Cleaning old backups..."
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"