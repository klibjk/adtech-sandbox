// Tracking configuration and utilities
class TrackingConfig {
    constructor() {
        // Use full URL when not on Express server port
        this.apiEndpoint = window.location.port === '3000' 
            ? '/api/events' 
            : 'http://localhost:3000/api/events';
        this.healthEndpoint = window.location.port === '3000' 
            ? '/api/health' 
            : 'http://localhost:3000/api/health';
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.trackingMode = 'cookie'; // 'cookie' or 'cookieless'
        this.apiHealthy = true;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 30000; // 30 seconds
        this.failureCount = 0;
        this.maxFailures = 3;
        this.init();
    }

    init() {
        this.setTrackingMode(this.getStoredTrackingMode());
        this.generateUserId();
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUserId() {
        if (this.trackingMode === 'cookie') {
            this.userId = this.getCookieUserId() || this.createCookieUserId();
        } else {
            this.userId = this.getFingerprintUserId();
        }
        return this.userId;
    }

    getCookieUserId() {
        const match = document.cookie.match(/adtech_user_id=([^;]+)/);
        return match ? match[1] : null;
    }

    createCookieUserId() {
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const expires = new Date();
        expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
        document.cookie = `adtech_user_id=${userId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
        return userId;
    }

    getFingerprintUserId() {
        // Simple browser fingerprinting (for demo purposes)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('AdTech fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const userId = 'fp_' + Math.abs(hash).toString(36);
        
        // Store in localStorage for consistency
        localStorage.setItem('adtech_fingerprint_id', userId);
        return userId;
    }

    setTrackingMode(mode) {
        this.trackingMode = mode;
        localStorage.setItem('adtech_tracking_mode', mode);
        this.generateUserId();
        
        // Update UI
        const toggle = document.getElementById('trackingMode');
        const label = document.getElementById('trackingLabel');
        const modeDisplay = document.getElementById('currentMode');
        
        if (toggle) {
            toggle.checked = mode === 'cookie';
        }
        if (label) {
            label.textContent = mode === 'cookie' ? 'Cookie Tracking' : 'Cookieless Tracking';
        }
        if (modeDisplay) {
            modeDisplay.textContent = mode === 'cookie' ? 'Cookie' : 'Cookieless';
        }
    }

    getStoredTrackingMode() {
        return localStorage.getItem('adtech_tracking_mode') || 'cookie';
    }

    clearData() {
        // Clear cookies
        document.cookie = 'adtech_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Clear localStorage
        localStorage.removeItem('adtech_fingerprint_id');
        localStorage.removeItem('adtech_tracking_mode');
        
        // Reset to default
        this.setTrackingMode('cookie');
        this.init();
        
        console.log('All tracking data cleared');
    }

    async checkApiHealth() {
        const now = Date.now();
        if (now - this.lastHealthCheck < this.healthCheckInterval) {
            return this.apiHealthy;
        }

        try {
            const response = await fetch(this.healthEndpoint, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                this.apiHealthy = true;
                this.failureCount = 0;
                this.lastHealthCheck = now;
                return true;
            } else {
                this.failureCount++;
                if (this.failureCount >= this.maxFailures) {
                    this.apiHealthy = false;
                }
                this.lastHealthCheck = now;
                return false;
            }
        } catch (error) {
            this.failureCount++;
            if (this.failureCount >= this.maxFailures) {
                this.apiHealthy = false;
            }
            this.lastHealthCheck = now;
            console.warn('API health check failed:', error);
            return false;
        }
    }

    async sendEvent(eventType, eventData) {
        const payload = {
            event_type: eventType,
            session_id: this.sessionId,
            user_id: this.userId,
            tracking_mode: this.trackingMode,
            timestamp: Date.now(),
            page_url: window.location.href,
            ccpa_opt_out: sessionStorage.getItem('ccpa_opt_out') === 'true',
            ...eventData
        };

        // Add to dataLayer for GTM-style tracking
        window.dataLayer.push({
            event: eventType,
            ...payload
        });

        // Check API health before sending if circuit breaker is open
        if (!this.apiHealthy) {
            const healthCheck = await this.checkApiHealth();
            if (!healthCheck) {
                console.warn('API is unhealthy, storing event for later retry');
                this.storeFailedEvent(eventType, eventData);
                return null;
            }
        }

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                this.failureCount++;
                if (this.failureCount >= this.maxFailures) {
                    this.apiHealthy = false;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Reset failure count on success
            this.failureCount = 0;
            this.apiHealthy = true;
            
            console.log(`Event sent: ${eventType}`, payload);
            return payload;
        } catch (error) {
            console.error('Failed to send event:', error);
            this.storeFailedEvent(eventType, eventData);
            
            // IMPORTANT: Don't send error events for failed event sends to prevent recursion
            // Only log to console instead of creating new tracking events
            return null;
        }
    }

    storeFailedEvent(eventType, eventData) {
        try {
            const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
            // Keep only last 10 failed events to prevent quota issues
            if (failedEvents.length >= 10) {
                failedEvents.splice(0, failedEvents.length - 9);
            }
            failedEvents.push({ eventType, eventData, timestamp: Date.now() });
            localStorage.setItem('failed_events', JSON.stringify(failedEvents));
        } catch (quotaError) {
            console.warn('localStorage quota exceeded, clearing failed events');
            localStorage.removeItem('failed_events');
        }
    }

    async retryFailedEvents() {
        const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
        if (failedEvents.length === 0) return;

        for (const event of failedEvents) {
            try {
                await this.sendEvent(event.eventType, event.eventData);
            } catch (error) {
                console.error('Retry failed for event:', event, error);
                return; // Stop retrying if still failing
            }
        }

        // Clear failed events after successful retry
        localStorage.removeItem('failed_events');
        console.log('Successfully retried failed events');
    }
}

// Initialize global tracking instance
window.trackingConfig = new TrackingConfig();

// Retry failed events on page load
document.addEventListener('DOMContentLoaded', () => {
    window.trackingConfig.retryFailedEvents();
});