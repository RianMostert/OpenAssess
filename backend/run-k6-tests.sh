#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW} K6 Performance Testing Setup${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW} Installing k6...${NC}"
    
    # Install k6 using Homebrew (macOS)
    if command -v brew &> /dev/null; then
        brew install k6
    else
        echo -e "${RED} Homebrew not found. Please install k6 manually:${NC}"
        echo "Visit: https://k6.io/docs/get-started/installation/"
        exit 1
    fi
else
    echo -e "${GREEN} k6 is already installed${NC}"
fi

# Check if backend is running
echo -e "${YELLOW} Checking if backend is running...${NC}"
if curl -s http://localhost:8000/ > /dev/null; then
    echo -e "${GREEN} Backend is running${NC}"
else
    echo -e "${RED} Backend is not running on localhost:8000${NC}"
    echo -e "${YELLOW}Please start your backend first:${NC}"
    echo "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi

# Run the test
TEST_FILE=${1:-"auth-test.js"}
echo -e "${YELLOW} Running k6 test: ${TEST_FILE}${NC}"

cd k6-tests
k6 run "$TEST_FILE"

echo -e "${GREEN} Test completed!${NC}"