# Configuration Options

This guide covers all available configuration options for Patreon Static.

## Basic Configuration

```javascript
const patreonStatic = new PatreonStatic({
  // Required
  workerUrl: 'https://your-worker.workers.dev',
  clientId: 'your-patreon-client-id',
  
  // Recommended
  campaignId: 'your-campaign-id',
  creatorId: 'your-creator-id'
});
```

## All Options

### Required Options

#### `workerUrl` (string)
The URL of your deployed Cloudflare Worker.

```javascript
workerUrl: 'https://patreon-oauth.your-subdomain.workers.dev'
```

#### `clientId` (string)
Your Patreon application's client ID.

```javascript
clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

### Recommended Options

#### `campaignId` (string)
Your Patreon campaign ID. Used to identify members of your specific campaign.

```javascript
campaignId: 'xxxxxxx'
```

#### `creatorId` (string)
Your Patreon creator ID. Used to identify you as the creator.

```javascript
creatorId: 'xxxxxx'
```

### Optional Options

#### `redirectUri` (string)
The OAuth callback URL. Defaults to `window.location.origin + '/patreon-callback'`.

```javascript
redirectUri: 'https://example.com/auth/patreon/callback'
```

#### `storageKey` (string)
The localStorage key for storing authentication data. Default: `'patreon_auth'`.

```javascript
storageKey: 'my_custom_patreon_key'
```

#### `loginButtonSelector` (string)
CSS selector for login buttons. Default: `'[data-patreon-login]'`.

```javascript
loginButtonSelector: '.patreon-login-btn'
```

#### `autoRemoveAds` (boolean)
Automatically hide ads for paying members. Default: `true`.

```javascript
autoRemoveAds: false // Disable automatic ad removal
```

#### `adSelectors` (array)
CSS selectors for ad elements to hide. Default: `['.ad', '.advertisement', '.pub', '[data-ad]']`.

```javascript
adSelectors: ['.my-ad', '#sidebar-ad', '[data-advertisement]']
```

#### `debug` (boolean)
Enable debug logging. Default: `false`.

```javascript
debug: true // Enable console logging
```

### Callback Functions

#### `onLogin` (function)
Called when a user successfully logs in.

```javascript
onLogin: function(userData) {
  console.log('Welcome,', userData.user.full_name);
  console.log('Membership type:', userData.membership_type);
  console.log('Is paying:', userData.is_paying_member);
  
  // Custom actions
  if (userData.is_paying_member) {
    showPremiumContent();
  }
}
```

#### `onLogout` (function)
Called when a user logs out.

```javascript
onLogout: function() {
  console.log('User logged out');
  hidePremiumContent();
  showThankYouMessage();
}
```

#### `onError` (function)
Called when an error occurs.

```javascript
onError: function(error) {
  console.error('Patreon error:', error);
  
  // Show user-friendly error
  if (error.includes('Invalid client')) {
    alert('Configuration error. Please contact support.');
  }
}
```

## Complete Example

```javascript
const patreonStatic = new PatreonStatic({
  // Required
  workerUrl: 'https://patreon-oauth.example.workers.dev',
  clientId: 'your-client-id',
  
  // Recommended
  campaignId: 'your-campaign-id',
  creatorId: 'your-creator-id',
  
  // Optional
  redirectUri: 'https://example.com/patreon-callback',
  storageKey: 'example_patreon_auth',
  loginButtonSelector: '.login-with-patreon',
  autoRemoveAds: true,
  adSelectors: ['.advertisement', '.sponsor-banner', '[data-ad-unit]'],
  debug: false,
  
  // Callbacks
  onLogin: function(userData) {
    // Update UI
    updateUserInterface(userData);
    
    // Track analytics
    gtag('event', 'patreon_login', {
      'membership_type': userData.membership_type,
      'is_paying': userData.is_paying_member
    });
    
    // Show welcome message
    if (userData.is_paying_member) {
      showNotification('Welcome back, patron! Ads have been removed.');
    } else {
      showNotification('Welcome! Consider becoming a patron for an ad-free experience.');
    }
  },
  
  onLogout: function() {
    // Reset UI
    resetUserInterface();
    
    // Track analytics
    gtag('event', 'patreon_logout');
  },
  
  onError: function(error) {
    // Log error
    console.error('Authentication error:', error);
    
    // Show user-friendly message
    showNotification('Login failed. Please try again.', 'error');
    
    // Report to error tracking
    if (window.Sentry) {
      Sentry.captureException(new Error(error));
    }
  }
});
```

## Advanced Configuration

### Multiple Instances

You can create multiple instances with different configurations:

```javascript
// Main site authentication
const mainAuth = new PatreonStatic({
  workerUrl: 'https://main-auth.workers.dev',
  clientId: 'main-client-id',
  storageKey: 'main_patreon_auth'
});

// Blog section with different campaign
const blogAuth = new PatreonStatic({
  workerUrl: 'https://blog-auth.workers.dev',
  clientId: 'blog-client-id',
  campaignId: 'blog-campaign-id',
  storageKey: 'blog_patreon_auth'
});
```

### Dynamic Configuration

Load configuration from your backend:

```javascript
// Fetch configuration
fetch('/api/patreon-config')
  .then(res => res.json())
  .then(config => {
    // Initialize with dynamic config
    window.patreonStatic = new PatreonStatic({
      workerUrl: config.workerUrl,
      clientId: config.clientId,
      campaignId: config.campaignId,
      creatorId: config.creatorId
    });
  });
```

### Environment-Based Configuration

Use different settings for development and production:

```javascript
const isDevelopment = window.location.hostname === 'localhost';

const patreonStatic = new PatreonStatic({
  workerUrl: isDevelopment 
    ? 'https://dev-worker.workers.dev'
    : 'https://prod-worker.workers.dev',
  clientId: isDevelopment
    ? 'dev-client-id'
    : 'prod-client-id',
  debug: isDevelopment
});
```

## Worker Configuration

Don't forget to configure your Cloudflare Worker:

### Environment Variables

Set in `wrangler.toml` or Cloudflare dashboard:

```toml
[vars]
ALLOWED_ORIGINS = "https://example.com,https://www.example.com"
REDIRECT_URI = "https://example.com/patreon-callback"
PATREON_CAMPAIGN_ID = "your-campaign-id"
PATREON_CREATOR_ID = "your-creator-id"
```

### Secrets

Set via wrangler CLI:

```bash
wrangler secret put PATREON_CLIENT_ID
wrangler secret put PATREON_CLIENT_SECRET
```

## Best Practices

1. **Keep secrets secure**: Never expose your client secret in frontend code
2. **Use HTTPS**: Always use HTTPS URLs in production
3. **Validate origins**: Restrict `ALLOWED_ORIGINS` to your domains only
4. **Handle errors gracefully**: Always provide `onError` callback
5. **Test thoroughly**: Test with different membership types
6. **Monitor usage**: Track login success rates and errors