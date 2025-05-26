# AdTech Analytics Sandbox

A full-stack JavaScript/TypeScript demonstration of modern ad-delivery mechanics and marketing-analytics pipelines. Built for showcasing technical proficiency in Solutions Engineering and Marketing Tech Analytics interviews.

## 🎯 Purpose & Features

### Core Capabilities
- **Multiple Ad Formats**: Banner, sticky, and interstitial ads with realistic behavior
- **Dual Tracking Modes**: Cookie-based and cookieless tracking with seamless switching
- **Event Pipeline**: Complete data flow from client events to SQL analytics
- **Performance Monitoring**: Core Web Vitals collection and JavaScript error tracking
- **Analytics Ready**: Power BI integration with pre-built dashboards and CSV exports

### Technical Stack
- **Frontend**: Vanilla JavaScript with modern Web APIs (Intersection Observer, Performance Observer)
- **Backend**: Node.js/Express with TypeScript support
- **Database**: PostgreSQL 16 with optimized schema and analytics views
- **Infrastructure**: Docker Compose for local development, Vercel-ready for deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (uses `.nvmrc`)
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd adtech-sandbox
nvm use  # Uses Node 18 from .nvmrc
npm install

# Start database
cd database && docker compose up -d
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your database URL: postgresql://adtech_user:adtech_password@localhost:5432/adtech_sandbox

# Start development servers
npm run dev
```

The application will be available at `http://localhost:3000` with API at `http://localhost:3000/api`.

## 📊 Demo Workflow

### For Solutions Engineering Interviews

1. **Ad Performance Monitoring**
   - Open browser dev tools → Network tab
   - Scroll page to trigger ad viewability events
   - Click ads to generate interaction data
   - Monitor real-time API calls to `/api/events`

2. **Tracking Mode Comparison**
   - Toggle between Cookie/Cookieless modes using header switch
   - Observe different user ID generation strategies
   - Compare attribution in analytics dashboard

3. **Performance Impact Analysis**
   - Check Core Web Vitals in dev tools (Debug Panel)
   - Correlate ad loading with performance metrics
   - Demonstrate error tracking with intentional JavaScript errors

### For Marketing Tech Analytics Interviews

1. **Data Pipeline Demonstration**
   ```bash
   # Export analytics data
   npm run export-data
   
   # View aggregated metrics
   open exports/daily_metrics.csv
   ```

2. **GTM-Style Integration**
   - Console: `getAnalyticsSummary()` - view complete tracking state
   - Console: `window.dataLayer` - inspect event queue for tag management
   - Show tracking plan configuration in `config/tracking_plan.json`

3. **Data Quality & Validation**
   ```bash
   # Run comprehensive QA tests
   npm run qa
   ```

## 🏗️ Architecture Overview

### Event Flow
```
User Action → Client Tracking → API Validation → Database Storage → Analytics Views → Power BI
```

### Key Components

- **`frontend/js/tracking-config.js`**: Core tracking logic with mode switching
- **`frontend/js/ads/ad-manager.js`**: Ad visibility and interaction handling
- **`frontend/js/core-web-vitals.js`**: Performance metrics collection
- **`api/services/database.js`**: Event storage and retrieval
- **`database/views/agg_daily_metrics_v.sql`**: Analytics aggregation layer

### Database Schema

- `events_raw`: All client events with full JSON payload
- `ad_events`: Structured ad interaction data
- `web_vitals_raw`: Core Web Vitals measurements
- `sessions_dim`: Session-level attribution data
- `agg_daily_metrics_v`: Aggregated view for dashboard consumption

## 📈 Analytics & Reporting

### Available Metrics

- **Ad Performance**: CTR, viewability, RPM by ad type and tracking mode
- **Attribution Analysis**: Cookie vs cookieless user behavior comparison  
- **Performance Impact**: Core Web Vitals correlation with ad loading
- **Data Quality**: Error rates, session completeness, tracking reliability

### Power BI Integration

1. Export data: `npm run export-data`
2. Open `dashboards/insights.pbix` in Power BI Desktop
3. Update data source to point to your exported CSV files
4. Refresh to see live analytics

### SQL Analytics Examples

```sql
-- Daily CTR by tracking mode
SELECT 
    date,
    tracking_mode,
    SUM(ad_clicks) as total_clicks,
    SUM(ad_views) as total_views,
    SUM(ad_clicks) * 100.0 / SUM(ad_views) as ctr_percentage
FROM agg_daily_metrics_v 
GROUP BY date, tracking_mode 
ORDER BY date DESC;

-- Core Web Vitals impact on ad performance
SELECT 
    wv.metric_name,
    wv.metric_rating,
    COUNT(DISTINCT ae.session_id) as sessions,
    AVG(ae.ad_clicks * 100.0 / NULLIF(ae.ad_views, 0)) as avg_ctr
FROM web_vitals_raw wv
JOIN ad_events ae ON wv.session_id = ae.session_id
GROUP BY wv.metric_name, wv.metric_rating;
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start frontend + API servers
npm run dev:frontend     # Frontend only (Vite)
npm run dev:api         # API only (nodemon)

# Database  
docker compose up -d     # Start PostgreSQL (from database/ directory)
npm run export-data      # Generate CSV exports for Power BI

# Quality Assurance
npm run lint            # ESLint + Prettier check
npm run test            # Vitest unit tests
npm run qa              # End-to-end tag validation (Playwright)

# Production
npm run build           # Build for deployment
```

## 🎯 Interview Talking Points

### Solutions Engineering Focus

- **Real-world ad mechanics**: Intersection Observer for viewability, realistic CTR patterns
- **Performance considerations**: Core Web Vitals monitoring, async loading strategies
- **Cross-browser compatibility**: Graceful fallbacks for tracking modes
- **Debugging capabilities**: Built-in dev tools, request tracking, error monitoring

### Marketing Tech Analytics Focus

- **Data standardization**: Consistent event schema across tracking modes
- **Attribution methodology**: Cookie vs cookieless user journey comparison
- **Data quality assurance**: Validation rules, QA automation, data completeness checks
- **Scalable architecture**: Event-driven design, API-first analytics, modular tracking plan

## 🚧 Project Structure

```
adtech-sandbox/
├── frontend/           # Client-side tracking & UI
│   ├── js/ads/        # Ad management logic
│   └── css/           # Responsive styling
├── api/               # Express server & routes
│   └── services/      # Database & validation
├── database/          # PostgreSQL schema & views
├── exports/           # Generated CSV files
├── tests/             # QA automation
├── config/            # Tracking plan configuration
└── dashboards/        # Power BI templates
```

## 📝 Notes for Interviewers

This sandbox demonstrates production-ready practices while maintaining clear, educational code structure. Every component includes realistic error handling, performance considerations, and extensibility for additional analytics tools.

**Key differentiators:**
- Dual tracking implementation (not just theoretical)
- Complete data pipeline from click to dashboard
- Industry-standard metrics (Core Web Vitals, CTR, RPM)
- QA automation for tag validation
- Interview-ready demo scenarios

For questions or technical deep-dives during interviews, see the auto-generated build log at `.agent_log/BUILD_LOG.md` for complete implementation details.