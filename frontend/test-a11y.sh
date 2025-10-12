#!/bin/bash

echo "Running accessibility tests..."

URLS=(
  "http://localhost:3000"
  "http://localhost:3000/auth/login" 
  "http://localhost:3000/auth/register"
)

for url in "${URLS[@]}"; do
  echo "Testing: $url"
  pa11y --config .pa11yrc.js "$url"
  echo ""
done

echo "All tests completed"