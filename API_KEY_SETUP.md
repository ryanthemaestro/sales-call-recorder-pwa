# 🔑 Twilio API Key Setup Guide

## Why Create a New API Key?
Your current API Key may have insufficient permissions for Voice SDK. Creating a new one with proper permissions will fix the "JWT is invalid" error.

## Step-by-Step Instructions

### 1. Access Twilio Console
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Account > API Keys & Tokens** 
3. Or direct link: https://console.twilio.com/us1/develop/api-keys

### 2. Create New API Key
1. Click **"Create API Key"** button
2. **Key Type**: Choose **"Standard"** (not Restricted)
3. **Friendly Name**: Enter something like "Voice SDK Key" or "Sales App Key"
4. Click **"Create API Key"**

### 3. Save Credentials Immediately
⚠️ **CRITICAL**: Copy these values immediately - they won't be shown again!

- **SID**: Starts with `SK...` (34 characters)
- **Secret**: 32 character string

### 4. Update Netlify Environment Variables

#### Option A: Netlify Web Dashboard
1. Go to [Netlify Sites](https://app.netlify.com/teams)
2. Click on your **sales-call-recorder-pwa** site
3. Go to **Site Settings > Environment Variables**
4. Update these variables:
   - `TWILIO_API_KEY` = your new SID (SK...)
   - `TWILIO_API_SECRET` = your new Secret

#### Option B: Netlify CLI
```bash
cd sales-call-recorder-pwa
netlify env:set TWILIO_API_KEY "SK_YOUR_NEW_SID_HERE"
netlify env:set TWILIO_API_SECRET "YOUR_NEW_SECRET_HERE"
```

### 5. Switch Back to API Key Endpoint
After updating your environment variables, switch your app back to the standard endpoint:

Edit `src/components/TwilioIntegration.tsx` line 91:
```typescript
// Change from current:
const response = await fetch('/.netlify/functions/twilio-token-alt', {

// Back to:
const response = await fetch('/.netlify/functions/twilio-token', {
```

### 6. Deploy Changes
```bash
npm run build
netlify deploy --prod
```

## Verification

Test your new API Key:
```bash
curl -X POST "https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-token" \
  -H "Content-Type: application/json" \
  -d '{"identity":"testuser"}'
```

Should return a successful token response.

## Current Status
✅ **Working Now**: Using Auth Token method (no API Key needed)
🔄 **Optional**: Switch to new API Key for better security

## Token Endpoint Options
Your app has 4 different token generation methods:

1. **twilio-token-alt** ✅ (Currently Active - uses Auth Token)
2. **twilio-token** (Standard - uses API Key) 
3. **twilio-token-v3** (Official SDK - uses API Key)
4. **twilio-token-2025** (Custom JWT - not recommended)

## Troubleshooting
If the new API Key still doesn't work:
1. Make sure it's "Standard" type, not "Restricted"
2. Wait 2-3 minutes for propagation
3. Check account status for any restrictions
4. Contact Twilio Support if issues persist 