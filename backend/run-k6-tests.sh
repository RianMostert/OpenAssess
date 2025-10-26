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

# Available tests
echo -e "${YELLOW}Available tests:${NC}"
echo "1. auth-test.js - Basic authentication testing"
echo "2. course-management-test.js - Course operations and navigation"  
echo "3. assessment-operations-test.js - Assessment stats and heavy queries"
echo "4. file-operations-test.js - File upload/download stress testing"
echo "5. query-endpoints-test.js - Student/mark queries and export testing"
echo "6. load-test-realistic.js - Realistic user behavior simulation"
echo "7. mark-query-triage-test.js - Mark query triage dashboard"
echo "8. mark-query-batch-test.js - Batch query operations"
echo "9. pdf-export-test.js - PDF export and ZIP generation"
echo "10. grading-workflow-test.js - Complete grading workflow"
echo "11. all - Run all tests sequentially"
echo "12. critical - Run only critical tests (7-10)"
echo ""

# Run the test
TEST_FILE=${1:-"auth-test.js"}

if [ "$TEST_FILE" = "all" ]; then
    echo -e "${YELLOW} Running all k6 tests...${NC}"
    cd tests/k6-tests
    
    for test_file in auth-test.js course-management-test.js assessment-operations-test.js file-operations-test.js query-endpoints-test.js load-test-realistic.js mark-query-triage-test.js mark-query-batch-test.js pdf-export-test.js grading-workflow-test.js; do
        echo -e "${YELLOW} Running: ${test_file}${NC}"
        k6 run "$test_file"
        echo -e "${GREEN} Completed: ${test_file}${NC}"
        echo "----------------------------------------"
        sleep 2
    done
elif [ "$TEST_FILE" = "critical" ]; then
    echo -e "${YELLOW} Running CRITICAL k6 tests only...${NC}"
    cd tests/k6-tests
    
    for test_file in mark-query-triage-test.js mark-query-batch-test.js pdf-export-test.js grading-workflow-test.js; do
        echo -e "${YELLOW} Running: ${test_file}${NC}"
        k6 run "$test_file"
        echo -e "${GREEN} Completed: ${test_file}${NC}"
        echo "----------------------------------------"
        sleep 2
    done
else
    echo -e "${YELLOW} Running k6 test: ${TEST_FILE}${NC}"
    cd tests/k6-tests
    k6 run "$TEST_FILE"
fi

echo -e "${GREEN} Test completed!${NC}"