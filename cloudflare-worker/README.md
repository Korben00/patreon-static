# Cloudflare Worker for Patreon OAuth

This Cloudflare Worker handles the server-side OAuth flow for authenticating users with Patreon.

## Features

- Complete OAuth 2.0 flow implementation
- User identity and membership status retrieval
- CORS support for static sites
- Image proxy to avoid CORS issues
- Membership type detection (creator, active patron, declined, former, etc.)

## Prerequisites

- Cloudflare account
- Patreon application (create at https://www.patreon.com/portal/registration/register-clients)
- Wrangler CLI (`npm install -g wrangler`)

## Setup Instructions

### 1. Create a Patreon Application

1. Go to [Patreon Developers](https://www.patreon.com/portal/registration/register-clients)
2. Click "Create Client"
3. Fill in the application details:
   - **App Name**: Your app name
   - **Description**: Brief description
   - **App Category**: Choose appropriate category
   - **Redirect URIs**: `https://yourdomain.com/patreon-callback`
4. Save and note your:
   - Client ID
   - Client Secret
   - Creator ID (from your Patreon profile URL)
   - Campaign ID (from your campaign settings)

### 2. Configure the Worker

1. Clone or copy the worker files
2. Update `wrangler.toml` with your configuration
3. Set the required secrets:

```bash
# Authenticate with Cloudflare
wrangler login

# Set your Patreon credentials
wrangler secret put PATREON_CLIENT_ID
wrangler secret put PATREON_CLIENT_SECRET
```

### 3. Deploy the Worker

```bash
# Deploy to Cloudflare
wrangler deploy

# Or deploy to specific environment
wrangler deploy --env production
```

### 4. Configure Environment Variables

In the Cloudflare dashboard, set these environment variables:

- `ALLOWED_ORIGINS`: Your website domain (e.g., `https://yourdomain.com`)
- `REDIRECT_URI`: Your callback URL (e.g., `https://yourdomain.com/patreon-callback`)
- `PATREON_CAMPAIGN_ID`: Your Patreon campaign ID
- `PATREON_CREATOR_ID`: Your Patreon creator ID

## API Endpoints

### `GET /`
Initiates the OAuth flow by redirecting to Patreon.

**Query Parameters:**
- `state` (optional): OAuth state parameter
- `redirect_uri` (optional): Override default redirect URI

### `POST /token`
Exchanges authorization code for access token.

**Request Body:**
```json
{
  "code": "authorization_code_from_patreon",
  "redirect_uri": "https://yourdomain.com/patreon-callback"
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 2678400,
  "scope": "identity identity.memberships",
  "token_type": "Bearer"
}
```

### `GET /identity`
Retrieves user information and membership status.

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "user": {
    "id": "12345",
    "full_name": "John Doe",
    "image_url": "...",
    "thumb_url": "..."
  },
  "membership_type": "active_patron",
  "membership_data": {
    "patron_status": "active_patron",
    "last_charge_status": "Paid",
    "lifetime_support_cents": 1000,
    "currently_entitled_amount_cents": 500
  },
  "is_paying_member": true
}
```

### `GET /proxy-image`
Proxies Patreon user images to avoid CORS issues.

**Query Parameters:**
- `url`: The image URL to proxy

## Membership Types

The worker identifies these membership types:

- `creator`: The campaign creator
- `active_patron`: Currently paying patron
- `declined_patron`: Payment declined
- `former_patron`: Cancelled membership
- `free_member`: Following but not paying
- `none`: No membership

## Security Considerations

1. **CORS**: Configure `ALLOWED_ORIGINS` to restrict access to your domain
2. **HTTPS**: Always use HTTPS for your redirect URIs
3. **Secrets**: Never commit credentials to version control
4. **Rate Limiting**: Consider implementing rate limiting for production

## Testing Locally

```bash
# Run the worker locally
wrangler dev

# Test endpoints
curl http://localhost:8787/
curl -X POST http://localhost:8787/token -d '{"code":"test"}'
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `ALLOWED_ORIGINS` configuration
2. **401 Unauthorized**: Verify your Patreon credentials
3. **Invalid Grant**: Ensure redirect URI matches exactly
4. **No Membership Data**: User might not be a member of your campaign

### Debug Mode

Add logging to troubleshoot issues:

```javascript
console.log('Request:', request.url);
console.log('Response:', response.status);
```

View logs in Cloudflare dashboard or with:
```bash
wrangler tail
```

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/korben00/patreon-static).