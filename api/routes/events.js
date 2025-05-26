import express from 'express';
import { DatabaseService } from '../services/database.js';
import { EventValidator } from '../services/event-validator.js';

const router = express.Router();
const db = new DatabaseService();
const validator = new EventValidator();

// POST /api/events - Receive tracking events
router.post('/', async (req, res) => {
    try {
        const eventData = req.body;
        
        // Validate event data
        const validation = validator.validateEvent(eventData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Invalid event data',
                details: validation.errors,
                requestId: req.requestId
            });
        }

        // Add server-side metadata
        const enrichedEvent = {
            ...eventData,
            server_timestamp: Date.now(),
            client_ip: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            request_id: req.requestId
        };

        // Store in database
        const result = await db.insertEvent(enrichedEvent);
        
        res.status(201).json({
            success: true,
            eventId: result.id,
            requestId: req.requestId,
            timestamp: enrichedEvent.server_timestamp
        });

    } catch (error) {
        console.error('Error processing event:', error);
        res.status(500).json({
            error: 'Failed to process event',
            requestId: req.requestId
        });
    }
});

// GET /api/events - Retrieve events (for debugging/admin)
router.get('/', async (req, res) => {
    try {
        const {
            limit = 100,
            offset = 0,
            event_type,
            session_id,
            user_id,
            tracking_mode,
            start_date,
            end_date
        } = req.query;

        const filters = {
            event_type,
            session_id,
            user_id,
            tracking_mode,
            start_date,
            end_date
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        const events = await db.getEvents({
            limit: parseInt(limit),
            offset: parseInt(offset),
            filters
        });

        res.json({
            events: events.rows,
            total: events.total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            filters
        });

    } catch (error) {
        console.error('Error retrieving events:', error);
        res.status(500).json({
            error: 'Failed to retrieve events',
            requestId: req.requestId
        });
    }
});

// GET /api/events/summary - Get aggregated event summary
router.get('/summary', async (req, res) => {
    try {
        const {
            period = '24h',
            group_by = 'hour'
        } = req.query;

        const summary = await db.getEventSummary(period, group_by);
        
        res.json({
            summary,
            period,
            group_by,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({
            error: 'Failed to generate summary',
            requestId: req.requestId
        });
    }
});

// DELETE /api/events - Clear events (for testing)
router.delete('/', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Not allowed in production',
                requestId: req.requestId
            });
        }

        const { confirm } = req.body;
        if (confirm !== 'DELETE_ALL_EVENTS') {
            return res.status(400).json({
                error: 'Missing confirmation',
                required: 'confirm: "DELETE_ALL_EVENTS"',
                requestId: req.requestId
            });
        }

        const result = await db.clearEvents();
        
        res.json({
            success: true,
            message: 'All events cleared',
            deletedCount: result.deletedCount,
            requestId: req.requestId
        });

    } catch (error) {
        console.error('Error clearing events:', error);
        res.status(500).json({
            error: 'Failed to clear events',
            requestId: req.requestId
        });
    }
});

export { router as eventsRouter };