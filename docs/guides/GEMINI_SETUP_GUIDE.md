# FREE Gemini API Setup Guide

## Why Gemini API?

Google's Gemini API is **completely FREE** and offers excellent performance for our agentic AI system. Unlike OpenAI's paid API, Gemini provides:

- ✅ **Free tier with generous limits**
- ✅ **No credit card required**
- ✅ **High-quality AI responses**
- ✅ **Fast response times**
- ✅ **Multimodal capabilities** (text, images, code)

## Getting Your FREE API Key

### Step 1: Visit Google AI Studio
Go to [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 2: Sign In
Sign in with your Google account (any Gmail account works)

### Step 3: Create API Key
1. Click **"Create API Key"**
2. Choose **"Create API key in new project"** (recommended)
3. Your API key will be generated instantly

### Step 4: Copy Your API Key
Copy the generated API key - it looks like: `AIzaSyC...`

### Step 5: Add to Environment
Add your API key to your `.env` file:
```env
GEMINI_API_KEY=AIzaSyC_your_actual_api_key_here
```

## API Limits (FREE Tier)

Gemini 1.5 Flash (what we use) offers generous free limits:
- **15 requests per minute**
- **1 million tokens per day**
- **1,500 requests per day**

This is more than enough for most WhatsApp CRM operations!

## Model Capabilities

### Gemini 1.5 Flash Features
- **Fast responses** (optimized for speed)
- **Large context window** (1 million tokens)
- **Multimodal** (text, images, code, audio, video)
- **Function calling** (for structured outputs)
- **JSON mode** (perfect for our triggers and analysis)

### What Our System Uses Gemini For
1. **Message Analysis**: Intent detection, sentiment analysis, topic extraction
2. **Response Generation**: Personalized customer responses
3. **Content Creation**: Dynamic message templates and campaigns
4. **Trigger Detection**: Pattern recognition in conversations
5. **Customer Insights**: Journey analysis and lead scoring

## Comparison with Other APIs

| Feature | Gemini (FREE) | OpenAI GPT-4 | Anthropic Claude |
|---------|---------------|--------------|------------------|
| Cost | **FREE** | $0.03/1K tokens | $0.015/1K tokens |
| Speed | Very Fast | Fast | Medium |
| Context | 1M tokens | 128K tokens | 200K tokens |
| Multimodal | ✅ Yes | ✅ Yes | ❌ No |
| JSON Mode | ✅ Yes | ✅ Yes | ❌ No |

## Testing Your Setup

Once you've added your Gemini API key, test it with this simple curl command:

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello! Can you help me test my Gemini API connection?"
      }]
    }]
  }'
```

You should get a JSON response with generated text.

## Best Practices

### 1. Prompt Engineering
Gemini responds well to clear, structured prompts:
```
You are a customer service agent. Analyze this message and return JSON with:
- intent: the customer's intent
- sentiment: positive/negative/neutral
- urgency: low/medium/high

Message: "Hi, I'm interested in your pricing"
```

### 2. Temperature Settings
- **0.2-0.3**: For analysis and structured tasks
- **0.7-0.8**: For creative content generation
- **0.9-1.0**: For highly creative tasks

### 3. Token Management
- Use `maxOutputTokens` to control response length
- Monitor your daily usage in Google AI Studio
- Implement fallback responses for rate limits

### 4. Error Handling
Always implement proper error handling:
```typescript
try {
  const response = await fetch(geminiUrl, options);
  const data = await response.json();
  
  if (data.error) {
    console.error('Gemini API error:', data.error);
    return fallbackResponse;
  }
  
  return data.candidates[0].content.parts[0].text;
} catch (error) {
  console.error('Network error:', error);
  return fallbackResponse;
}
```

## Monitoring Usage

### Google AI Studio Dashboard
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Go to **"API Keys"** section
3. Click on your API key to see usage statistics
4. Monitor daily token usage and request counts

### Rate Limit Handling
Our system automatically handles rate limits with:
- Exponential backoff retry logic
- Fallback to cached responses
- Graceful degradation to simpler responses

## Upgrading (Optional)

If you need higher limits, you can:
1. **Enable billing** in Google Cloud Console
2. **Increase quotas** for production use
3. **Use Gemini Pro** for more complex tasks

But for most WhatsApp CRM use cases, the **FREE tier is sufficient**!

## Troubleshooting

### Common Issues

#### "API key not valid"
- Double-check your API key in `.env`
- Make sure there are no extra spaces
- Regenerate the key if needed

#### "Quota exceeded"
- Check your daily usage in Google AI Studio
- Wait for quota reset (daily)
- Implement request queuing for high-volume

#### "Model not found"
- Use `gemini-1.5-flash-latest` (recommended)
- Alternative: `gemini-1.5-pro-latest`

### Getting Help
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Community Forum](https://discuss.ai.google.dev/)

---

**Your agentic AI WhatsApp CRM now runs completely FREE with Google's Gemini API!** 🎉