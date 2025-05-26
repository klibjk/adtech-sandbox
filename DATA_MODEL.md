# AdTech Analytics Sandbox - Data Model Documentation

## Overview

The AdTech Analytics Sandbox uses a comprehensive event-driven data model that tracks user interactions, ad performance, ecommerce conversions, and attribution across multiple touchpoints. All events flow through the same pipeline and are stored with consistent metadata.

## JavaScript dataLayer Structure

### Core Event Format
Every event in `window.dataLayer` follows this structure:

```javascript
{
  event: "event_name",           // Event type identifier
  event_type: "event_name",      // Duplicate for consistency
  session_id: "sess_...",        // Unique session identifier
  user_id: "user_...",           // User identifier (cookie or fingerprint)
  tracking_mode: "cookie",       // "cookie" or "cookieless"
  timestamp: 1703123456789,      // Client timestamp (milliseconds)
  page_url: "http://...",        // Current page URL
  // ... event-specific parameters
}
```

## Event Types Catalog

### 1. Page & Session Events

#### `page_load`
**Description**: Initial page load with environment data
```javascript
{
  event: "page_load",
  page_title: "AdTech Analytics Sandbox",
  page_url: "http://localhost:3000/",
  referrer: "https://google.com",
  user_agent: "Mozilla/5.0...",
  viewport_width: 1920,
  viewport_height: 1080,
  screen_width: 1920,
  screen_height: 1080,
  color_depth: 24,
  pixel_ratio: 1,
  timezone_offset: -300,
  language: "en-US"
}
```

#### `page_view`
**Description**: Page view with attribution tracking (product page)
```javascript
{
  event: "page_view",
  page_title: "Ultimate Cat Cardboard Box",
  page_type: "product",
  product_id: "cat-cardboard-box",
  attribution_source: "ad_click",
  referrer: "http://localhost:3000/"
}
```

### 2. Ad Interaction Events

#### `ad_view`
**Description**: Ad becomes visible in viewport
```javascript
{
  event: "ad_view",
  ad_id: "banner-001",
  ad_type: "banner",              // "banner", "sticky", "interstitial"
  viewport_percentage: 85,        // % of ad visible
}
```

#### `ad_click`
**Description**: User clicks on an advertisement
```javascript
{
  event: "ad_click",
  ad_id: "banner-001",
  ad_type: "banner",
  click_x: 364,                   // Click coordinates
  click_y: 45
}
```

### 3. Ecommerce Events

#### `product_option_selected`
**Description**: User changes product options (size, quantity)
```javascript
{
  event: "product_option_selected",
  option_type: "size",
  option_value: "medium",
  price: 24.99
}
```

#### `add_to_cart`
**Description**: User adds item to shopping cart
```javascript
{
  event: "add_to_cart",
  product_id: "cat-cardboard-box",
  product_name: "Ultimate Cat Cardboard Box",
  product_size: "medium",
  quantity: 2,
  price: 24.99,
  total_value: 49.98,
  attribution_source: "ad_click"
}
```

#### `buy_now`
**Description**: User bypasses cart and purchases immediately
```javascript
{
  event: "buy_now",
  product_id: "cat-cardboard-box",
  product_name: "Ultimate Cat Cardboard Box",
  product_size: "large",
  quantity: 1,
  price: 29.99,
  total_value: 29.99,
  attribution_source: "direct"
}
```

#### `begin_checkout`
**Description**: User starts the checkout process
```javascript
{
  event: "begin_checkout",
  cart_value: 49.98,
  cart_items: 2,
  attribution_source: "ad_click"
}
```

#### `purchase`
**Description**: User completes a purchase (CONVERSION EVENT)
```javascript
{
  event: "purchase",
  transaction_id: "txn_1703123456_abc123",
  value: 49.98,
  currency: "USD",
  cart_items: 2,
  products: [
    {
      id: "cat-cardboard-box",
      name: "Ultimate Cat Cardboard Box",
      size: "medium",
      quantity: 2,
      price: 24.99,
      total: 49.98
    }
  ],
  attribution_source: "ad_click",
  conversion_path: {
    source: "ad_click",
    session_duration: 120000,
    page_views: 3,
    tracking_mode: "cookie"
  },
  checkout_type: "quick_demo"      // Optional demo flag
}
```

### 4. Performance Events

#### `web_vitals`
**Description**: Core Web Vitals measurements
```javascript
{
  event: "web_vitals",
  metric_name: "LCP",              // "CLS", "LCP", "FID", "FCP", "TTFB"
  metric_value: 1200,              // Milliseconds or ratio
  metric_rating: "good"            // "good", "needs-improvement", "poor"
}
```

#### `error`
**Description**: JavaScript errors and exceptions
```javascript
{
  event: "error",
  error_message: "TypeError: Cannot read property of undefined",
  error_stack: "Error: TypeError...\n    at line 42...",
  error_line: 42,
  error_column: 15,
  error_filename: "main.js"
}
```

### 5. Attribution & Journey Events

#### `tracking_mode_change`
**Description**: User switches between cookie/cookieless modes
```javascript
{
  event: "tracking_mode_change",
  old_mode: "cookie",
  new_mode: "cookieless",
  change_timestamp: 1703123456789
}
```

#### `journey_simulation_start`
**Description**: Attribution journey simulation begins
```javascript
{
  event: "journey_simulation_start",
  journey_type: "ad_delayed",
  journey_name: "📺 Ad View → Close → Return → Purchase",
  expected_steps: 5,
  simulated_delay: 86400000       // 24 hours in milliseconds
}
```

#### `journey_step`
**Description**: Individual step in journey simulation
```javascript
{
  event: "journey_step",
  journey_type: "ad_delayed",
  step_name: "ad_view",           // "ad_view", "page_close", "return_visit", etc.
  step_number: 1,
  total_steps: 5
}
```

#### `attribution_page_view`
**Description**: Page view with attribution context
```javascript
{
  event: "attribution_page_view",
  page_type: "product",
  attribution_source: "search",
  is_simulation: true,
  session_start: 1703123456789
}
```

#### `data_cleared`
**Description**: User clears all tracking data
```javascript
{
  event: "data_cleared",
  cleared_timestamp: 1703123456789,
  user_initiated: true
}
```

## Attribution Sources

The system tracks the following attribution sources:

| Source | Description | Example Journey |
|--------|-------------|-----------------|
| `direct` | Direct website visit | User types URL directly |
| `ad_click` | Direct ad click | User clicks ad → product page |
| `ad_delayed` | Delayed ad attribution | User sees ad → closes → returns → purchases |
| `search` | Search-driven | User sees ad → searches Google → purchases |
| `history` | Browser history | User clicks ad → closes → uses history → purchases |

## Database Schema Mapping

### Primary Tables

#### `events_raw`
- Stores all events with full JSON payload
- Main columns: `event_type`, `session_id`, `user_id`, `tracking_mode`, `timestamp`, `event_data`

#### `ad_events`
- Structured ad interaction data
- Links to `events_raw.id` via `event_id`

#### `web_vitals_raw`
- Core Web Vitals measurements
- Links to `events_raw.id` via `event_id`

#### `sessions_dim`
- Session-level attribution data
- Updated on `page_load` events

## Analytics Views

### `agg_daily_metrics_v`
Daily aggregated metrics combining:
- Session counts by tracking mode
- Ad performance (CTR, RPM)
- Web Vitals averages
- Error rates

### `ad_performance_summary_v`
Ad performance rollup:
- Total views/clicks by ad type
- CTR calculations
- Unique user/session counts

## GTM Integration Points

The dataLayer is fully compatible with Google Tag Manager:

```javascript
// GTM-style event firing
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'txn_123',
    value: 49.98,
    currency: 'USD',
    items: [{
      item_id: 'cat-cardboard-box',
      item_name: 'Ultimate Cat Cardboard Box',
      category: 'Pet Supplies',
      quantity: 2,
      price: 24.99
    }]
  }
});
```

## Development Access

### Browser Console Commands
```javascript
// View current dataLayer
console.log(window.dataLayer);

// Get analytics summary
getAnalyticsSummary();

// View tracking configuration
console.log(window.trackingConfig);
```

### Debug Panel Functions
- **Show Analytics Summary**: Logs complete tracking state
- **Show DataLayer**: Displays all events in queue
- **Test Ad Images**: Validates image accessibility
- **Trigger Test Error**: Fires error event for testing

## Event Validation

All events are validated against the schema in `config/tracking_plan.json` before being sent to the API. The validation includes:

- Required field checking
- Data type validation
- Enum value verification
- String length limits
- Numeric range validation

This comprehensive data model enables sophisticated attribution analysis, conversion tracking, and performance monitoring across the entire customer journey.