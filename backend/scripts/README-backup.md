# MongoDB Backup Scripts

Backup and restore scripts for the MongoDB Docker container.

## Manual Backup

Run a backup manually:

```bash
cd backend/scripts
./backup-mongodb.sh
```

Backups are saved to `backend/backups/` with timestamps:

- `mongodb-backup-20260201_143022.archive.gz`

## Restore from Backup

Restore from a backup file:

```bash
cd backend/scripts
./restore-mongodb.sh ../backups/mongodb-backup-20260201_143022.archive.gz
```

**Warning:** This will replace your current database!

## Automatic Backups (macOS)

To schedule automatic daily backups at 2 AM:

1. Open your crontab:

   ```bash
   crontab -e
   ```

2. Add this line (replace `$PROJECT_ROOT` with your project's absolute path):

   ```bash
   0 2 * * * cd $PROJECT_ROOT/backend/scripts && ./backup-mongodb.sh >> /tmp/mongodb-backup.log 2>&1
   ```

3. Save and exit

To schedule weekly backups (every Sunday at 2 AM):

```bash
0 2 * * 0 cd $PROJECT_ROOT/backend/scripts && ./backup-mongodb.sh >> /tmp/mongodb-backup.log 2>&1
```

## Cleanup Old Backups

To keep only the last 30 days of backups:

```bash
find backend/backups -name "mongodb-backup-*.archive.gz" -mtime +30 -delete
```

Add to crontab to run monthly (replace `$PROJECT_ROOT` with your project's absolute path):

```bash
0 3 1 * * find $PROJECT_ROOT/backend/backups -name "mongodb-backup-*.archive.gz" -mtime +30 -delete
```

## Notes

- Backups are compressed `.archive.gz` files
- The MongoDB container must be running for backups/restores to work
- Backups include the entire `planner` database
