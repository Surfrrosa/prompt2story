#!/bin/bash

echo "Testing PDF upload with messy_meeting_notes.pdf"
echo "================================================"
echo ""

PDF_PATH="/Users/surfrrosa/Downloads/messy_meeting_notes.pdf"

if [ ! -f "$PDF_PATH" ]; then
    echo "Error: PDF file not found at $PDF_PATH"
    exit 1
fi

echo "Uploading PDF to analyze-design endpoint..."
echo "File size: $(ls -lh "$PDF_PATH" | awk '{print $5}')"
echo ""

# Upload with timeout
curl -X POST "https://www.prompt2story.com/api/analyze-design" \
  -F "file=@${PDF_PATH}" \
  -F "prompt=Extract all issues and requirements from these meeting notes" \
  --max-time 65 \
  -w "\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n" \
  2>&1

echo ""
echo "Test complete!"