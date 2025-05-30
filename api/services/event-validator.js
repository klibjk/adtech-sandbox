import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class EventValidator {
    constructor() {
        this.trackingPlan = null;
        this.loadTrackingPlan();
    }

    async loadTrackingPlan() {
        try {
            const configPath = join(__dirname, '../../config/tracking_plan.json');
            const configData = await readFile(configPath, 'utf8');
            this.trackingPlan = JSON.parse(configData);
            console.log('Tracking plan loaded successfully');
        } catch (error) {
            console.error('Failed to load tracking plan:', error);
            // Use minimal fallback schema
            this.trackingPlan = {
                trackingPlan: {
                    events: {}
                }
            };
        }
    }

    validateEvent(eventData) {
        const errors = [];
        
        // Basic validation
        if (!eventData) {
            return { isValid: false, errors: ['Event data is required'] };
        }

        // Required fields
        const requiredFields = [
            'event_type',
            'session_id', 
            'user_id',
            'tracking_mode',
            'timestamp',
            'page_url'
        ];

        for (const field of requiredFields) {
            if (!eventData[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate timestamp
        if (eventData.timestamp) {
            const timestamp = Number(eventData.timestamp);
            if (isNaN(timestamp) || timestamp <= 0) {
                errors.push('Invalid timestamp format');
            } else {
                // Check if timestamp is reasonable (not too far in future/past)
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000;
                if (timestamp > now + oneDayMs || timestamp < now - (30 * oneDayMs)) {
                    errors.push('Timestamp outside reasonable range');
                }
            }
        }

        // Validate tracking mode
        if (eventData.tracking_mode && 
            !['cookie', 'cookieless'].includes(eventData.tracking_mode)) {
            errors.push('Invalid tracking_mode. Must be "cookie" or "cookieless"');
        }

        // Validate URL format
        if (eventData.page_url) {
            try {
                new URL(eventData.page_url);
            } catch {
                errors.push('Invalid page_url format');
            }
        }

        // Validate against tracking plan if available
        if (this.trackingPlan && this.trackingPlan.trackingPlan.events) {
            const eventTypeErrors = this.validateEventType(eventData);
            errors.push(...eventTypeErrors);
        }

        // Validate string lengths to prevent issues
        const stringFields = {
            event_type: 100,
            session_id: 255,
            user_id: 255,
            page_url: 2048,
            user_agent: 1024,
            ad_name: 255
        };

        Object.entries(stringFields).forEach(([field, maxLength]) => {
            if (eventData[field] && eventData[field].length > maxLength) {
                errors.push(`Field ${field} exceeds maximum length of ${maxLength}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateEventType(eventData) {
        const errors = [];
        const eventType = eventData.event_type;
        
        if (!this.trackingPlan.trackingPlan.events[eventType]) {
            // Unknown event type - warn but don't reject
            console.warn(`Unknown event type: ${eventType}`);
            return errors;
        }

        const eventSchema = this.trackingPlan.trackingPlan.events[eventType];
        
        // Validate required parameters
        if (eventSchema.parameters) {
            Object.entries(eventSchema.parameters).forEach(([param, config]) => {
                if (config.required && (eventData[param] === undefined || eventData[param] === null)) {
                    errors.push(`Missing required parameter for ${eventType}: ${param}`);
                }

                // Validate enum values
                if (config.enum && eventData[param] && 
                    !config.enum.includes(eventData[param])) {
                    errors.push(`Invalid value for ${param}. Must be one of: ${config.enum.join(', ')}`);
                }

                // Validate types
                if (eventData[param] !== undefined) {
                    const typeErrors = this.validateParameterType(param, eventData[param], config.type);
                    errors.push(...typeErrors);
                }
            });
        }

        return errors;
    }

    validateParameterType(paramName, value, expectedType) {
        const errors = [];
        
        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`Parameter ${paramName} must be a string`);
                }
                break;
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push(`Parameter ${paramName} must be a number`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`Parameter ${paramName} must be a boolean`);
                }
                break;
        }

        return errors;
    }

    // Sanitize event data before storing
    sanitizeEvent(eventData) {
        const sanitized = { ...eventData };

        // Trim string values
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string') {
                sanitized[key] = sanitized[key].trim();
            }
        });

        // Ensure numeric values are actually numbers
        const numericFields = ['timestamp', 'viewport_percentage', 'click_x', 'click_y', 'metric_value', 'ad_view_timestamp', 'time_to_close_ms'];
        numericFields.forEach(field => {
            if (sanitized[field] !== undefined && sanitized[field] !== null) {
                const num = Number(sanitized[field]);
                if (!isNaN(num)) {
                    sanitized[field] = num;
                }
            }
        });

        // Remove any null or undefined values
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === null || sanitized[key] === undefined) {
                delete sanitized[key];
            }
        });

        return sanitized;
    }

    // Get validation statistics
    getValidationStats() {
        return {
            trackingPlanLoaded: !!this.trackingPlan,
            eventTypesConfigured: this.trackingPlan ? 
                Object.keys(this.trackingPlan.trackingPlan.events).length : 0,
            version: this.trackingPlan?.version || 'unknown'
        };
    }
}