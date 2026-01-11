#!/bin/bash

# Batch upload logos from Downloads/NGO folder to R2
# This script normalizes filenames and uploads to ngo-org-logo bucket

BUCKET="ngo-org-logo"
SOURCE_DIR="/Users/jameslo-aa/Downloads/NGO"
LOG_FILE="./upload-log.txt"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================" | tee "$LOG_FILE"
echo "Batch Logo Upload to R2" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Source: $SOURCE_DIR" | tee -a "$LOG_FILE"
echo "Bucket: $BUCKET" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Count total files
total_files=$(ls "$SOURCE_DIR" | wc -l | tr -d ' ')
echo "Total files to upload: $total_files" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

uploaded=0
failed=0

for file in "$SOURCE_DIR"/*; do
  if [ -f "$file" ]; then
    original_filename=$(basename "$file")

    # Normalize filename: remove double extensions
    # org_10.png.png -> org_10.png
    # org_26.png.jpeg -> org_26.jpeg
    normalized_filename=$(echo "$original_filename" | sed -E 's/\.png\.(png|jpeg)$/.\1/')

    # Special handling for org_245、246.png.png (use org_245.png)
    if [[ "$normalized_filename" == "org_245、246.png" ]]; then
      normalized_filename="org_245.png"
    fi

    echo -n "[$((uploaded + failed + 1))/$total_files] Uploading: $normalized_filename ... " | tee -a "$LOG_FILE"

    # Upload to R2
    if npx wrangler r2 object put "$BUCKET/$normalized_filename" --file="$file" --remote 2>&1 | tee -a "$LOG_FILE" > /dev/null; then
      echo -e "${GREEN}✓${NC}" | tee -a "$LOG_FILE"
      uploaded=$((uploaded + 1))
    else
      echo -e "${RED}✗${NC}" | tee -a "$LOG_FILE"
      failed=$((failed + 1))
    fi
  fi
done

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Upload Summary:" | tee -a "$LOG_FILE"
echo "  Total: $total_files" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}Uploaded: $uploaded${NC}" | tee -a "$LOG_FILE"
echo -e "  ${RED}Failed: $failed${NC}" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
