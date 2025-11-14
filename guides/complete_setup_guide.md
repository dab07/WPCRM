# n8n Self-Hosting Setup Guide

Complete guide for setting up n8n locally using `npx n8n` for your WhatsApp CRM system.

## Quick Start

### 1. Install and Run n8n

```bash
# Run n8n locally (will install automatically on first run)
npx n8n

# Or with custom port
npx n8n start --tunnel
```

Default access: `http://localhost:5678`

### 2. Initial Configuration

On first launch:
1. Open `http://localhost:5678` in your browser
2. Create your admin account (email + password)
3. Complete the onboarding wizard

### 3. Enable API Access

**Via UI:**
1. Click your profile icon (bottom left)
2. Go to **Settings** → **API**
3. Click **Create API Key**
4. Copy the generated key
5. Save it securely

**Via Environment Variables:**
```bash
# Create .n8n folder in your home directory
mkdir -p ~/.n8n

# Set environment variables
export N8N_API_KEY_AUTH_ENABLED=true
export N8N_ENCRYPTION_KEY="your-secure-encryption-key"
```

### 4. Update Your CRM Environment Variables

Add to your `.env.local` file:

```env
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key-from-step-3
```

## Import Workflows

### Method 1: Via UI (Recommended)

1. Open n8n at `http://localhost:5678`
2. Click **Workflows** in the left sidebar
3. Click **Import from File**
4. Select **Supabase workflow** JSON files from `n8n-workflows/` directory:
   - `1-lead-nurturing-supabase.json`
   - `2-abandoned-cart-supabase.json`
   - `3-feedback-collection-supabase.json`
   - `4-smart-reengagement-supabase.json`
   - `5-ai-lead-scoring-supabase.json`
5. Activate each workflow after import

**Note**: Use the `-supabase.json` versions as they are configured for your Supabase database.

### Method 2: Via API

```bash
# Import a workflow using curl
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @n8n-workflows/1-lead-nurturing-supabase.json
```

## Configure Workflow Credentials

Each workflow needs proper credentials configured:

### 1. Supabase API Credentials

For all workflows that interact with your database:

1. In n8n, go to **Credentials** → **New**
2. Search for **Supabase API**
3. Add:
   - **Host**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Secret**: Your Supabase service role key (from Supabase dashboard → Settings → API)

**Important**: All workflows use Supabase's REST API via HTTP requests, not MongoDB.

### 2. HTTP Request Credentials (for WhatsApp)

If using WhatsApp Business API:

1. Go to **Credentials** → **New**
2. Search for **HTTP Header Auth**
3. Add:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_WHATSAPP_ACCESS_TOKEN`

### 3. Gemini AI Credentials

For AI-powered workflows, set environment variable:

```bash
export GEMINI_API_KEY=your-gemini-api-key
```

Or add to your n8n environment configuration. The workflows use this via `$env.GEMINI_API_KEY`.

## Webhook Configuration

### Enable Webhooks in n8n

```bash
# Run n8n with webhook support
npx n8n start --tunnel

# Or set webhook URL manually
export WEBHOOK_URL=http://localhost:5678
npx n8n
```

### Configure Webhooks in Your CRM

Update your trigger system to call n8n webhooks:

```typescript
// Example: Trigger n8n workflow from your CRM
const triggerWorkflow = async (workflowId: string, data: any) => {
  const response = await fetch(`${process.env.N8N_BASE_URL}/webhook/${workflowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
};
```

## Production Deployment Options

### Option 1: Docker (Recommended for Production)

```bash
# Pull n8n Docker image
docker pull n8nio/n8n

# Run with persistent data
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Option 2: PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start n8n with PM2
pm2 start n8n

# Save PM2 configuration
pm2 save

# Enable startup on boot
pm2 startup
```

### Option 3: Cloud Hosting

- **n8n Cloud**: https://n8n.io/cloud (easiest, managed service)
- **Railway**: One-click deploy
- **Heroku**: Use n8n buildpack
- **DigitalOcean**: Docker droplet

## Environment Variables Reference

```bash
# Basic Configuration
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost

# Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-encryption-key

# API
N8N_API_KEY_AUTH_ENABLED=true

# Webhooks
WEBHOOK_URL=http://localhost:5678

# Database (optional - uses SQLite by default)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=n8n

# Timezone
GENERIC_TIMEZONE=America/New_York

# Supabase (for workflows)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (for workflows)
GEMINI_API_KEY=your-gemini-api-key
```

## Testing Your Setup

### 1. Test n8n API Connection

```bash
# Check if n8n is running
curl http://localhost:5678/healthz

# List workflows
curl -X GET http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key"
```

### 2. Test Workflow Execution

```bash
# Trigger a workflow via webhook
curl -X POST http://localhost:5678/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"contact_id": "123", "message": "test"}'
```

### 3. Test from Your CRM

1. Open your CRM dashboard
2. Go to **n8n Integration** tab
3. Click **Test Connection**
4. Should see "Connected" status with workflow count

## Troubleshooting

### n8n Won't Start

```bash
# Clear n8n cache
rm -rf ~/.n8n/cache

# Check if port 5678 is in use
lsof -i :5678

# Kill process using port 5678
kill -9 $(lsof -t -i:5678)
```

### API Key Not Working

1. Regenerate API key in n8n UI
2. Update `.env.local` with new key
3. Restart your Next.js dev server

### Workflows Not Executing

1. Check workflow is **Active** (toggle in n8n UI)
2. Verify credentials are properly configured
3. Check execution logs in n8n UI
4. Ensure webhook URLs are correct

### CORS Issues

Add to n8n environment:

```bash
export N8N_CORS_ORIGIN="http://localhost:3000"
```

## Next Steps

1. ✅ Start n8n: `npx n8n`
2. ✅ Create admin account
3. ✅ Generate API key
4. ✅ Update `.env.local` with n8n credentials
5. ✅ Import all 5 workflows
6. ✅ Configure Supabase credentials in n8n
7. ✅ Activate workflows
8. ✅ Test connection from CRM dashboard
9. ✅ Create your first trigger in CRM
10. ✅ Monitor executions in n8n UI

## Useful Resources

- **n8n Documentation**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- **Workflow Templates**: https://n8n.io/workflows
- **API Reference**: https://docs.n8n.io/api/

## Support

If you encounter issues:
1. Check n8n logs: `~/.n8n/logs/`
2. Visit n8n community forum
3. Check workflow execution history in n8n UI
4. Verify all credentials are properly configured