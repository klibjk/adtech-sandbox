import express from 'express';
import { DatabaseService } from '../services/database.js';

const router = express.Router();

// GET /api/health - System health check
router.get('/', async (req, res) => {
    const startTime = Date.now();
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requestId: req.requestId,
        services: {}
    };

    try {
        // Check database connection
        const db = new DatabaseService();
        const dbStart = Date.now();
        
        try {
            await db.healthCheck();
            healthCheck.services.database = {
                status: 'healthy',
                responseTime: Date.now() - dbStart
            };
        } catch (dbError) {
            healthCheck.status = 'degraded';
            healthCheck.services.database = {
                status: 'unhealthy',
                error: dbError.message,
                responseTime: Date.now() - dbStart
            };
        }

        // Check filesystem (for exports)
        try {
            const fs = await import('fs');
            await fs.promises.access('./exports', fs.constants.F_OK);
            healthCheck.services.filesystem = {
                status: 'healthy',
                exports_directory: 'accessible'
            };
        } catch (fsError) {
            healthCheck.services.filesystem = {
                status: 'warning',
                exports_directory: 'not_accessible',
                error: fsError.message
            };
        }

        healthCheck.responseTime = Date.now() - startTime;

        // Set appropriate status code
        const statusCode = healthCheck.status === 'healthy' ? 200 : 
                          healthCheck.status === 'degraded' ? 503 : 500;

        res.status(statusCode).json(healthCheck);

    } catch (error) {
        console.error('Health check error:', error);
        
        healthCheck.status = 'unhealthy';
        healthCheck.error = error.message;
        healthCheck.responseTime = Date.now() - startTime;
        
        res.status(500).json(healthCheck);
    }
});

// GET /api/health/ready - Readiness probe
router.get('/ready', async (req, res) => {
    try {
        // Check if all required services are ready
        const db = new DatabaseService();
        await db.healthCheck();
        
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }
});

// GET /api/health/live - Liveness probe
router.get('/live', (req, res) => {
    // Simple liveness check - if we can respond, we're alive
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requestId: req.requestId
    });
});

export { router as healthRouter };