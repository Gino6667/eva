#!/bin/bash

BACKUP_DIR=backups
DATA_FILE=data.json
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
cp $DATA_FILE $BACKUP_DIR/data-$DATE.json

echo "已備份 $DATA_FILE 至 $BACKUP_DIR/data-$DATE.json" 