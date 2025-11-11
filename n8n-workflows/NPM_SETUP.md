# n8n Setup Guide (NPM Installation)

Complete guide for setting up n8n using npm (no Docker required).

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- MongoDB running (local or Atlas)
- Gemini API key

## Installation

### 1. Install n8n Globally

```bash
npm install -g n8n
```

Or using npx (no installation needed):
```bash
npx n8n
```

### 2. Set Environment Variables

Create a `.env` file in your project root:

```bash
# n8n Configuration
N8N_PORT=5678
N8N_HOST=0.0.0.0
N8N_PROTOCOL=http
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Database (optional - uses SQLite by default)
DB_TYPE=sqlite
N8N_USER_FOLDER=~/.n8n

# API Configuration
N8N_API_KEY=your_n8n_api_key_here

# External Services
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/whatsapp-crm
WHATSAPP_API_TOKEN=your_whatsapp_token

# Webhook URL (for production)
WEBHOOK_URL=http://localhost:5678
```

### 3. Start n8n

```bash
# Using global installation
n8n start

# Or using npx
npx n8n start

# With custom port
N8N_PORT=5678 n8n start

# With environment file
export $(cat .env | xargs) && n8n start
```

### 4. Access n8n

Open your browser and navigate to:
```
http://localhost:5678
```

First time setup:
1. Create your admin account
2. Set up your workspace
3. You're ready to import workflows!

## Quick Start Script

Create `start-n8n-npm.sh`:

```bash
#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start n8n
echo "Starting n8n on port ${N8N_PORT:-5678}..."
n8n start
```

Make it executable:
```bash
chmod +x start-n8n-npm.sh
./start-n8n-npm.sh
```

## Importing Workflows

### Method 1: Via UI (Recommended)

1. Open n8n: `http://localhost:5678`
2. Click **Workflows** → **Add Workflow**
3. Click **⋮** (three dots) → **Import from File**
4. Select workflow JSON file from `n8n-workflows/` directory
5. Click **Import**
6. Configure credentials (see below)
7. Click **Save** and **Activate**

### Method 2: Via CLI

```bash
# Import all workflows
for file in n8n-workflows/*.json; do
  curl -X POST http://localhost:5678/api/v1/workflows \
    -H "X-N8N-API-KEY: your_api_key" \
    -H "Content-Type: application/json" \
    -d @"$file"
done
```

### Method 3: Copy to n8n Folder

```bash
# Copy workflows to n8n user folder
cp n8n-workflows/*.json ~/.n8n/workflows/
```

## Configuring Credentials

### MongoDB Credential

1. Go to **Credentials** in n8n sidebar
2. Click **Add Credential**
3. Search for "MongoDB"
4. Fill in:
   - **Name**: `MongoDB WhatsApp CRM`
   - **Connection String**: Your MongoDB URI
   - **Database**: `whatsapp-crm`
5. Click **Test** to verify connection
6. Click **Save**

### HTTP Request Authentication (Optional)

If your backend requires authentication:

1. Add **Header Auth** credential
2. Set header name: `Authorization`
3. Set header value: `Bearer your_token`

## Testing Workflows

### Test Webhook Workflows

```bash
# Test Lead Nurturing
curl -X POST http://localhost:5678/webhook/lead-nurturing \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "673e5f8a9b1c2d3e4f5a6b7c",
    "name": "John Doe",
    "phone_number": "+1234567890"
  }'

# Test Abandoned Cart
curl -X POST http://localhost:5678/webhook/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "673e5f8a9b1c2d3e4f5a6b7c",
    "product_id": "prod_123",
    "product_name": "Premium Package"
  }'

# Test Feedback Collection
curl -X POST http://localhost:5678/webhook/feedback-collection \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "673e5f8a9b1c2d3e4f5a6b7c",
    "product_name": "Premium Package"
  }'

# Test Lead Scoring
curl -X POST http://localhost:5678/webhook/lead-scoring \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "673e5f8a9b1c2d3e4f5a6b7c",
    "contact_id": "673e5f8a9b1c2d3e4f5a6b7d"
  }'
```

### Test in n8n UI

1. Open a workflow
2. Click **Execute Workflow** button (top right)
3. Provide test data if needed
4. Watch execution flow
5. Check node outputs

## Production Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start n8n with PM2
pm2 start n8n --name "n8n-whatsapp-crm" -- start

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/n8n.service`:

```ini
[Unit]
Description=n8n - Workflow Automation
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/your/project
Environment="N8N_PORT=5678"
Environment="GEMINI_API_KEY=your_key"
Environment="MONGODB_URI=your_mongodb_uri"
ExecStart=/usr/local/bin/n8n start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable n8n
sudo systemctl start n8n
sudo systemctl status n8n
```

### Using Docker Compose (Alternative)

If you prefer Docker later:

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - MONGODB_URI=${MONGODB_URI}
    volumes:
      - ~/.n8n:/home/node/.n8n
```

## Monitoring & Logs

### View Logs

```bash
# If using PM2
pm2 logs n8n-whatsapp-crm

# If using systemd
sudo journalctl -u n8n -f

# Direct n8n logs
tail -f ~/.n8n/logs/n8n.log
```

### Check Workflow Executions

1. Open n8n UI
2. Click **Executions** in sidebar
3. View all workflow runs
4. Click on execution to see details
5. Debug errors and check data flow

## Troubleshooting

### n8n Won't Start

```bash
# Check if port is already in use
lsof -i :5678

# Kill process using port
kill -9 <PID>

# Try different port
N8N_PORT=5679 n8n start
```

### MongoDB Connection Failed

```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/whatsapp-crm"

# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Gemini API Errors

```bash
# Test Gemini API
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Webhook Not Triggering

1. Check workflow is activated (toggle switch)
2. Verify webhook URL is correct
3. Check n8n logs for errors
4. Test with curl command
5. Ensure firewall allows port 5678

## Updating n8n

```bash
# Update global installation
npm update -g n8n

# Or reinstall
npm uninstall -g n8n
npm install -g n8n

# Check version
n8n --version
```

## Backup & Restore

### Backup Workflows

```bash
# Export all workflows
mkdir -p backups
cp ~/.n8n/database.sqlite backups/database-$(date +%Y%m%d).sqlite

# Or export via API
curl -X GET http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your_api_key" \
  > backups/workflows-$(date +%Y%m%d).json
```

### Restore Workflows

```bash
# Restore database
cp backups/database-20241111.sqlite ~/.n8n/database.sqlite

# Restart n8n
pm2 restart n8n-whatsapp-crm
```

## Performance Optimization

### Increase Memory Limit

```bash
# Set Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" n8n start
```

### Enable Execution Queue

```bash
# For high-volume workflows
N8N_EXECUTIONS_MODE=queue n8n start
```

### Database Optimization

Use PostgreSQL instead of SQLite for production:

```bash
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=your_password
```

## Security Best Practices

1. **Enable Basic Auth**: Always use authentication in production
2. **Use HTTPS**: Set up SSL/TLS with reverse proxy (nginx)
3. **Secure API Key**: Keep N8N_API_KEY secret
4. **Firewall**: Restrict access to port 5678
5. **Regular Updates**: Keep n8n updated
6. **Backup**: Regular database backups

## Support & Resources

- **n8n Documentation**: https://docs.n8n.io
- **Community Forum**: https://community.n8n.io
- **GitHub**: https://github.com/n8n-io/n8n
- **Discord**: https://discord.gg/n8n

## Next Steps

1. ✅ Install n8n
2. ✅ Import workflows
3. ✅ Configure credentials
4. ✅ Test workflows
5. ✅ Deploy to production
6. 📊 Monitor executions
7. 🎯 Customize for your needs

Happy Automating! 🚀
