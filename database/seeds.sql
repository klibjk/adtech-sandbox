-- Seed data for AdTech Analytics Sandbox
-- This file populates the database with sample data for development and testing

-- Insert sample sessions
INSERT INTO sessions_dim (
    session_id, user_id, tracking_mode, first_page_url, user_agent,
    viewport_width, viewport_height, screen_width, screen_height,
    language, timezone_offset, first_seen_at, last_seen_at
) VALUES 
(
    'sess_demo_001', 'user_cookie_demo_001', 'cookie', 
    'http://localhost:3000/', 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    1920, 1080, 1920, 1080, 'en-US', -300,
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'
),
(
    'sess_demo_002', 'fp_cookieless_demo_001', 'cookieless',
    'http://localhost:3000/',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    1440, 900, 1440, 900, 'en-US', -480,
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '30 minutes'
),
(
    'sess_demo_003', 'user_cookie_demo_002', 'cookie',
    'http://localhost:3000/',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    375, 812, 375, 812, 'en-US', -240,
    NOW() - INTERVAL '1 hour', NOW() - INTERVAL '15 minutes'
);

-- Insert sample raw events
INSERT INTO events_raw (
    event_type, session_id, user_id, tracking_mode, timestamp, server_timestamp,
    page_url, client_ip, user_agent, request_id, event_data
) VALUES 
-- Page load events
(
    'page_load', 'sess_demo_001', 'user_cookie_demo_001', 'cookie',
    EXTRACT(epoch FROM NOW() - INTERVAL '2 hours') * 1000,
    EXTRACT(epoch FROM NOW() - INTERVAL '2 hours') * 1000,
    'http://localhost:3000/', '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'req_demo_001', 
    '{"page_title": "AdTech Analytics Sandbox", "referrer": "", "viewport_width": 1920, "viewport_height": 1080}'::jsonb
),
(
    'page_load', 'sess_demo_002', 'fp_cookieless_demo_001', 'cookieless',
    EXTRACT(epoch FROM NOW() - INTERVAL '3 hours') * 1000,
    EXTRACT(epoch FROM NOW() - INTERVAL '3 hours') * 1000,
    'http://localhost:3000/', '192.168.1.100',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'req_demo_002',
    '{"page_title": "AdTech Analytics Sandbox", "referrer": "https://google.com", "viewport_width": 1440, "viewport_height": 900}'::jsonb
);

-- Get the event IDs for the events we just inserted
DO $$
DECLARE
    page_load_event_1 BIGINT;
    page_load_event_2 BIGINT;
    base_timestamp_1 BIGINT;
    base_timestamp_2 BIGINT;
BEGIN
    SELECT id INTO page_load_event_1 FROM events_raw WHERE session_id = 'sess_demo_001' AND event_type = 'page_load';
    SELECT id INTO page_load_event_2 FROM events_raw WHERE session_id = 'sess_demo_002' AND event_type = 'page_load';
    
    base_timestamp_1 := EXTRACT(epoch FROM NOW() - INTERVAL '2 hours') * 1000;
    base_timestamp_2 := EXTRACT(epoch FROM NOW() - INTERVAL '3 hours') * 1000;

    -- Insert ad view events
    INSERT INTO events_raw (event_type, session_id, user_id, tracking_mode, timestamp, server_timestamp, page_url, client_ip, user_agent, request_id, event_data) VALUES
    ('ad_view', 'sess_demo_001', 'user_cookie_demo_001', 'cookie', base_timestamp_1 + 2000, base_timestamp_1 + 2000, 'http://localhost:3000/', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'req_demo_003', '{"ad_id": "banner-001", "ad_type": "banner", "viewport_percentage": 85}'::jsonb),
    ('ad_view', 'sess_demo_001', 'user_cookie_demo_001', 'cookie', base_timestamp_1 + 5000, base_timestamp_1 + 5000, 'http://localhost:3000/', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'req_demo_004', '{"ad_id": "sticky-001", "ad_type": "sticky", "viewport_percentage": 100}'::jsonb),
    ('ad_view', 'sess_demo_002', 'fp_cookieless_demo_001', 'cookieless', base_timestamp_2 + 3000, base_timestamp_2 + 3000, 'http://localhost:3000/', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'req_demo_005', '{"ad_id": "banner-001", "ad_type": "banner", "viewport_percentage": 75}'::jsonb);

    -- Insert ad click events  
    INSERT INTO events_raw (event_type, session_id, user_id, tracking_mode, timestamp, server_timestamp, page_url, client_ip, user_agent, request_id, event_data) VALUES
    ('ad_click', 'sess_demo_001', 'user_cookie_demo_001', 'cookie', base_timestamp_1 + 8000, base_timestamp_1 + 8000, 'http://localhost:3000/', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'req_demo_006', '{"ad_id": "banner-001", "ad_type": "banner", "click_x": 364, "click_y": 45}'::jsonb),
    ('ad_click', 'sess_demo_002', 'fp_cookieless_demo_001', 'cookieless', base_timestamp_2 + 12000, base_timestamp_2 + 12000, 'http://localhost:3000/', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'req_demo_007', '{"ad_id": "banner-001", "ad_type": "banner", "click_x": 400, "click_y": 50}'::jsonb);

    -- Insert Web Vitals events
    INSERT INTO events_raw (event_type, session_id, user_id, tracking_mode, timestamp, server_timestamp, page_url, client_ip, user_agent, request_id, event_data) VALUES
    ('web_vitals', 'sess_demo_001', 'user_cookie_demo_001', 'cookie', base_timestamp_1 + 1500, base_timestamp_1 + 1500, 'http://localhost:3000/', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'req_demo_008', '{"metric_name": "LCP", "metric_value": 1200, "metric_rating": "good"}'::jsonb),
    ('web_vitals', 'sess_demo_001', 'user_cookie_demo_001', 'cookie', base_timestamp_1 + 3000, base_timestamp_1 + 3000, 'http://localhost:3000/', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'req_demo_009', '{"metric_name": "FID", "metric_value": 85, "metric_rating": "good"}'::jsonb),
    ('web_vitals', 'sess_demo_002', 'fp_cookieless_demo_001', 'cookieless', base_timestamp_2 + 1800, base_timestamp_2 + 1800, 'http://localhost:3000/', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'req_demo_010', '{"metric_name": "LCP", "metric_value": 2800, "metric_rating": "needs-improvement"}'::jsonb);

END $$;

-- Insert structured ad events based on raw events
INSERT INTO ad_events (event_id, ad_id, ad_type, event_type, session_id, user_id, tracking_mode, viewport_percentage, click_x, click_y, timestamp)
SELECT 
    e.id,
    e.event_data->>'ad_id',
    e.event_data->>'ad_type',
    e.event_type,
    e.session_id,
    e.user_id,
    e.tracking_mode,
    CASE WHEN e.event_data->>'viewport_percentage' IS NOT NULL 
         THEN (e.event_data->>'viewport_percentage')::INTEGER 
         ELSE NULL END,
    CASE WHEN e.event_data->>'click_x' IS NOT NULL 
         THEN (e.event_data->>'click_x')::INTEGER 
         ELSE NULL END,
    CASE WHEN e.event_data->>'click_y' IS NOT NULL 
         THEN (e.event_data->>'click_y')::INTEGER 
         ELSE NULL END,
    e.timestamp
FROM events_raw e
WHERE e.event_type IN ('ad_view', 'ad_click')
AND e.event_data->>'ad_id' IS NOT NULL;

-- Insert structured web vitals events
INSERT INTO web_vitals_raw (event_id, metric_name, metric_value, metric_rating, session_id, user_id, timestamp)
SELECT 
    e.id,
    e.event_data->>'metric_name',
    (e.event_data->>'metric_value')::DECIMAL,
    e.event_data->>'metric_rating',
    e.session_id,
    e.user_id,
    e.timestamp
FROM events_raw e
WHERE e.event_type = 'web_vitals'
AND e.event_data->>'metric_name' IS NOT NULL;

-- Add some sample error events
INSERT INTO events_raw (event_type, session_id, user_id, tracking_mode, timestamp, server_timestamp, page_url, client_ip, user_agent, request_id, event_data) VALUES
(
    'error', 'sess_demo_001', 'user_cookie_demo_001', 'cookie',
    EXTRACT(epoch FROM NOW() - INTERVAL '1 hour 30 minutes') * 1000,
    EXTRACT(epoch FROM NOW() - INTERVAL '1 hour 30 minutes') * 1000,
    'http://localhost:3000/', '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'req_demo_error_001',
    '{"error_message": "TypeError: Cannot read property of undefined", "error_line": 42, "error_filename": "main.js"}'::jsonb
);

INSERT INTO error_events (event_id, error_message, error_stack, error_line, error_column, error_filename, session_id, user_id, timestamp)
SELECT 
    e.id,
    e.event_data->>'error_message',
    e.event_data->>'error_stack',
    CASE WHEN e.event_data->>'error_line' IS NOT NULL 
         THEN (e.event_data->>'error_line')::INTEGER 
         ELSE NULL END,
    CASE WHEN e.event_data->>'error_column' IS NOT NULL 
         THEN (e.event_data->>'error_column')::INTEGER 
         ELSE NULL END,
    e.event_data->>'error_filename',
    e.session_id,
    e.user_id,
    e.timestamp
FROM events_raw e
WHERE e.event_type = 'error'
AND e.event_data->>'error_message' IS NOT NULL;

-- Display summary of seeded data
DO $$
DECLARE
    event_count INTEGER;
    session_count INTEGER;
    ad_event_count INTEGER;
    vitals_count INTEGER;
    error_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO event_count FROM events_raw;
    SELECT COUNT(*) INTO session_count FROM sessions_dim;
    SELECT COUNT(*) INTO ad_event_count FROM ad_events;
    SELECT COUNT(*) INTO vitals_count FROM web_vitals_raw;
    SELECT COUNT(*) INTO error_count FROM error_events;
    
    RAISE NOTICE 'Database seeded successfully!';
    RAISE NOTICE 'Total events: %', event_count;
    RAISE NOTICE 'Total sessions: %', session_count;
    RAISE NOTICE 'Ad events: %', ad_event_count;
    RAISE NOTICE 'Web vitals: %', vitals_count;
    RAISE NOTICE 'Error events: %', error_count;
END $$;