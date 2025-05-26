#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DataExporter {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.exportDir = join(__dirname, '../exports');
    }

    async ensureExportDirectory() {
        try {
            await mkdir(this.exportDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create export directory:', error);
            throw error;
        }
    }

    convertToCSV(data, headers) {
        if (!data || data.length === 0) {
            return headers ? headers.join(',') + '\n' : '';
        }

        const csvHeaders = headers || Object.keys(data[0]);
        const csvRows = data.map(row => {
            return csvHeaders.map(header => {
                let value = row[header];
                
                // Handle null/undefined values
                if (value === null || value === undefined) {
                    value = '';
                }
                
                // Convert to string and escape quotes
                value = String(value).replace(/"/g, '""');
                
                // Wrap in quotes if contains comma, newline, or quote
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }
                
                return value;
            }).join(',');
        });

        return [csvHeaders.join(','), ...csvRows].join('\n');
    }

    async exportQuery(queryName, sql, filename = null) {
        try {
            console.log(`Executing query: ${queryName}`);
            const result = await this.pool.query(sql);
            
            const csv = this.convertToCSV(result.rows);
            const outputFile = filename || `${queryName.toLowerCase().replace(/\s+/g, '_')}.csv`;
            const filePath = join(this.exportDir, outputFile);
            
            await writeFile(filePath, csv, 'utf8');
            
            console.log(`✅ Exported ${result.rows.length} rows to ${outputFile}`);
            return { filename: outputFile, rows: result.rows.length };
        } catch (error) {
            console.error(`❌ Failed to export ${queryName}:`, error.message);
            throw error;
        }
    }

    async exportDailyMetrics() {
        const sql = `
            SELECT * FROM agg_daily_metrics_v 
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY date DESC, tracking_mode, ad_type
        `;
        return await this.exportQuery('Daily Metrics', sql, 'daily_metrics.csv');
    }

    async exportHourlyMetrics() {
        const sql = `
            SELECT * FROM hourly_metrics_v
            ORDER BY hour DESC, tracking_mode, event_type
        `;
        return await this.exportQuery('Hourly Metrics', sql, 'hourly_metrics.csv');
    }

    async exportAdPerformance() {
        const sql = `
            SELECT * FROM ad_performance_summary_v
            ORDER BY total_views DESC, total_clicks DESC
        `;
        return await this.exportQuery('Ad Performance', sql, 'ad_performance.csv');
    }

    async exportRawEvents() {
        const sql = `
            SELECT 
                id,
                event_type,
                session_id,
                user_id,
                tracking_mode,
                to_timestamp(timestamp / 1000) as event_time,
                to_timestamp(server_timestamp / 1000) as server_time,
                page_url,
                client_ip,
                user_agent,
                request_id,
                event_data,
                created_at
            FROM events_raw 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY timestamp DESC
            LIMIT 10000
        `;
        return await this.exportQuery('Raw Events', sql, 'raw_events_last_7_days.csv');
    }

    async exportWebVitals() {
        const sql = `
            SELECT 
                w.id,
                w.metric_name,
                w.metric_value,
                w.metric_rating,
                w.session_id,
                w.user_id,
                to_timestamp(w.timestamp / 1000) as event_time,
                s.tracking_mode,
                s.user_agent,
                s.viewport_width,
                s.viewport_height
            FROM web_vitals_raw w
            LEFT JOIN sessions_dim s ON w.session_id = s.session_id
            WHERE w.timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '7 days') * 1000
            ORDER BY w.timestamp DESC
        `;
        return await this.exportQuery('Web Vitals', sql, 'web_vitals.csv');
    }

    async exportSessionAnalysis() {
        const sql = `
            SELECT 
                s.session_id,
                s.user_id,
                s.tracking_mode,
                s.first_page_url,
                s.language,
                s.viewport_width,
                s.viewport_height,
                s.first_seen_at,
                s.last_seen_at,
                EXTRACT(epoch FROM (s.last_seen_at - s.first_seen_at)) as session_duration_seconds,
                
                -- Event counts
                e.total_events,
                e.ad_views,
                e.ad_clicks,
                e.errors,
                
                -- Web vitals
                ROUND(AVG(CASE WHEN w.metric_name = 'LCP' THEN w.metric_value END), 2) as avg_lcp,
                ROUND(AVG(CASE WHEN w.metric_name = 'FID' THEN w.metric_value END), 2) as avg_fid,
                ROUND(AVG(CASE WHEN w.metric_name = 'CLS' THEN w.metric_value END), 3) as avg_cls
                
            FROM sessions_dim s
            LEFT JOIN (
                SELECT 
                    session_id,
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN event_type = 'ad_view' THEN 1 END) as ad_views,
                    COUNT(CASE WHEN event_type = 'ad_click' THEN 1 END) as ad_clicks,
                    COUNT(CASE WHEN event_type = 'error' THEN 1 END) as errors
                FROM events_raw
                GROUP BY session_id
            ) e ON s.session_id = e.session_id
            LEFT JOIN web_vitals_raw w ON s.session_id = w.session_id
            WHERE s.first_seen_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY s.session_id, s.user_id, s.tracking_mode, s.first_page_url, 
                     s.language, s.viewport_width, s.viewport_height, 
                     s.first_seen_at, s.last_seen_at, e.total_events, 
                     e.ad_views, e.ad_clicks, e.errors
            ORDER BY s.first_seen_at DESC
        `;
        return await this.exportQuery('Session Analysis', sql, 'session_analysis.csv');
    }

    async exportCookieVsCookieless() {
        const sql = `
            SELECT 
                tracking_mode,
                DATE(to_timestamp(timestamp / 1000)) as date,
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as unique_sessions,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN event_type = 'ad_view' THEN 1 END) as ad_views,
                COUNT(CASE WHEN event_type = 'ad_click' THEN 1 END) as ad_clicks,
                ROUND(
                    COUNT(CASE WHEN event_type = 'ad_click' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(CASE WHEN event_type = 'ad_view' THEN 1 END), 0), 
                    3
                ) as ctr_percentage
            FROM events_raw 
            WHERE timestamp >= EXTRACT(epoch FROM CURRENT_DATE - INTERVAL '30 days') * 1000
            GROUP BY tracking_mode, DATE(to_timestamp(timestamp / 1000))
            ORDER BY date DESC, tracking_mode
        `;
        return await this.exportQuery('Cookie vs Cookieless', sql, 'cookie_vs_cookieless.csv');
    }

    async generateExportManifest(exports) {
        const manifest = {
            export_timestamp: new Date().toISOString(),
            export_version: '1.0.0',
            database_url: process.env.DATABASE_URL ? 'configured' : 'not_configured',
            files: exports.map(exp => ({
                filename: exp.filename,
                rows: exp.rows,
                description: this.getFileDescription(exp.filename)
            }))
        };

        const manifestPath = join(this.exportDir, 'export_manifest.json');
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        
        console.log(`📋 Export manifest created: export_manifest.json`);
        return manifest;
    }

    getFileDescription(filename) {
        const descriptions = {
            'daily_metrics.csv': 'Daily aggregated metrics for Power BI dashboard',
            'hourly_metrics.csv': 'Hourly metrics for real-time monitoring',
            'ad_performance.csv': 'Ad unit performance summary',
            'raw_events_last_7_days.csv': 'Raw event data for last 7 days',
            'web_vitals.csv': 'Core Web Vitals measurements',
            'session_analysis.csv': 'Session-level analysis with user behavior',
            'cookie_vs_cookieless.csv': 'Comparison of cookie vs cookieless tracking'
        };
        return descriptions[filename] || 'Data export file';
    }

    async exportAll() {
        console.log('🚀 Starting data export process...\n');
        
        await this.ensureExportDirectory();
        
        const exports = [];
        
        try {
            // Export all datasets
            exports.push(await this.exportDailyMetrics());
            exports.push(await this.exportHourlyMetrics());
            exports.push(await this.exportAdPerformance());
            exports.push(await this.exportRawEvents());
            exports.push(await this.exportWebVitals());
            exports.push(await this.exportSessionAnalysis());
            exports.push(await this.exportCookieVsCookieless());
            
            // Generate manifest
            await this.generateExportManifest(exports);
            
            console.log(`\n✅ Export completed successfully!`);
            console.log(`📁 Files exported to: ${this.exportDir}`);
            console.log(`📊 Total files: ${exports.length}`);
            console.log(`📈 Total rows: ${exports.reduce((sum, exp) => sum + exp.rows, 0)}`);
            
        } catch (error) {
            console.error('\n❌ Export failed:', error);
            process.exit(1);
        }
    }

    async close() {
        await this.pool.end();
    }
}

// CLI execution
async function main() {
    const exporter = new DataExporter();
    
    try {
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            console.log(`
AdTech Analytics Data Exporter

Usage: node scripts/export-data.js [options]

Options:
  --help, -h          Show this help message
  --daily             Export only daily metrics
  --hourly            Export only hourly metrics
  --ads               Export only ad performance
  --raw               Export only raw events
  --vitals            Export only web vitals
  --sessions          Export only session analysis
  --comparison        Export only cookie vs cookieless comparison

Environment Variables:
  DATABASE_URL        PostgreSQL connection string (required)

Examples:
  node scripts/export-data.js                 # Export all data
  node scripts/export-data.js --daily --ads   # Export daily metrics and ad performance
            `);
            return;
        }

        // Check specific export options
        const args = process.argv.slice(2);
        let hasSpecificExport = false;

        if (args.includes('--daily')) {
            hasSpecificExport = true;
            await exporter.exportDailyMetrics();
        }
        if (args.includes('--hourly')) {
            hasSpecificExport = true;
            await exporter.exportHourlyMetrics();
        }
        if (args.includes('--ads')) {
            hasSpecificExport = true;
            await exporter.exportAdPerformance();
        }
        if (args.includes('--raw')) {
            hasSpecificExport = true;
            await exporter.exportRawEvents();
        }
        if (args.includes('--vitals')) {
            hasSpecificExport = true;
            await exporter.exportWebVitals();
        }
        if (args.includes('--sessions')) {
            hasSpecificExport = true;
            await exporter.exportSessionAnalysis();
        }
        if (args.includes('--comparison')) {
            hasSpecificExport = true;
            await exporter.exportCookieVsCookieless();
        }

        // If no specific exports requested, export all
        if (!hasSpecificExport) {
            await exporter.exportAll();
        }

    } finally {
        await exporter.close();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { DataExporter };