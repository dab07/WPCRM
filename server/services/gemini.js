export class GeminiAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async analyzeMessage(message, context = {}) {
    const prompt = `You are an AI agent analyzing customer messages for a WhatsApp CRM. 
Analyze the message and return ONLY valid JSON with:
- intent: detected intent (greeting, question, complaint, interest, pricing, support, etc.)
- sentiment: positive, negative, or neutral
- urgency: low, medium, or high
- topics: array of topics discussed
- buying_signals: array of detected buying signals
- confidence: confidence score 0-1
- suggested_response: brief suggested response
- triggers: array of trigger names that should be activated

Message: "${message}"
Context: Customer has ${context.history?.length || 0} previous messages.

Return ONLY the JSON object, no other text:`;

    try {
      const response = await fetch(`${this.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          }
        }),
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        // Extract JSON from the response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    // Fallback response
    return {
      intent: 'unknown',
      sentiment: 'neutral',
      urgency: 'low',
      confidence: 0.5,
      suggested_response: 'Thank you for your message. How can I help you?',
      topics: [],
      buying_signals: [],
      triggers: []
    };
  }

  async generateResponse(analysis, customerData, conversationHistory = []) {
    const recentMessages = conversationHistory.slice(0, 5).map(m => 
      `${m.sender_type}: ${m.content}`
    ).join('\n');

    const prompt = `You are a helpful customer service agent for a WhatsApp CRM system.

Customer Information:
- Name: ${customerData.name}
- Phone: ${customerData.phone_number}
- Tags: ${customerData.tags?.join(', ') || 'none'}

Message Analysis:
- Intent: ${analysis.intent}
- Sentiment: ${analysis.sentiment}
- Topics: ${analysis.topics?.join(', ') || 'none'}

Recent Conversation:
${recentMessages || 'No previous messages'}

Generate a friendly, helpful, and professional response. Keep it concise (2-3 sentences) but engaging. Address the customer by name if appropriate.`;

    try {
      const response = await fetch(`${this.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        }),
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        return generatedText.trim();
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    // Fallback response
    return analysis.suggested_response || 'Thank you for your message. How can I help you?';
  }

  async generatePersonalizedContent(template, customerData, context = {}) {
    const prompt = `Generate a personalized message based on this template and customer data.

Template: ${template}

Customer Data:
${JSON.stringify(customerData, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Generate a natural, engaging message that personalizes the template with the customer data. Keep the tone friendly and professional.`;

    try {
      const response = await fetch(`${this.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          }
        }),
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        return generatedText.trim();
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    // Fallback: simple template replacement
    let message = template;
    for (const [key, value] of Object.entries(customerData)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return message;
  }

  async analyzeSentiment(text) {
    const prompt = `Analyze the sentiment of this message and return ONLY a JSON object with:
- sentiment: "positive", "negative", or "neutral"
- score: number between 0 and 1
- emotions: array of detected emotions

Message: "${text}"

Return ONLY the JSON object:`;

    try {
      const response = await fetch(`${this.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          }
        }),
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    return {
      sentiment: 'neutral',
      score: 0.5,
      emotions: []
    };
  }
}