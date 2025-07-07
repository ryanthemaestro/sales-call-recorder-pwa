# 🔧 Twilio Token Troubleshooting Guide

## Current Status
✅ **FIXED**: Changed from manual JWT creation to official Twilio SDK
- **Old endpoint**: `twilio-token-2025` (manual JWT)
- **New endpoint**: `twilio-token-v3` (official SDK)

## If You Still Get "JWT is invalid" Errors

### Step 1: Create New API Key (Most Likely Fix)
1. Go to [Twilio Console > API Keys](https://console.twilio.com/us1/develop/api-keys)
2. Click "Create API Key"
3. Choose **"Standard"** key type
4. Copy the **SID** and **Secret**
5. Update your Netlify environment variables:
   - `TWILIO_API_KEY` = new SID
   - `TWILIO_API_SECRET` = new Secret

### Step 2: Check Environment Variables
Run this diagnostic: https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-account-diagnostic

### Step 3: Verify TwiML App Configuration
1. Go to [Twilio Console > TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Find your app (SID starts with `AP`)
3. Set **Voice Webhook URL** to: `https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-voice`
4. Set **HTTP Method** to: `POST`

### Step 4: Alternative Token Endpoints
If v3 fails, try these backup endpoints:

```bash
# Test standard endpoint
curl -X POST "https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-token" \
  -H "Content-Type: application/json" \
  -d '{"identity":"test-user"}'

# Test alternative endpoint
curl -X POST "https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-token-alt" \
  -H "Content-Type: application/json" \
  -d '{"identity":"test-user"}'
```

### Step 5: Quick Environment Variable Check
```bash
# In Netlify CLI
netlify env:list
```

Required variables:
- ✅ `TWILIO_ACCOUNT_SID` (starts with AC)
- ✅ `TWILIO_API_KEY` (starts with SK) 
- ✅ `TWILIO_API_SECRET` (32 characters)
- ✅ `TWILIO_APP_SID` (starts with AP)

### Step 6: Switch Token Endpoint if Needed
To change which token endpoint your app uses, edit:
`src/components/TwilioIntegration.tsx` line 91

```typescript
// Current (fixed)
const response = await fetch('/.netlify/functions/twilio-token-v3', {

// Alternatives:
// const response = await fetch('/.netlify/functions/twilio-token', {
// const response = await fetch('/.netlify/functions/twilio-token-alt', {
```

## Error Codes Reference
- **31204**: JWT is invalid → API Key issue
- **20101**: Access Token Invalid → Usually permissions
- **53000**: Connection Error → Network/firewall issue

## Contact Support
If none of these work, the issue might be:
1. Trial account Voice SDK restrictions
2. Account suspension/billing issues  
3. Regional API access problems

Check Twilio Console for account status warnings. 