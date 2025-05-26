import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Import route handlers
import { eventsRouter } from './routes/events.js';
import { healthRouter } from './routes/health.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://adtech-sandbox.vercel.app'] 
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path}`);
    
    // Add request ID for tracking
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
});

// Health check endpoint (must be before other routes)
app.use('/api/health', healthRouter);

// Main API routes
app.use('/api/events', eventsRouter);

// Serve static files in development
if (process.env.NODE_ENV !== 'production') {
    const frontendPath = join(__dirname, '../frontend');
    const adImagesPath = join(__dirname, '../ad-images');
    const productImagesPath = join(__dirname, '../product-images');
    
    // Serve frontend files
    app.use(express.static(frontendPath));
    
    // Serve ad images from ad-images directory
    app.use('/ad-images', express.static(adImagesPath));
    
    // Serve product images from product-images directory
    app.use('/product-images', express.static(productImagesPath));
    
    // Catch-all for SPA routing (must be last)
    app.get('*', (req, res) => {
        // Don't override API routes or static assets
        if (req.path.startsWith('/api/') || req.path.startsWith('/ad-images/')) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(join(frontendPath, 'index.html'));
    });
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(`Error in request ${req.requestId}:`, error);
    
    const status = error.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;
    
    res.status(status).json({
        error: message,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        requestId: req.requestId
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 AdTech Analytics API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;