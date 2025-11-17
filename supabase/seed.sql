-- Sample data for WhatsApp CRM

-- Insert sample follow-up rules
INSERT INTO follow_up_rules (name, trigger_condition, inactivity_hours, message_template, is_active) VALUES
('3-Day Follow-up', 'inactivity', 72, 'Hi {{name}}! 👋

Hope you''re doing well! I wanted to check in and see if there''s anything I can help you with.

Feel free to reach out anytime! 😊', true),
('1-Week Follow-up', 'inactivity', 168, 'Hello {{name}}! 

We haven''t heard from you in a while and wanted to make sure everything is okay. 

Is there anything we can assist you with? We''re here to help! 💪', true);

-- Insert sample AI intents
INSERT INTO ai_intents (intent_name, keywords, response_template, confidence_threshold, is_active) VALUES
('greeting', ARRAY['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'], 'Hello! 👋 Welcome! 

Great to hear from you! How can I assist you today? 😊', 0.8, true),
('pricing', ARRAY['price', 'cost', 'how much', 'quote', 'pricing', 'rate', 'charges'], 'I''d be happy to help with pricing information! 💰

Could you tell me more about what you''re interested in? That way I can provide you with the most accurate details.', 0.8, true),
('support', ARRAY['help', 'support', 'issue', 'problem', 'not working', 'error', 'trouble'], 'I''m here to help! 🛟

Could you please describe the issue you''re experiencing? I''ll do my best to assist you right away.', 0.8, true),
('business_card', ARRAY['lead', 'business card', 'visiting card', 'my card', 'my details', 'my info'], 'Great! I''d love to save your information! 📇

Please share your business card details or send an image, and I''ll save everything for you.', 0.9, true);

-- Insert sample campaign template
INSERT INTO campaigns (name, message_template, target_tags, status) VALUES
('Welcome Campaign', 'Hi {{name}}! 👋 Welcome to our service. We''re excited to have you here! Feel free to reach out if you have any questions.', ARRAY['new_customer'], 'draft'),
('Product Launch', 'Hello {{name}}! 🎉 We''re excited to announce our new product. Check it out and let us know what you think!', ARRAY['customer', 'interested'], 'draft');

-- Insert sample trigger
INSERT INTO triggers (name, event_type, conditions, action_type, action_config, is_active) VALUES
('Lead Keyword Trigger', 'keyword_detected', '{"keywords": ["lead", "business card"]}', 'add_tag', '{"tags": ["lead"]}', true),
('VIP Tag Assignment', 'keyword_detected', '{"keywords": ["vip", "premium"]}', 'add_tag', '{"tags": ["vip"]}', true);

-- Note: Contacts and conversations will be created automatically when messages are received
