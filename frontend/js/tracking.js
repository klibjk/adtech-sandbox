// Main tracking orchestrator
class TrackingOrchestrator {
    constructor() {
        this.isInitialized = false;
        this.eventQueue = [];
        this.init();
    }

    init() {
        // Wait for all dependencies to be loaded
        if (typeof window.trackingConfig === 'undefined' || 
            typeof window.adManager === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.setupEventListeners();
        this.processQueuedEvents();
        this.isInitialized = true;
        
        console.log('Tracking orchestrator initialized');
    }

    setupEventListeners() {
        // Toggle tracking mode
        const trackingToggle = document.getElementById('trackingMode');
        if (trackingToggle) {
            trackingToggle.addEventListener('change', (event) => {
                const mode = event.target.checked ? 'cookie' : 'cookieless';
                this.handleTrackingModeChange(mode);
            });
        }


        // CCPA opt-out toggle
        const ccpaToggle = document.getElementById('ccpaOptOut');
        if (ccpaToggle) {
            ccpaToggle.addEventListener('change', (event) => {
                this.handleCcpaOptOutChange(event.target.checked);
            });
        }

        // Clear data button
        const clearDataBtn = document.getElementById('clearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.handleClearData();
            });
        }

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Before page unload
        window.addEventListener('beforeunload', () => {
            this.handlePageUnload();
        });

        // Performance observer for custom metrics
        this.setupPerformanceMonitoring();
    }

    handleTrackingModeChange(mode) {
        console.log(`Switching to ${mode} tracking mode`);
        
        // Send mode change event
        const oldMode = window.trackingConfig.trackingMode;
        window.trackingConfig.setTrackingMode(mode);
        
        // Track the mode change itself
        window.trackingConfig.sendEvent('tracking_mode_change', {
            old_mode: oldMode,
            new_mode: mode,
            change_timestamp: Date.now()
        }).catch(console.error);

        // Update UI to reflect new user ID
        this.updateUserIdDisplay();
    }

    handleCcpaOptOutChange(isOptedOut) {
        console.log(`CCPA opt-out changed: ${isOptedOut}`);
        
        // Store preference in session storage
        sessionStorage.setItem('ccpa_opt_out', isOptedOut.toString());
        
        // Send CCPA preference change event
        window.trackingConfig.sendEvent('ccpa_preference_change', {
            ccpa_opt_out: isOptedOut,
            change_timestamp: Date.now(),
            user_initiated: true
        }).catch(console.error);

        // Update tracking behavior based on preference
        this.updateTrackingBehavior(isOptedOut);
    }

    updateTrackingBehavior(isOptedOut) {
        if (isOptedOut) {
            // Disable personal data collection/sharing
            console.log('CCPA opt-out active: Restricting personal data collection');
            // Here you would implement restrictions on:
            // - Third-party data sharing
            // - Personalized advertising
            // - Cross-site tracking
            // - Data aggregation for advertising purposes
        } else {
            console.log('CCPA opt-out inactive: Normal tracking enabled');
        }
    }

    handleClearData() {
        console.log('Clearing all tracking data');
        
        // Clear tracking config data
        window.trackingConfig.clearData();
        
        // Reset ad metrics
        if (window.adManager) {
            window.adManager.resetMetrics();
        }
        
        // Clear any stored analytics data
        this.clearLocalAnalytics();
        
        // Send clear data event (before clearing)
        window.trackingConfig.sendEvent('data_cleared', {
            cleared_timestamp: Date.now(),
            user_initiated: true
        }).catch(console.error);
    }

    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        if (isVisible) {
            // Page became visible - resume tracking
            this.sendEvent('page_visible', {
                visibility_timestamp: Date.now()
            });
        } else {
            // Page became hidden - pause tracking  
            this.sendEvent('page_hidden', {
                visibility_timestamp: Date.now()
            });
        }
    }

    handlePageUnload() {
        // Send any remaining events using sendBeacon for reliability
        const finalEvent = {
            event_type: 'page_unload',
            session_id: window.trackingConfig.sessionId,
            user_id: window.trackingConfig.userId,
            tracking_mode: window.trackingConfig.trackingMode,
            timestamp: Date.now(),
            page_url: window.location.href,
            session_duration: Date.now() - performance.timing.navigationStart
        };

        // Use sendBeacon for better reliability on page unload
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(finalEvent)], {
                type: 'application/json'
            });
            navigator.sendBeacon(window.trackingConfig.apiEndpoint, blob);
        }
    }

    setupPerformanceMonitoring() {
        // Monitor resource loading performance - disabled to prevent loops
        // const observer = new PerformanceObserver((list) => {
        //     for (const entry of list.getEntries()) {
        //         if (entry.entryType === 'resource' && 
        //             (entry.name.includes('ad-images/') || entry.name.includes('placeholder'))) {
        //             // Track ad resource loading time
        //             this.sendEvent('ad_resource_timing', {
        //                 resource_url: entry.name,
        //                 load_time: entry.duration,
        //                 transfer_size: entry.transferSize || 0
        //             });
        //         }
        //     }
        // });

        // observer.observe({ entryTypes: ['resource'] });
        console.log('🔄 Performance monitoring disabled to prevent tracking loops - NEW VERSION LOADED');
    }

    sendEvent(eventType, eventData) {
        if (!this.isInitialized) {
            // Queue events until initialized
            this.eventQueue.push({ eventType, eventData });
            return;
        }

        return window.trackingConfig.sendEvent(eventType, eventData);
    }

    processQueuedEvents() {
        while (this.eventQueue.length > 0) {
            const { eventType, eventData } = this.eventQueue.shift();
            this.sendEvent(eventType, eventData);
        }
    }

    updateUserIdDisplay() {
        // Add user ID to UI for debugging purposes
        const userIdDisplay = document.createElement('div');
        userIdDisplay.id = 'user-id-display';
        userIdDisplay.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            z-index: 1000;
        `;
        userIdDisplay.textContent = `User: ${window.trackingConfig.userId}`;
        
        // Remove existing display
        const existing = document.getElementById('user-id-display');
        if (existing) {
            existing.remove();
        }
        
        document.body.appendChild(userIdDisplay);
    }

    clearLocalAnalytics() {
        // Clear any local analytics storage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('adtech_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    // Public API methods
    getSessionInfo() {
        return {
            sessionId: window.trackingConfig.sessionId,
            userId: window.trackingConfig.userId,
            trackingMode: window.trackingConfig.trackingMode,
            ccpaOptOut: sessionStorage.getItem('ccpa_opt_out') === 'true',
            startTime: performance.timing.navigationStart
        };
    }

    getAnalyticsSummary() {
        return {
            session: this.getSessionInfo(),
            adMetrics: {
                viewedAds: window.adManager ? window.adManager.getViewedAds() : [],
                clickedAds: window.adManager ? window.adManager.getClickedAds() : []
            },
            webVitals: window.webVitals ? window.webVitals.getMetrics() : {},
            dataLayer: window.dataLayer || []
        };
    }
}

// Initialize tracking orchestrator
const trackingOrchestrator = new TrackingOrchestrator();
window.trackingOrchestrator = trackingOrchestrator;

// Debug helper - expose analytics summary to console
window.getAnalyticsSummary = () => {
    return trackingOrchestrator.getAnalyticsSummary();
};