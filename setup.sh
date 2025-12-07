#!/bin/bash

echo "🚀 Negotiation Engine - Automated Setup"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Setup Backend
echo -e "\n${BLUE}Setting up backend...${NC}"
cd server
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Backend setup failed${NC}"
    exit 1
fi

# Setup Frontend
echo -e "\n${BLUE}Setting up frontend...${NC}"
cd ../client
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Frontend setup failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ Setup complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Open Terminal 1: cd server && npm start"
echo "2. Open Terminal 2: cd client && npm start"
echo "3. Access the app at http://localhost:3000"
