#!/bin/bash

# WhatsApp CRM - n8n Quick Start Script
# This script helps you set up n8n for your agentic AI WhatsApp CRM

echo "🚀 Starting n8n for WhatsApp CRM..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Options:"
    echo "1. Install Docker: https://docs.docker.com/get-docker/"
    echo "2. Use npm instead: npm install n8n -g && n8n start"
    echo "3. Run fix script: ./fix-n8n-install.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo ""
    echo "Options:"
    echo "1. Install Docker Compose: https://docs.docker.com/compose/install/"
    echo "2. Run fix script: ./fix-n8n-install.sh"
    exit 1
fi

# Fix Docker credentials if needed
if [ -f ~/.docker/config.json ]; then
    if grep -q '"credsStore": "desktop"' ~/.docker/config.json; then
        echo "⚠️  Fixing Docker credentials..."
        cp ~/.docker/config.json ~/.docker/config.json.backup
        echo '{}' > ~/.docker/config.json
        echo "✅ Docker credentials fixed"
    fi
else
    mkdir -p ~/.docker
    echo '{}' > ~/.docker/config.json
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
    echo ""
    echo "Required variables:"
    echo "  - GEMINI_API_KEY (Get from: https://makersuite.google.com/app/apikey)"
    echo "  - MONGODB_URI (Get from: https://www.mongodb.com/cloud/atlas)"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if required variables are set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY is not set in .env file"
    exit 1
fi

if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI is not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Create workflows directory if it doesn't exist
mkdir -p n8n-workflows

# Start n8n with Docker Compose
echo "🐳 Starting n8n container..."
docker-compose -f n8n-docker-compose.yml up -d

# Wait for n8n to be ready
echo ""
echo "⏳ Waiting for n8n to start..."
sleep 10

# Check if n8n is running
if docker ps | grep -q n8n-whatsapp-crm; then
    echo ""
    echo "✅ n8n is running!"
    echo ""
    echo "📊 Access n8n at: http://localhost:5678"
    echo ""
    echo "🔐 Default credentials:"
    echo "   Username: admin"
    echo "   Password: change_this_password"
    echo ""
    echo "⚠️  IMPORTANT: Change the default password in n8n-docker-compose.yml"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Open http://localhost:5678 in your browser"
    echo "   2. Log in with the credentials above"
    echo "   3. Import workflows from n8n-workflows/ directory"
    echo "   4. Configure MongoDB credentials in n8n"
    echo "   5. Test your first workflow!"
    echo ""
    echo "📖 Full guide: See N8N_SETUP_GUIDE.md"
    echo ""
    echo "🛑 To stop n8n: docker-compose -f n8n-docker-compose.yml down"
    echo "📋 View logs: docker logs -f n8n-whatsapp-crm"
else
    echo ""
    echo "❌ Failed to start n8n"
    echo "Check logs: docker logs n8n-whatsapp-crm"
    exit 1
fi