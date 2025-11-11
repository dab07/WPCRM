# MongoDB Setup Guide

## Quick Start

### 1. Set Up MongoDB Atlas (FREE)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a FREE account
3. Create a new cluster (M0 FREE tier - 512MB)
4. Wait for cluster to be created (2-3 minutes)

### 2. Configure Database Access

1. In MongoDB Atlas, go to **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Set username and password (save these!)
5. Set **Database User Privileges** to "Read and write to any database"
6. Click **Add User**

### 3. Configure Network Access

1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
   - Or add your specific IP address for production
4. Click **Confirm**

### 4. Get Connection String

1. Go to **Database** (Clusters)
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Replace `username` with your actual username

### 5. Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=whatsapp_crm

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
```

### 6. Test MongoDB Connection

Run the test script to verify your connection:

```bash
npm run test:db
```

You should see:
```
✅ Successfully connected to MongoDB!
📦 Available collections: (will be created automatically)
✨ All tests passed! MongoDB is ready to use.
```

### 7. Start the Server

```bash
# Install server dependencies (if not already done)
cd server
npm install
cd ..

# Start the backend server
npm run server

# In another terminal, start the frontend
npm run dev
```

## Database Structure

The following collections will be created automatically:

### Collections

1. **contacts** - Customer information
   - phone_number (unique)
   - name, email, company
   - tags (array)
   - source, metadata
   - created_at, updated_at

2. **conversations** - Chat sessions
   - contact_id
   - assigned_agent_id
   - status (active, ai_handled, agent_assigned, closed)
   - last_message_at, last_message_from
   - ai_confidence_score, handover_reason

3. **messages** - Individual messages
   - conversation_id
   - sender_type (customer, agent, ai, system)
   - content, message_type
   - media_url, whatsapp_message_id
   - delivery_status, created_at

4. **campaigns** - Bulk messaging
   - name, message_template
   - target_tags, target_contact_ids
   - scheduled_at, status
   - total_recipients, sent_count

5. **triggers** - Event-based automation
   - name, type, condition, action
   - is_active, execution_count

6. **follow_up_rules** - Automation rules
   - name, trigger_condition
   - days_threshold, message_template
   - is_active

7. **workflow_executions** - n8n workflow logs
   - workflow_name, contact_id
   - status, started_at, completed_at
   - execution_time_ms, result

## Troubleshooting

### Connection Failed

**Error**: `MongoServerError: bad auth`
- **Solution**: Check your username and password in MONGODB_URI
- Make sure you replaced `<password>` with your actual password

**Error**: `MongoNetworkError: connection timeout`
- **Solution**: Check Network Access in MongoDB Atlas
- Add your IP address or allow access from anywhere

**Error**: `ENOTFOUND cluster0.xxxxx.mongodb.net`
- **Solution**: Check your internet connection
- Verify the connection string is correct

### Database Not Found

- Don't worry! MongoDB creates the database automatically when you first insert data
- The database name is specified in `MONGODB_DB_NAME`

### Collections Not Showing

- Collections are created automatically when you first insert data
- Indexes are created when the server starts
- Run the test script to create a test collection

## MongoDB Atlas Tips

### Free Tier Limits
- 512 MB storage
- Shared RAM
- No backups (upgrade for backups)
- Perfect for development and small projects

### Monitoring
- Go to **Metrics** in MongoDB Atlas to see:
  - Connection count
  - Operations per second
  - Network traffic
  - Storage usage

### Backup (Paid Feature)
- For production, consider upgrading to M10+ for automated backups
- Or implement your own backup strategy using `mongodump`

## Next Steps

1. ✅ Test MongoDB connection
2. ✅ Start the backend server
3. ✅ Start the frontend
4. 🔄 Test creating contacts, conversations, and messages
5. 🔄 Configure WhatsApp webhook
6. 🔄 Set up n8n workflows

## Support

If you encounter issues:
1. Check the MongoDB Atlas status page
2. Verify your .env file configuration
3. Check server logs for detailed error messages
4. Ensure your IP is whitelisted in Network Access
