-- AdTech Analytics Sandbox Database Schema
-- PostgreSQL 16+ compatible

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Raw events table - stores all events as they come in
CREATE TABLE IF NOT EXISTS events_raw (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    tracking_mode VARCHAR(20) NOT NULL CHECK (tracking_mode IN ('cookie', 'cookieless')),
    timestamp BIGINT NOT NULL, -- Client timestamp
    server_timestamp BIGINT NOT NULL, -- Server timestamp
    page_url TEXT NOT NULL,
    client_ip INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    event_data JSONB, -- Full event payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events_raw
CREATE INDEX IF NOT EXISTS idx_events_raw_timestamp ON events_raw (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_raw_session_id ON events_raw (session_id);
CREATE INDEX IF NOT EXISTS idx_events_raw_user_id ON events_raw (user_id);
CREATE INDEX IF NOT EXISTS idx_events_raw_event_type ON events_raw (event_type);
CREATE INDEX IF NOT EXISTS idx_events_raw_tracking_mode ON events_raw (tracking_mode);
CREATE INDEX IF NOT EXISTS idx_events_raw_created_at ON events_raw (created_at);
CREATE INDEX IF NOT EXISTS idx_events_raw_event_data ON events_raw USING GIN (event_data);

-- Sessions dimension table
CREATE TABLE IF NOT EXISTS sessions_dim (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tracking_mode VARCHAR(20) NOT NULL,
    first_page_url TEXT,
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    screen_width INTEGER,
    screen_height INTEGER,
    language VARCHAR(10),
    timezone_offset INTEGER,
    ccpa_opt_out BOOLEAN DEFAULT FALSE,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sessions_dim
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions_dim (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tracking_mode ON sessions_dim (tracking_mode);
CREATE INDEX IF NOT EXISTS idx_sessions_ccpa_opt_out ON sessions_dim (ccpa_opt_out);
CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON sessions_dim (first_seen_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions_dim (last_seen_at);

-- Ad events table - structured ad interaction data
CREATE TABLE IF NOT EXISTS ad_events (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events_raw(id) ON DELETE CASCADE,
    ad_id VARCHAR(255) NOT NULL,
    ad_name VARCHAR(255),
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('banner', 'sticky', 'interstitial')),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('ad_view', 'ad_click', 'ad_close')),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    tracking_mode VARCHAR(20) NOT NULL,
    viewport_percentage INTEGER CHECK (viewport_percentage >= 0 AND viewport_percentage <= 100),
    click_x INTEGER,
    click_y INTEGER,
    ad_view_timestamp BIGINT, -- When the ad was first viewed
    time_to_close_ms INTEGER, -- Time from view to close in milliseconds
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ad_events
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id ON ad_events (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_type ON ad_events (ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_event_type ON ad_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_session_id ON ad_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_user_id ON ad_events (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_timestamp ON ad_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_events_tracking_mode ON ad_events (tracking_mode);

-- Web vitals table - Core Web Vitals measurements
CREATE TABLE IF NOT EXISTS web_vitals_raw (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events_raw(id) ON DELETE CASCADE,
    metric_name VARCHAR(20) NOT NULL CHECK (metric_name IN ('CLS', 'LCP', 'FID', 'FCP', 'TTFB')),
    metric_value DECIMAL(10,3) NOT NULL,
    metric_rating VARCHAR(20) NOT NULL CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for web_vitals_raw
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON web_vitals_raw (metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_rating ON web_vitals_raw (metric_rating);
CREATE INDEX IF NOT EXISTS idx_web_vitals_session_id ON web_vitals_raw (session_id);
CREATE INDEX IF NOT EXISTS idx_web_vitals_timestamp ON web_vitals_raw (timestamp);

-- Error events table - JavaScript errors and exceptions
CREATE TABLE IF NOT EXISTS error_events (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events_raw(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_line INTEGER,
    error_column INTEGER,
    error_filename TEXT,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for error_events
CREATE INDEX IF NOT EXISTS idx_error_events_session_id ON error_events (session_id);
CREATE INDEX IF NOT EXISTS idx_error_events_timestamp ON error_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_error_events_error_message ON error_events USING GIN (to_tsvector('english', error_message));

-- Update trigger for sessions_dim
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sessions_updated_at
    BEFORE UPDATE ON sessions_dim
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

-- Function to convert timestamp to date for partitioning
CREATE OR REPLACE FUNCTION timestamp_to_date(ts BIGINT)
RETURNS DATE AS $$
BEGIN
    RETURN DATE(to_timestamp(ts / 1000));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create partitions for events_raw by date (for better performance with large datasets)
-- This is optional but recommended for production use

-- Comments for documentation
COMMENT ON TABLE events_raw IS 'Raw event data as received from clients';
COMMENT ON TABLE sessions_dim IS 'Session dimension data for analytics';
COMMENT ON COLUMN sessions_dim.ccpa_opt_out IS 'CCPA "Do Not Sell or Share My Personal Information" opt-out preference';
COMMENT ON TABLE ad_events IS 'Structured ad interaction events';
COMMENT ON TABLE web_vitals_raw IS 'Core Web Vitals performance measurements';
COMMENT ON TABLE error_events IS 'JavaScript errors and exceptions';

COMMENT ON COLUMN events_raw.timestamp IS 'Client-side timestamp in milliseconds';
COMMENT ON COLUMN events_raw.server_timestamp IS 'Server-side timestamp in milliseconds';
COMMENT ON COLUMN events_raw.event_data IS 'Full event payload as JSON';
COMMENT ON COLUMN ad_events.viewport_percentage IS 'Percentage of ad visible in viewport (0-100)';
COMMENT ON COLUMN web_vitals_raw.metric_value IS 'Metric value (milliseconds for timing, ratio for CLS)';

-- Grant permissions (adjust as needed for your setup)
-- These would typically be run separately with proper user management
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO adtech_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO adtech_app;