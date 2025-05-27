# Basic HTML Example

This example demonstrates how to integrate Patreon Static into a basic HTML website.

## Features Demonstrated

- Basic authentication flow
- Login/logout functionality
- Automatic ad removal for paying patrons
- User status display
- Persistent sessions across page reloads

## Setup Instructions

1. **Update Configuration**
   
   Edit `index.html` and `patreon-callback.html` and replace these placeholders with your actual values:
   
   ```javascript
   workerUrl: 'https://your-worker.workers.dev',
   clientId: 'your-patreon-client-id',
   campaignId: 'your-campaign-id',
   creatorId: 'your-creator-id'
   ```

2. **Deploy Your Worker**
   
   Follow the instructions in the [Cloudflare Worker README](../../cloudflare-worker/README.md) to deploy your worker.

3. **Serve the Files**
   
   You can test locally using any static file server:
   
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Configure Patreon App**
   
   In your Patreon app settings, add your callback URL:
   - For local testing: `http://localhost:8000/patreon-callback.html`
   - For production: `https://yourdomain.com/patreon-callback.html`

## File Structure

```
basic-html/
├── index.html           # Main page with login button
├── patreon-callback.html # OAuth callback handler
└── README.md           # This file
```

## How It Works

1. User clicks "Login with Patreon" button
2. Browser redirects to Patreon OAuth page
3. User authorizes your application
4. Patreon redirects to `patreon-callback.html` with auth code
5. PatreonStatic exchanges code for access token via your worker
6. User data is fetched and stored in localStorage
7. User is redirected back to main page
8. UI updates to show logged-in state
9. Ads are automatically hidden for paying patrons

## Customization

### Styling

The example uses the default Patreon Static styles. You can override them by adding your own CSS after the Patreon Static CSS link:

```html
<link rel="stylesheet" href="../../client/patreon-static.css">
<style>
  /* Your custom styles */
  [data-patreon-login] {
    background-color: #1a73e8;
  }
</style>
```

### Ad Selectors

By default, elements with class `ad`, `advertisement`, or `[data-ad]` attribute are hidden. You can customize this:

```javascript
const patreonStatic = new PatreonStatic({
  // ... other config
  adSelectors: ['.my-ad-class', '#sidebar-ad', '[data-custom-ad]']
});
```

### Callbacks

Use callbacks to perform custom actions:

```javascript
const patreonStatic = new PatreonStatic({
  // ... other config
  onLogin: function(userData) {
    // Show welcome message
    alert(`Welcome back, ${userData.user.full_name}!`);
    
    // Track analytics event
    gtag('event', 'patreon_login', {
      membership_type: userData.membership_type
    });
  }
});
```

## Testing

1. **Test as Non-Member**: Log in with a Patreon account that isn't a patron
2. **Test as Patron**: Log in with an account that's actively supporting your campaign
3. **Test Logout**: Click the user menu and logout
4. **Test Persistence**: Refresh the page - you should remain logged in
5. **Test Callback**: Ensure the callback page handles errors gracefully

## Troubleshooting

### "Authentication failed" Error

- Check that your worker URL is correct
- Verify your Patreon client ID matches
- Ensure callback URL is exact match in Patreon settings

### Ads Not Hiding

- Check browser console for errors
- Verify user is actually a paying patron
- Ensure ad elements have correct classes/attributes

### CORS Errors

- Update `ALLOWED_ORIGINS` in your worker configuration
- Make sure you're using HTTPS in production

## Next Steps

- Add member-only content sections
- Implement tier-based features
- Add analytics tracking
- Create custom UI components