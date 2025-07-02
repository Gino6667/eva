#!/bin/bash

BACKUP_DIR=backups
DATA_FILE=data.json

if [ ! -d "$BACKUP_DIR" ]; then
  echo "找不到備份目錄 $BACKUP_DIR"
  exit 1
fi

cd $BACKUP_DIR

echo "可用的備份檔案："
select file in data-*.json; do
  if [ -n "$file" ]; then
    cp "$file" ../$DATA_FILE
    echo "已還原 $file 至 ../$DATA_FILE"
    break
  else
    echo "請選擇有效的檔案編號。"
  fi
done 