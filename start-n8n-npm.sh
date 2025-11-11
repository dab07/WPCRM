#!/bin/bash

# n8n NPM Startup Script
# This script starts n8n using npm installation (no Docker)

set -e

echo "🚀 Starting n8n WhatsApp CRM Automation..."
echo ""

# Check if n8n is installed
if ! command -v n8n &> /dev/null; then
    echo "❌ n8n is not installed globally"
    echo ""
    echo "Install n8n with:"
    echo "  npm install -g n8n"
    echo ""
    echo "Or run with npx (no installation needed):"
    echo "  npx n8n start"
    exit 1
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  No .env file found. Using default configuration."
fi

# Set default values if not provided
export N8N_PORT=${N8N_PORT:-5678}
export N8N_HOST=${N8N_HOST:-0.0.0.0}
export N8N_PROTOCOL=${N8N_PROTOCOL:-http}

# Check if MongoDB is accessible
if [ ! -z "$MONGODB_URI" ]; then
    echo "🔍 Checking MongoDB connection..."
    if command -v mongosh &> /dev/null; then
        if mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" &> /dev/null; then
            echo "✅ MongoDB is accessible"
        else
            echo "⚠️  MongoDB connection failed. Workflows may not work properly."
        fi
    else
        echo "⚠️  mongosh not found. Skipping MongoDB check."
    fi
fi

# Check if Gemini API key is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY not set. AI features will not work."
else
    echo "✅ Gemini API key configured"
fi

echo ""
echo "📊 n8n Configuration:"
echo "  Port: $N8N_PORT"
echo "  Host: $N8N_HOST"
echo "  Protocol: $N8N_PROTOCOL"
echo "  User Folder: ${N8N_USER_FOLDER:-~/.n8n}"
echo ""
echo "🌐 Access n8n at: ${N8N_PROTOCOL}://localhost:${N8N_PORT}"
echo ""
echo "Press Ctrl+C to stop n8n"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start n8n
n8n start
