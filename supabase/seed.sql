-- Seed data for development

-- Insert sample AI intents
INSERT INTO ai_intents (intent_name, keywords, response_template, confidence_threshold, is_active) VALUES
('greeting', ARRAY['hello', 'hi', 'hey', 'good morning', 'good afternoon'], 'Hello! How can I help you today?', 0.70, true),
('thanks', ARRAY['thank you', 'thanks', 'appreciate'], 'You''re welcome! Let me know if you need anything else.', 0.70, true),
('business_hours', ARRAY['hours', 'open', 'close', 'timing', 'schedule'], 'We are open Monday to Friday, 9 AM to 6 PM. How can I assist you?', 0.70, true),
('pricing', ARRAY['price', 'cost', 'how much', 'pricing'], 'I''d be happy to discuss pricing with you. Let me connect you with our sales team.', 0.60, true);

-- Insert sample contacts
INSERT INTO contacts (phone_number, name, email, company, tags, source) VALUES
('+1234567890', 'John Doe', 'john@example.com', 'Acme Corp', ARRAY['lead', 'interested'], 'website'),
('+1234567891', 'Jane Smith', 'jane@example.com', 'Tech Inc', ARRAY['customer', 'vip'], 'referral'),
('+1234567892', 'Bob Johnson', 'bob@example.com', NULL, ARRAY['lead'], 'whatsapp');

-- Insert sample follow-up rules
INSERT INTO follow_up_rules (name, trigger_condition, days_threshold, message_template, is_active) VALUES
('Inactive Lead Follow-up', 'no_response', 3, 'Hi! Just checking in. Are you still interested in our services?', true),
('Post-Purchase Check-in', 'purchase_made', 7, 'How are you enjoying your purchase? We''d love to hear your feedback!', true);
