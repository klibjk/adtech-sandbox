-- Aggregated daily metrics view for Power BI dashboard
-- This view combines data from multiple tables to provide daily summaries

CREATE OR REPLACE VIEW agg_daily_metrics_v AS
WITH daily_base AS (
    SELECT 
        DATE(to_timestamp(timestamp / 1000)) as event_date,
        tracking_mode,
        session_id,
        user_id,
        event_type
    FROM events_raw
    WHERE timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '30 days') * 1000
),
daily_sessions AS (
    SELECT 
        event_date,
        tracking_mode,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_events
    FROM daily_base
    GROUP BY event_date, tracking_mode
),
daily_ad_metrics AS (
    SELECT 
        DATE(to_timestamp(a.timestamp / 1000)) as event_date,
        a.tracking_mode,
        a.ad_type,
        COUNT(CASE WHEN a.event_type = 'ad_view' THEN 1 END) as ad_views,
        COUNT(CASE WHEN a.event_type = 'ad_click' THEN 1 END) as ad_clicks,
        COUNT(DISTINCT a.session_id) as sessions_with_ad_activity,
        AVG(CASE WHEN a.event_type = 'ad_view' THEN a.viewport_percentage END) as avg_viewability
    FROM ad_events a
    WHERE a.timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '30 days') * 1000
    GROUP BY event_date, a.tracking_mode, a.ad_type
),
daily_web_vitals AS (
    SELECT 
        DATE(to_timestamp(w.timestamp / 1000)) as event_date,
        w.metric_name,
        AVG(w.metric_value) as avg_metric_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY w.metric_value) as median_metric_value,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY w.metric_value) as p75_metric_value,
        COUNT(CASE WHEN w.metric_rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_rating_percentage,
        COUNT(CASE WHEN w.metric_rating = 'poor' THEN 1 END) * 100.0 / COUNT(*) as poor_rating_percentage
    FROM web_vitals_raw w
    WHERE w.timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '30 days') * 1000
    GROUP BY event_date, w.metric_name
),
daily_errors AS (
    SELECT 
        DATE(to_timestamp(e.timestamp / 1000)) as event_date,
        COUNT(*) as error_count,
        COUNT(DISTINCT e.session_id) as sessions_with_errors
    FROM error_events e
    WHERE e.timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '30 days') * 1000
    GROUP BY event_date
)
SELECT 
    COALESCE(ds.event_date, da.event_date, dw.event_date, de.event_date) as date,
    
    -- Session metrics
    ds.tracking_mode,
    COALESCE(ds.unique_sessions, 0) as unique_sessions,
    COALESCE(ds.unique_users, 0) as unique_users,
    COALESCE(ds.total_events, 0) as total_events,
    
    -- Ad metrics
    da.ad_type,
    COALESCE(da.ad_views, 0) as ad_views,
    COALESCE(da.ad_clicks, 0) as ad_clicks,
    COALESCE(da.sessions_with_ad_activity, 0) as sessions_with_ad_activity,
    ROUND(COALESCE(da.avg_viewability, 0), 2) as avg_viewability_percentage,
    
    -- CTR calculation
    CASE 
        WHEN COALESCE(da.ad_views, 0) > 0 
        THEN ROUND((COALESCE(da.ad_clicks, 0) * 100.0 / da.ad_views), 3)
        ELSE 0 
    END as ctr_percentage,
    
    -- RPM calculation (Revenue Per Mille - using clicks as proxy for revenue)
    CASE 
        WHEN COALESCE(da.ad_views, 0) > 0 
        THEN ROUND((COALESCE(da.ad_clicks, 0) * 1000.0 / da.ad_views), 2)
        ELSE 0 
    END as rpm,
    
    -- Web Vitals metrics
    dw.metric_name as web_vital_metric,
    ROUND(COALESCE(dw.avg_metric_value, 0), 2) as avg_web_vital_value,
    ROUND(COALESCE(dw.median_metric_value, 0), 2) as median_web_vital_value,
    ROUND(COALESCE(dw.p75_metric_value, 0), 2) as p75_web_vital_value,
    ROUND(COALESCE(dw.good_rating_percentage, 0), 1) as good_web_vital_percentage,
    ROUND(COALESCE(dw.poor_rating_percentage, 0), 1) as poor_web_vital_percentage,
    
    -- Error metrics
    COALESCE(de.error_count, 0) as error_count,
    COALESCE(de.sessions_with_errors, 0) as sessions_with_errors,
    
    -- Error rate calculation
    CASE 
        WHEN COALESCE(ds.unique_sessions, 0) > 0 
        THEN ROUND((COALESCE(de.sessions_with_errors, 0) * 100.0 / ds.unique_sessions), 2)
        ELSE 0 
    END as error_rate_percentage

FROM daily_sessions ds
FULL OUTER JOIN daily_ad_metrics da ON ds.event_date = da.event_date AND ds.tracking_mode = da.tracking_mode
FULL OUTER JOIN daily_web_vitals dw ON COALESCE(ds.event_date, da.event_date) = dw.event_date
FULL OUTER JOIN daily_errors de ON COALESCE(ds.event_date, da.event_date, dw.event_date) = de.event_date

ORDER BY date DESC, tracking_mode, ad_type, web_vital_metric;

-- Create a simpler hourly metrics view for real-time monitoring
CREATE OR REPLACE VIEW hourly_metrics_v AS
SELECT 
    DATE_TRUNC('hour', to_timestamp(timestamp / 1000)) as hour,
    tracking_mode,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users
FROM events_raw
WHERE timestamp >= EXTRACT(epoch FROM NOW() - INTERVAL '24 hours') * 1000
GROUP BY hour, tracking_mode, event_type
ORDER BY hour DESC, tracking_mode, event_type;

-- Create ad performance summary view
CREATE OR REPLACE VIEW ad_performance_summary_v AS
SELECT 
    a.ad_id,
    a.ad_type,
    a.tracking_mode,
    COUNT(CASE WHEN a.event_type = 'ad_view' THEN 1 END) as total_views,
    COUNT(CASE WHEN a.event_type = 'ad_click' THEN 1 END) as total_clicks,
    COUNT(DISTINCT a.session_id) as unique_sessions,
    COUNT(DISTINCT a.user_id) as unique_users,
    
    -- CTR calculation
    CASE 
        WHEN COUNT(CASE WHEN a.event_type = 'ad_view' THEN 1 END) > 0 
        THEN ROUND((COUNT(CASE WHEN a.event_type = 'ad_click' THEN 1 END) * 100.0 / 
                    COUNT(CASE WHEN a.event_type = 'ad_view' THEN 1 END)), 3)
        ELSE 0 
    END as ctr_percentage,
    
    -- Average viewability for views
    ROUND(AVG(CASE WHEN a.event_type = 'ad_view' THEN a.viewport_percentage END), 2) as avg_viewability,
    
    -- Time range
    to_timestamp(MIN(a.timestamp) / 1000) as first_event,
    to_timestamp(MAX(a.timestamp) / 1000) as last_event
    
FROM ad_events a
GROUP BY a.ad_id, a.ad_type, a.tracking_mode
ORDER BY total_views DESC, total_clicks DESC;

-- Grant read access to views (uncomment if using specific user)
-- GRANT SELECT ON agg_daily_metrics_v TO adtech_app;
-- GRANT SELECT ON hourly_metrics_v TO adtech_app;  
-- GRANT SELECT ON ad_performance_summary_v TO adtech_app;