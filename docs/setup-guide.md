# Complete Setup Guide

This guide will walk you through setting up Patreon Static from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create a Patreon Application](#create-a-patreon-application)
3. [Deploy the Cloudflare Worker](#deploy-the-cloudflare-worker)
4. [Integrate into Your Website](#integrate-into-your-website)
5. [Testing](#testing)
6. [Going to Production](#going-to-production)

## Prerequisites

Before you begin, you'll need:

- A Patreon creator account with an active campaign
- A Cloudflare account (free tier is fine)
- Node.js installed (for wrangler CLI)
- A static website where you want to add Patreon authentication

## Create a Patreon Application

### Step 1: Register Your Application

1. Go to [Patreon Platform](https://www.patreon.com/portal/registration/register-clients)
2. Click "Create Client"
3. Fill in the required information:
   - **App Name**: Choose a name (e.g., "My Website Auth")
   - **Description**: Brief description of your app
   - **App Category**: Select the most appropriate category
   - **Company/Organization**: Your company name or personal name
   - **Privacy Policy URL**: Link to your privacy policy
   - **Terms of Service URL**: Link to your terms

### Step 2: Configure OAuth Settings

1. In the "Redirect URIs" section, add:
   ```
   https://yourdomain.com/patreon-callback
   http://localhost:8000/patreon-callback (for local testing)
   ```

2. Save your application

### Step 3: Get Your Credentials

After saving, you'll see:
- **Client ID**: Public identifier for your app
- **Client Secret**: Keep this secret! Only use in the worker

Also, you'll need:
- **Creator ID**: Found in your Patreon profile URL (e.g., `patreon.com/user?u=591228`)
- **Campaign ID**: Found in your campaign settings

## Deploy the Cloudflare Worker

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/korben00/patreon-static.git
cd patreon-static/cloudflare-worker
```

### Step 3: Configure Wrangler

1. Login to Cloudflare:
   ```bash
   wrangler login
   ```

2. Edit `wrangler.toml`:
   ```toml
   name = "patreon-oauth-worker"
   main = "worker.js"
   compatibility_date = "2024-01-01"

   [vars]
   ALLOWED_ORIGINS = "https://yourdomain.com"
   REDIRECT_URI = "https://yourdomain.com/patreon-callback"
   PATREON_CAMPAIGN_ID = "your-campaign-id"
   PATREON_CREATOR_ID = "your-creator-id"
   ```

### Step 4: Set Secrets

```bash
# Set your Patreon credentials as secrets
wrangler secret put PATREON_CLIENT_ID
# Enter your client ID when prompted

wrangler secret put PATREON_CLIENT_SECRET
# Enter your client secret when prompted
```

### Step 5: Deploy the Worker

```bash
wrangler deploy
```

You'll get a URL like: `https://patreon-oauth-worker.your-subdomain.workers.dev`

## Integrate into Your Website

### Step 1: Add the Files

#### Option A: Use CDN (Easiest)

```html
<!-- In your HTML <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/korben00/patreon-static@latest/client/patreon-static.css">

<!-- Before closing </body> -->
<script src="https://cdn.jsdelivr.net/gh/korben00/patreon-static@latest/client/patreon-static.js"></script>
```

#### Option B: Self-Host

1. Copy `client/patreon-static.js` and `client/patreon-static.css` to your website
2. Copy `client/patreon-callback.html` to your website root
3. Include them in your HTML:

```html
<link rel="stylesheet" href="/path/to/patreon-static.css">
<script src="/path/to/patreon-static.js"></script>
```

### Step 2: Initialize the Library

Add this script after including patreon-static.js:

```html
<script>
  const patreonStatic = new PatreonStatic({
    workerUrl: 'https://patreon-oauth-worker.your-subdomain.workers.dev',
    clientId: 'your-patreon-client-id',
    campaignId: 'your-campaign-id',
    creatorId: 'your-creator-id',
    
    // Optional: Customize behavior
    onLogin: function(userData) {
      console.log('User logged in:', userData);
      // Add your custom logic here
    },
    
    onLogout: function() {
      console.log('User logged out');
      // Add your custom logic here
    }
  });
</script>
```

### Step 3: Add Login Button

Add this button wherever you want the login option to appear:

```html
<button data-patreon-login>Login with Patreon</button>
```

You can customize the text:

```html
<button data-patreon-login data-patreon-login-text="Connect Patreon">
  Connect Patreon
</button>
```

### Step 4: Create Callback Page

Create `/patreon-callback.html` at your website root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authenticating...</title>
    <link rel="stylesheet" href="/path/to/patreon-static.css">
</head>
<body>
    <div class="patreon-callback-container">
        <div class="patreon-callback-spinner"></div>
        <h1 class="patreon-callback-title">Authenticating with Patreon</h1>
        <p class="patreon-callback-message">Please wait...</p>
    </div>
    
    <script src="/path/to/patreon-static.js"></script>
    <script>
        new PatreonStatic({
            workerUrl: 'https://patreon-oauth-worker.your-subdomain.workers.dev',
            clientId: 'your-patreon-client-id',
            campaignId: 'your-campaign-id',
            creatorId: 'your-creator-id'
        });
    </script>
</body>
</html>
```

## Testing

### Local Testing

1. Start a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

2. Update your worker's `ALLOWED_ORIGINS` to include `http://localhost:8000`

3. Visit `http://localhost:8000` and test the login flow

### Testing Checklist

- [ ] Login button appears correctly
- [ ] Clicking login redirects to Patreon
- [ ] After authorizing, you're redirected back
- [ ] User information displays correctly
- [ ] Ads are hidden for paying members
- [ ] Logout works properly
- [ ] Session persists after page reload

## Going to Production

### 1. Update Configuration

Update your worker configuration for production:

```toml
[env.production]
name = "patreon-oauth-worker-prod"
vars = { ALLOWED_ORIGINS = "https://yourdomain.com" }
```

Deploy to production:
```bash
wrangler deploy --env production
```

### 2. Security Checklist

- [ ] Remove localhost from redirect URIs in Patreon settings
- [ ] Ensure `ALLOWED_ORIGINS` only includes your domain
- [ ] Use HTTPS for all URLs
- [ ] Keep your client secret secure
- [ ] Set up error monitoring

### 3. Performance Optimization

- Minify the JavaScript and CSS files
- Use a CDN for static assets
- Enable caching headers on your worker
- Consider lazy-loading the library

### 4. Monitoring

Set up monitoring for:
- Worker errors in Cloudflare dashboard
- JavaScript errors using a service like Sentry
- User authentication success/failure rates

## Troubleshooting

### Common Issues

**"Invalid client" error**
- Double-check your client ID
- Ensure it matches exactly in Patreon and your code

**"Invalid redirect URI" error**
- The redirect URI must match exactly
- Include the protocol (https://)
- Don't include trailing slashes

**CORS errors**
- Check `ALLOWED_ORIGINS` in worker config
- Ensure your domain is listed
- Use HTTPS in production

**User data not persisting**
- Check browser's localStorage isn't disabled
- Ensure you're on the same domain
- Check for JavaScript errors

### Debug Mode

Enable debug mode to see detailed logs:

```javascript
const patreonStatic = new PatreonStatic({
  // ... your config
  debug: true
});
```

## Next Steps

- [Configuration Options](configuration.md) - Customize behavior
- [Styling Guide](styling.md) - Match your site's design
- [API Reference](api-reference.md) - Advanced usage
- [Examples](../examples/) - See implementations