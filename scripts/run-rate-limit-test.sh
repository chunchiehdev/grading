#!/bin/bash

# Gemini API Rate Limit Test Runner
# This script loads environment variables from .env and runs the test

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Gemini API Rate Limit Test"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file with your API keys:"
    echo ""
    echo "  GEMINI_API_KEY=your_key_here"
    echo "  GEMINI_API_KEY2=your_key2_here  # optional"
    echo "  GEMINI_API_KEY3=your_key3_here  # optional"
    echo ""
    exit 1
fi

# Load .env
echo "📂 Loading .env file..."
export $(cat .env | grep -E '^GEMINI_API_KEY' | xargs)

# Check keys
KEY_COUNT=0
if [ ! -z "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}✓ GEMINI_API_KEY loaded${NC}"
    KEY_COUNT=$((KEY_COUNT + 1))
else
    echo -e "${RED}❌ GEMINI_API_KEY not found in .env${NC}"
    exit 1
fi

if [ ! -z "$GEMINI_API_KEY2" ]; then
    echo -e "${GREEN}✓ GEMINI_API_KEY2 loaded${NC}"
    KEY_COUNT=$((KEY_COUNT + 1))
fi

if [ ! -z "$GEMINI_API_KEY3" ]; then
    echo -e "${GREEN}✓ GEMINI_API_KEY3 loaded${NC}"
    KEY_COUNT=$((KEY_COUNT + 1))
fi

echo ""
echo -e "${YELLOW}Testing with ${KEY_COUNT} API key(s)${NC}"
echo ""
echo "Press Ctrl+C to cancel, or wait 3 seconds to start..."
sleep 3

# Run test with environment variables
tsx scripts/test-gemini-rate-limits.ts

echo ""
echo -e "${GREEN}✓ Test completed!${NC}"
