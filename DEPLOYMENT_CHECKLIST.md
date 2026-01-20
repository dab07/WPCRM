# Festival Campaigns - Deployment Checklist

## Pre-Deployment

- [ ] Review all code changes
- [ ] Run TypeScript compiler: `npm run typecheck`
- [ ] Run ESLint: `npm run lint`
- [ ] Test locally: `npm run dev`
- [ ] Verify all diagnostics are clean

## Database

- [ ] Backup existing database
- [ ] Apply migration: `supabase migration up`
- [ ] Verify new columns exist:
  - [ ] `campaigns.festival_type`
  - [ ] `campaigns.greeting_text`
  - [ ] `campaigns.include_image`
  - [ ] `campaigns.image_theme`
- [ ] Verify indexes created
- [ ] Test database queries

## Environment Variables

- [ ] Verify `GEMINI_API_KEY` is set
- [ ] Verify `WHATSAPP_PHONE_NUMBER_ID` is set
- [ ] Verify `WHATSAPP_ACCESS_TOKEN` is set
- [ ] Test WhatsApp API connectivity

## API Endpoints

- [ ] Test `POST /api/campaigns/festival` - Create campaign
- [ ] Test `GET /api/campaigns/festival` - List campaigns
- [ ] Test `POST /api/campaigns/festival?preview_image=true` - Preview image
- [ ] Test `POST /api/campaigns/orchestrator` - Execute campaign
- [ ] Test `GET /api/campaigns/orchestrator` - List all campaigns
- [ ] Verify error handling for all endpoints

## Components

- [ ] Test `FestivalCampaignForm` component
  - [ ] Festival selection works
  - [ ] Message template input works
  - [ ] Image preview generates correctly
  - [ ] Form submission works
  - [ ] Error messages display
- [ ] Test `FestivalCampaignsList` component
  - [ ] Campaigns load correctly
  - [ ] Status badges display
  - [ ] Execute button works
  - [ ] Copy button works

## Services

- [ ] Test `FestivalImageService`
  - [ ] SVG generation works
  - [ ] All 8 festivals supported
  - [ ] Logo loading works (or gracefully fails)
  - [ ] Error handling works
- [ ] Test `CampaignOrchestrator`
  - [ ] Campaign creation works
  - [ ] Campaign execution works
  - [ ] Image generation during execution works
  - [ ] Message personalization works
- [ ] Test `WhatsAppService`
  - [ ] Text messages still work
  - [ ] Image messages work
  - [ ] Rate limiting works
  - [ ] Error handling works

## Integration Tests

- [ ] Create a test campaign with all festivals
- [ ] Verify images generate correctly for each festival
- [ ] Send test messages to WhatsApp
- [ ] Verify messages arrive with images
- [ ] Verify message personalization works
- [ ] Check database records are created correctly

## Performance Tests

- [ ] Test batch processing with 100+ contacts
- [ ] Verify rate limiting (200ms between messages)
- [ ] Monitor memory usage during campaign execution
- [ ] Check database query performance
- [ ] Verify image generation performance

## Security

- [ ] Verify API authentication (if applicable)
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify WhatsApp credentials are not logged
- [ ] Check for XSS vulnerabilities in UI
- [ ] Verify CORS settings are correct

## Documentation

- [ ] Verify all documentation is accurate
- [ ] Test all code examples in documentation
- [ ] Verify API examples work
- [ ] Check for broken links
- [ ] Verify screenshots/diagrams are current

## Rollback Plan

- [ ] Document rollback procedure
- [ ] Test rollback on staging
- [ ] Have database backup ready
- [ ] Have previous code version ready
- [ ] Document rollback steps

## Monitoring

- [ ] Set up error logging
- [ ] Set up performance monitoring
- [ ] Set up campaign execution monitoring
- [ ] Set up WhatsApp delivery monitoring
- [ ] Create alerts for failures

## Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Monitor campaign execution
- [ ] Monitor WhatsApp delivery rates
- [ ] Gather user feedback
- [ ] Document any issues found

## Verification Steps

### 1. Create Test Campaign
```bash
curl -X POST http://localhost:3000/api/campaigns/festival \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Holi Campaign",
    "message_template": "Hi {{name}}, Happy Holi!",
    "festival_type": "holi",
    "greeting_text": "Happy Holi",
    "include_image": true,
    "target_tags": ["test"]
  }'
```

### 2. Preview Image
```bash
curl -X POST "http://localhost:3000/api/campaigns/festival?preview_image=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "festival_type": "holi",
    "greeting_text": "Happy Holi"
  }'
```

### 3. Execute Campaign
```bash
curl -X POST http://localhost:3000/api/campaigns/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-id-from-step-1"}'
```

### 4. Verify Database
```sql
SELECT * FROM campaigns WHERE festival_type IS NOT NULL;
SELECT * FROM messages WHERE metadata->>'festival_type' IS NOT NULL;
```

## Sign-Off

- [ ] Development team sign-off
- [ ] QA team sign-off
- [ ] Product team sign-off
- [ ] DevOps team sign-off
- [ ] Security team sign-off

## Deployment Notes

**Date**: _______________
**Deployed By**: _______________
**Version**: _______________
**Notes**: _______________

## Post-Deployment Notes

**Date**: _______________
**Status**: _______________
**Issues Found**: _______________
**Resolution**: _______________

## Rollback Notes (if needed)

**Date**: _______________
**Reason**: _______________
**Rolled Back By**: _______________
**Status**: _______________
