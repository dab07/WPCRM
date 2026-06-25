1. Core Purpose
The system is an Opportunity Engine tailored for marketing agencies managing Shopify and Omnisend stores. Instead of marketers manually analyzing data to find campaign angles, the AI automates the discovery process.

It scans 8 distinct data sources (triggers) daily, ranks the potential marketing opportunities based on projected revenue impact, and generates Campaign Briefs. A human marketer reviews these briefs. Upon approval, the AI builds a draft segment, draft campaign, and creative brief directly inside Omnisend.

IMPORTANT

Human-in-the-loop design: The AI handles the heavy lifting of data analysis, strategy, and copy drafting. However, the Send button is always gated by the human marketer in the Omnisend dashboard. The agent never sends campaigns autonomously.

2. High-Level Architecture
The application is a stateless two-tier structure, relying on PostgreSQL and Redis for persistence and queue management.

Web Interface (Next.js 15 App Router):
Provides the Inbox where marketers review prioritized opportunities.
Handles the approval workflows for Campaign Briefs.
Manages Brand Guidelines and Store configurations.
Exposes APIs for manual scan triggers and brief interactions.
Background Worker (BullMQ on Node.js):
Runs daily and weekly cron jobs (daily-scan-all, weekly-flow-audit).
Syncs state from Shopify and Omnisend.
Executes the heavy LLM tasks (generating briefs and final copy).
Handles the direct Omnisend API integration to create draft campaigns (build-draft).
Tech Stack & Integrations
Database: PostgreSQL (accessed via Prisma ORM).
Queue/Cache: Redis for BullMQ task management.
LLM Provider: Google Gemini / OpenAI (configurable via .env) with structured outputs for predictable JSON generation.
External Signals: OpenWeather API and PredictHQ API for micromoment (weather, events, news) triggers.
3. The 8 Trigger Families
The engine identifies opportunities through 8 core scanners located in lib/scanners/. Each is a pure function that emits Opportunity records.

Micromoments (micromoment.ts): Reacts to local weather changes (OpenWeather) or events (PredictHQ). Example: A cold front is coming, prompting a knitwear push.
Calendar (calendar.ts): Targets public holidays, store key dates, and paydays.
Lifecycle / RFM (lifecycle.ts): Analyzes Shopify orders to find dormancy trends, pre-churn users, and VIP graduations.
Behavioral (behavioral.ts): Scans Omnisend metrics for cart abandonment or browse-no-buy contacts that fall outside standard automation windows.
Replenishment (replenishment.ts): Identifies customers approaching the median repurchase interval for specific SKUs.
Inventory (inventory.ts): Reacts to Shopify stock levels to push overstocked items or create urgency around low-stock top sellers.
Campaign Performance (performance.ts): Analyzes past Omnisend campaigns to identify and suggest repeating winning marketing angles.
Flow Audit (flow-audit.ts): A weekly scan that compares current Omnisend automations against industry best practices.
4. Core Workflow (Phase 1 to Phase 2)
The system operates in a strict two-phase process: Suggest (Phase 1) and Execute (Phase 2).

Phase 1: Suggestion
Sync: The worker syncs Shopify orders/products and Omnisend contacts/stats (sync-shopify, sync-omnisend).
Scan: The 8 scanners run concurrently to generate raw Opportunity records.
Rank: Opportunities are ranked using the ranking/impact-estimator.ts based on: estimated reach × estimated conversion rate × expected AOV. The system also applies penalties for competing touches (e.g., if a contact is already receiving a campaign) and sensitivity.
Generate Brief: For the top N opportunities, the LLM generates a structured CampaignBrief detailing the core message, suggested products, and target audience.
Phase 2: Execution
Approval Gate: Once the marketer approves the brief, execution begins. Note: This is hard-gated by the existence of a BrandGuideline. If no guideline exists, the action is blocked.
Segment & Copy Generation: The worker translates the brief into an Omnisend filter payload. It generates the final copy (subject lines, preview, body) using the LLM against the store's brand guidelines and tone voice rules.
Omnisend API Draft: The worker pushes a draft segment and campaign into Omnisend (build-draft.ts).
Compliance Run: Evaluates the draft against strict rules (e.g., SMS opt-out string presence, frequency caps, tone sensitivity score). If it fails, the draft is flagged as needs_revision.
5. Performance Learning Loop
The engine features a continuous learning loop.

A daily job (post-send-metrics.ts) pulls campaign performance stats from Omnisend.
It attributes opens, clicks, and revenue back to the original CampaignBrief using an angleTag and themeTag embedded during the draft creation.
This historical data feeds back into the performance scanner and updates the store's baseline metrics, allowing the LLM and ranking algorithm to make smarter, proven suggestions over time.
6. Key Data Models (Prisma)
Opportunity: The raw output from a scanner containing the projected impact and matching segments.
CampaignBrief: The human-readable marketing proposal generated by the LLM from an Opportunity.
CampaignExecution: The record tracking the state of the drafted campaign inside Omnisend, including compliance checks and deep links.
BrandGuideline: The markdown rules that dictate the LLM's copy generation tone.