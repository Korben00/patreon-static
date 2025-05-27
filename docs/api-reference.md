# API Reference

Complete API documentation for Patreon Static.

## Constructor

### `new PatreonStatic(config)`

Creates a new instance of PatreonStatic.

```javascript
const patreonStatic = new PatreonStatic({
  workerUrl: 'https://worker.example.com',
  clientId: 'your-client-id'
});
```

**Parameters:**
- `config` (Object) - Configuration object (see [Configuration](configuration.md))

**Returns:**
- PatreonStatic instance

**Throws:**
- Error if required configuration is missing

## Methods

### `login()`

Initiates the OAuth login flow.

```javascript
patreonStatic.login();
```

**Returns:** void

**Example:**
```javascript
document.getElementById('custom-login-btn').addEventListener('click', () => {
  patreonStatic.login();
});
```

### `logout()`

Logs out the current user and clears stored authentication.

```javascript
patreonStatic.logout();
```

**Returns:** void

**Example:**
```javascript
if (confirm('Are you sure you want to logout?')) {
  patreonStatic.logout();
}
```

### `isAuthenticated()`

Checks if a user is currently authenticated.

```javascript
const isLoggedIn = patreonStatic.isAuthenticated();
```

**Returns:** boolean

**Example:**
```javascript
if (patreonStatic.isAuthenticated()) {
  showUserMenu();
} else {
  showLoginButton();
}
```

### `isPayingMember()`

Checks if the authenticated user is a paying member.

```javascript
const isPaying = patreonStatic.isPayingMember();
```

**Returns:** boolean

**Example:**
```javascript
if (patreonStatic.isPayingMember()) {
  unlockPremiumContent();
}
```

### `updateUI()`

Manually triggers UI updates based on authentication status.

```javascript
patreonStatic.updateUI();
```

**Returns:** void

**Example:**
```javascript
// After dynamically adding login buttons
document.body.innerHTML += '<button data-patreon-login>Login</button>';
patreonStatic.updateUI();
```

## Properties

### `userData`

The authenticated user's data.

```javascript
const userData = patreonStatic.userData;
```

**Type:** Object | null

**Structure:**
```javascript
{
  user: {
    id: "12345",
    full_name: "John Doe",
    image_url: "https://...",
    thumb_url: "https://..."
  },
  membership_type: "active_patron",
  membership_data: {
    patron_status: "active_patron",
    last_charge_status: "Paid",
    last_charge_date: "2024-01-01T00:00:00.000Z",
    lifetime_support_cents: 5000,
    currently_entitled_amount_cents: 500,
    pledge_relationship_start: "2023-01-01T00:00:00.000Z"
  },
  is_paying_member: true,
  access_token: "...",
  refresh_token: "...",
  expires_at: 1234567890000
}
```

### `config`

The current configuration.

```javascript
const config = patreonStatic.config;
```

**Type:** Object (read-only)

### `initialized`

Whether the library has been initialized.

```javascript
const isReady = patreonStatic.initialized;
```

**Type:** boolean

## Events

While Patreon Static uses callbacks rather than events, you can implement your own event system:

```javascript
// Custom event dispatcher
class PatreonEvents extends PatreonStatic {
  constructor(config) {
    super({
      ...config,
      onLogin: (userData) => {
        this.dispatchEvent('patreon:login', userData);
        config.onLogin?.(userData);
      },
      onLogout: () => {
        this.dispatchEvent('patreon:logout');
        config.onLogout?.();
      }
    });
  }
  
  dispatchEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Usage
window.addEventListener('patreon:login', (e) => {
  console.log('User logged in:', e.detail);
});
```

## Data Attributes

### `data-patreon-login`

Marks an element as a Patreon login button.

```html
<button data-patreon-login>Login with Patreon</button>
```

### `data-patreon-login-text`

Sets the text for unauthenticated state.

```html
<button data-patreon-login data-patreon-login-text="Connect Account">
  Connect Account
</button>
```

### `data-patreon-removed`

Applied to hidden ad elements (for internal use).

```html
<div class="ad" data-patreon-removed="true" style="display: none;"></div>
```

## Membership Types

Possible values for `userData.membership_type`:

- `creator` - The campaign creator
- `active_patron` - Currently paying patron
- `declined_patron` - Payment was declined
- `former_patron` - Cancelled membership
- `free_member` - Following but not paying
- `none` - Not a member

## Error Handling

Errors are passed to the `onError` callback:

```javascript
new PatreonStatic({
  // ... config
  onError: function(error) {
    switch(error) {
      case 'Missing authorization code':
        // Handle missing code
        break;
      case 'Invalid state parameter':
        // Handle CSRF attempt
        break;
      default:
        // Handle other errors
    }
  }
});
```

Common error messages:
- `"PatreonStatic: workerUrl and clientId are required"`
- `"No authorization code received"`
- `"Invalid state parameter"`
- `"Authentication failed: [details]"`
- `"Token exchange failed"`
- `"Failed to get user identity"`

## Storage

Data is stored in localStorage with the configured key:

```javascript
// Default key: 'patreon_auth'
const storedData = localStorage.getItem('patreon_auth');
const userData = JSON.parse(storedData);
```

To clear stored data:
```javascript
localStorage.removeItem('patreon_auth');
// or
patreonStatic.logout();
```

## Worker API

The Cloudflare Worker provides these endpoints:

### `GET /`
Initiates OAuth flow.

### `POST /token`
Exchanges authorization code for access token.

### `GET /identity`
Retrieves user information.

### `GET /proxy-image`
Proxies user avatar images.

See [Worker Documentation](../cloudflare-worker/README.md) for details.

## Examples

### Conditional Content

```javascript
// Show content based on membership
if (patreonStatic.isAuthenticated()) {
  const userData = patreonStatic.userData;
  
  if (userData.membership_type === 'creator') {
    showCreatorTools();
  } else if (userData.is_paying_member) {
    showPatronContent();
  } else {
    showFreeContent();
  }
}
```

### Custom Login Flow

```javascript
// Implement custom login button
function customLogin() {
  // Show loading state
  showLoader();
  
  // Store current page
  sessionStorage.setItem('patreon_return_url', window.location.href);
  
  // Start login
  patreonStatic.login();
}
```

### Tier-Based Access

```javascript
// Check pledge amount
if (patreonStatic.isPayingMember()) {
  const cents = patreonStatic.userData.membership_data.currently_entitled_amount_cents;
  const dollars = cents / 100;
  
  if (dollars >= 10) {
    unlockGoldTier();
  } else if (dollars >= 5) {
    unlockSilverTier();
  } else {
    unlockBronzeTier();
  }
}
```