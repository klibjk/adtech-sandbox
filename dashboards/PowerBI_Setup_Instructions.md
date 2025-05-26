# Power BI Dashboard Setup Instructions

This guide explains how to connect the AdTech Analytics Sandbox data to Power BI for visualization.

## Data Source Setup

### Option 1: CSV Import (Recommended for Demo)

1. **Export Data**:
   ```bash
   npm run export-data
   ```
   This creates CSV files in the `/exports/` directory.

2. **Power BI Import**:
   - Open Power BI Desktop
   - Select "Get Data" → "Text/CSV"
   - Import the following files from `/exports/`:
     - `daily_metrics.csv` - Main dashboard data
     - `ad_performance.csv` - Ad unit analysis
     - `web_vitals.csv` - Performance metrics
     - `cookie_vs_cookieless.csv` - Attribution comparison

### Option 2: Direct PostgreSQL Connection

1. **Install PostgreSQL Connector** in Power BI
2. **Connection Details**:
   - Server: `localhost:5432` (or your database host)
   - Database: `adtech_sandbox`
   - Username: `adtech_user`
   - Password: `adtech_password`

3. **Import Tables/Views**:
   - `agg_daily_metrics_v` - Pre-aggregated daily metrics
   - `ad_performance_summary_v` - Ad performance summary
   - `hourly_metrics_v` - Real-time hourly data

## Dashboard Pages

### 1. Executive Summary
**Key Metrics Cards:**
- Total Sessions (30 days)
- Total Ad Views
- Overall CTR %
- Average RPM

**Charts:**
- Daily Sessions Trend (Line chart)
- CTR by Ad Type (Column chart)
- Cookie vs Cookieless Split (Pie chart)

### 2. Ad Performance Analysis
**Visuals:**
- CTR by Ad Type and Tracking Mode (Clustered column)
- Daily Ad Views vs Clicks (Dual axis line)
- Viewability Percentage by Ad Type (Gauge)
- RPM Trends (Line chart with trend)

**Filters:**
- Date Range
- Tracking Mode
- Ad Type

### 3. Attribution Comparison
**Cookie vs Cookieless Analysis:**
- User Acquisition (New vs Returning)
- Session Duration Comparison
- Event Volume by Mode
- Attribution Accuracy Metrics

**Charts:**
- Side-by-side comparison tables
- Waterfall chart showing mode switching
- Retention analysis by tracking mode

### 4. Performance Impact
**Core Web Vitals:**
- LCP, FID, CLS distribution (Histogram)
- Web Vitals vs Ad Performance correlation
- Performance rating breakdown (Good/Needs Improvement/Poor)

**Error Analysis:**
- Error rate by session
- Most common error types
- Performance impact of errors

## DAX Measures

### Key Calculated Measures

```dax
-- Click-Through Rate
CTR = DIVIDE(SUM('daily_metrics'[ad_clicks]), SUM('daily_metrics'[ad_views])) * 100

-- Revenue Per Mille (using clicks as proxy)
RPM = DIVIDE(SUM('daily_metrics'[ad_clicks]), SUM('daily_metrics'[ad_views])) * 1000

-- Viewability Rate
Viewability_Rate = AVERAGE('daily_metrics'[avg_viewability_percentage])

-- Session Duration (in minutes)
Avg_Session_Duration = AVERAGE('session_analysis'[session_duration_seconds]) / 60

-- Good Web Vitals Percentage
Good_Vitals_Pct = 
DIVIDE(
    CALCULATE(COUNT('web_vitals'[id]), 'web_vitals'[metric_rating] = "good"),
    COUNT('web_vitals'[id])
) * 100

-- Cookie Adoption Rate
Cookie_Usage_Pct = 
DIVIDE(
    CALCULATE(COUNT('daily_metrics'[unique_sessions]), 'daily_metrics'[tracking_mode] = "cookie"),
    COUNT('daily_metrics'[unique_sessions])
) * 100
```

### Time Intelligence

```dax
-- Previous Period Comparison
CTR_Previous_Period = CALCULATE([CTR], DATEADD('daily_metrics'[date], -1, MONTH))

-- Month-over-Month Growth
CTR_MoM_Growth = ([CTR] - [CTR_Previous_Period]) / [CTR_Previous_Period] * 100

-- Rolling 7-Day Average
CTR_7Day_Avg = AVERAGEX(
    DATESINPERIOD('daily_metrics'[date], LASTDATE('daily_metrics'[date]), -7, DAY),
    [CTR]
)
```

## Visual Recommendations

### Chart Types by Metric

| Metric | Recommended Visual | Reason |
|--------|-------------------|---------|
| CTR Trends | Line Chart | Shows progression over time |
| Ad Type Performance | Clustered Column | Easy comparison across categories |
| Tracking Mode Split | Donut Chart | Shows proportion clearly |
| Web Vitals Distribution | Histogram | Shows performance distribution |
| Geography | Map | Spatial data visualization |
| Correlations | Scatter Plot | Shows relationships between metrics |

### Color Scheme
- **Primary**: #4285f4 (Google Blue)
- **Secondary**: #34a853 (Success Green)  
- **Warning**: #fbbc04 (Attention Yellow)
- **Error**: #ea4335 (Error Red)
- **Neutral**: #5f6368 (Gray)

## Refresh Strategy

### Automated Refresh (Power BI Service)
1. **Schedule**: Every 4 hours during business hours
2. **Data Source**: CSV files uploaded to SharePoint/OneDrive
3. **Automation**: GitHub Actions can upload exports to cloud storage

### Manual Refresh (Development)
1. Run `npm run export-data` 
2. Replace CSV files in Power BI
3. Refresh data model

## Performance Optimization

### For Large Datasets
- Use **Import Mode** for faster queries
- Create **Date table** for better time intelligence
- Implement **Row-level security** if multi-tenant
- Use **Aggregations** for summary tables

### Best Practices
- Filter early in data preparation
- Use calculated columns sparingly
- Optimize DAX for performance
- Implement incremental refresh for historical data

## Troubleshooting

### Common Issues

**Connection Failed:**
- Verify database credentials
- Check firewall settings
- Ensure PostgreSQL accepts connections

**Data Not Refreshing:**
- Check export script execution
- Verify file paths in Power BI
- Look for schema changes

**Performance Issues:**
- Reduce data volume with date filters
- Optimize DAX calculations
- Use summary tables instead of raw data

## Interview Demo Script

### 5-Minute Demo Flow

1. **Overview (30s)**: Executive summary page showing key metrics
2. **Deep Dive (2m)**: Ad performance analysis with filtering
3. **Attribution (1.5m)**: Cookie vs cookieless comparison
4. **Performance (1m)**: Web vitals correlation with ad metrics

### Key Talking Points
- Real-time data pipeline from client to dashboard
- Attribution differences between tracking modes
- Performance impact measurement
- Data quality and validation processes

This setup provides a comprehensive analytics foundation that demonstrates both technical depth and business insight capability for interview scenarios.