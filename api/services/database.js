import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export class DatabaseService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Database pool error:', err);
        });
    }

    async healthCheck() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT NOW() as current_time');
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async insertEvent(eventData) {
        const client = await this.pool.connect();
        try {
            // Insert into events_raw table
            const query = `
                INSERT INTO events_raw (
                    event_type, session_id, user_id, tracking_mode,
                    timestamp, server_timestamp, page_url, client_ip,
                    user_agent, request_id, event_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, created_at
            `;
            
            const values = [
                eventData.event_type,
                eventData.session_id,
                eventData.user_id,
                eventData.tracking_mode,
                eventData.timestamp,
                eventData.server_timestamp,
                eventData.page_url,
                eventData.client_ip,
                eventData.user_agent,
                eventData.request_id,
                JSON.stringify(eventData) // Store full event as JSON
            ];

            const result = await client.query(query, values);
            
            // Also handle specific event types
            await this.handleSpecificEvent(client, eventData, result.rows[0].id);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async handleSpecificEvent(client, eventData, eventId) {
        try {
            switch (eventData.event_type) {
                case 'ad_view':
                case 'ad_click':
                    await this.insertAdEvent(client, eventData, eventId);
                    break;
                case 'web_vitals':
                    await this.insertWebVitalsEvent(client, eventData, eventId);
                    break;
                case 'error':
                    await this.insertErrorEvent(client, eventData, eventId);
                    break;
                case 'page_load':
                    await this.updateSessionData(client, eventData);
                    break;
            }
        } catch (error) {
            console.warn('Failed to handle specific event type:', error);
            // Don't throw - raw event is already saved
        }
    }

    async insertAdEvent(client, eventData, eventId) {
        const query = `
            INSERT INTO ad_events (
                event_id, ad_id, ad_type, event_type,
                session_id, user_id, tracking_mode,
                viewport_percentage, click_x, click_y,
                timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        
        const values = [
            eventId,
            eventData.ad_id,
            eventData.ad_type,
            eventData.event_type,
            eventData.session_id,
            eventData.user_id,
            eventData.tracking_mode,
            eventData.viewport_percentage || null,
            eventData.click_x || null,
            eventData.click_y || null,
            eventData.timestamp
        ];

        await client.query(query, values);
    }

    async insertWebVitalsEvent(client, eventData, eventId) {
        const query = `
            INSERT INTO web_vitals_raw (
                event_id, metric_name, metric_value, metric_rating,
                session_id, user_id, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
            eventId,
            eventData.metric_name,
            eventData.metric_value,
            eventData.metric_rating,
            eventData.session_id,
            eventData.user_id,
            eventData.timestamp
        ];

        await client.query(query, values);
    }

    async insertErrorEvent(client, eventData, eventId) {
        const query = `
            INSERT INTO error_events (
                event_id, error_message, error_stack, error_line,
                error_column, error_filename, session_id, user_id,
                timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        
        const values = [
            eventId,
            eventData.error_message,
            eventData.error_stack || null,
            eventData.error_line || null,
            eventData.error_column || null,
            eventData.error_filename || null,
            eventData.session_id,
            eventData.user_id,
            eventData.timestamp
        ];

        await client.query(query, values);
    }

    async updateSessionData(client, eventData) {
        // Upsert session data
        const query = `
            INSERT INTO sessions_dim (
                session_id, user_id, tracking_mode, first_page_url,
                user_agent, viewport_width, viewport_height,
                screen_width, screen_height, language, timezone_offset,
                first_seen_at, last_seen_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
            ON CONFLICT (session_id) DO UPDATE SET
                last_seen_at = $12,
                tracking_mode = $2
        `;
        
        const timestamp = new Date(eventData.timestamp);
        const values = [
            eventData.session_id,
            eventData.user_id,
            eventData.tracking_mode,
            eventData.page_url,
            eventData.user_agent || null,
            eventData.viewport_width || null,
            eventData.viewport_height || null,
            eventData.screen_width || null,
            eventData.screen_height || null,
            eventData.language || null,
            eventData.timezone_offset || null,
            timestamp
        ];

        await client.query(query, values);
    }

    async getEvents({ limit = 100, offset = 0, filters = {} }) {
        const client = await this.pool.connect();
        try {
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            // Build dynamic WHERE clause
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (key === 'start_date') {
                        whereClause += ` AND timestamp >= $${paramIndex}`;
                        queryParams.push(new Date(value));
                    } else if (key === 'end_date') {
                        whereClause += ` AND timestamp <= $${paramIndex}`;
                        queryParams.push(new Date(value));
                    } else {
                        whereClause += ` AND ${key} = $${paramIndex}`;
                        queryParams.push(value);
                    }
                    paramIndex++;
                }
            });

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM events_raw ${whereClause}`;
            const countResult = await client.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);

            // Get paginated results
            const dataQuery = `
                SELECT * FROM events_raw 
                ${whereClause}
                ORDER BY timestamp DESC 
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            queryParams.push(limit, offset);
            
            const dataResult = await client.query(dataQuery, queryParams);

            return {
                rows: dataResult.rows,
                total
            };
        } finally {
            client.release();
        }
    }

    async getEventSummary(period = '24h', groupBy = 'hour') {
        const client = await this.pool.connect();
        try {
            // Convert period to hours
            const periodHours = period.endsWith('h') ? parseInt(period) : 24;
            
            // Determine time grouping
            let timeGroup;
            switch (groupBy) {
                case 'minute':
                    timeGroup = "date_trunc('minute', to_timestamp(timestamp / 1000))";
                    break;
                case 'hour':
                    timeGroup = "date_trunc('hour', to_timestamp(timestamp / 1000))";
                    break;
                case 'day':
                    timeGroup = "date_trunc('day', to_timestamp(timestamp / 1000))";
                    break;
                default:
                    timeGroup = "date_trunc('hour', to_timestamp(timestamp / 1000))";
            }

            const query = `
                SELECT 
                    ${timeGroup} as time_bucket,
                    event_type,
                    tracking_mode,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    COUNT(DISTINCT user_id) as unique_users
                FROM events_raw 
                WHERE timestamp >= $1
                GROUP BY time_bucket, event_type, tracking_mode
                ORDER BY time_bucket DESC, event_type
            `;

            const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
            const result = await client.query(query, [cutoffTime]);

            return result.rows;
        } finally {
            client.release();
        }
    }

    async clearEvents() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Clear all event tables
            const tables = [
                'error_events',
                'web_vitals_raw', 
                'ad_events',
                'events_raw',
                'sessions_dim'
            ];

            let totalDeleted = 0;
            for (const table of tables) {
                const result = await client.query(`DELETE FROM ${table}`);
                totalDeleted += result.rowCount;
            }

            await client.query('COMMIT');
            return { deletedCount: totalDeleted };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}