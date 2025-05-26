// Core Web Vitals collector
class CoreWebVitals {
    constructor() {
        this.metrics = {};
        this.thresholds = {
            CLS: { good: 0.1, poor: 0.25 },
            LCP: { good: 2500, poor: 4000 },
            FID: { good: 100, poor: 300 },
            FCP: { good: 1800, poor: 3000 },
            TTFB: { good: 800, poor: 1800 }
        };
        this.init();
    }

    init() {
        // Wait for page to be interactive before measuring
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startMeasuring());
        } else {
            this.startMeasuring();
        }
    }

    startMeasuring() {
        this.measureCLS();
        this.measureLCP();
        this.measureFID();
        this.measureFCP();
        this.measureTTFB();
    }

    getRating(metricName, value) {
        const threshold = this.thresholds[metricName];
        if (!threshold) return 'unknown';
        
        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    reportMetric(metricName, value) {
        const rating = this.getRating(metricName, value);
        this.metrics[metricName] = { value, rating };
        
        console.log(`${metricName}: ${value} (${rating})`);
        
        // Send to tracking system
        if (window.trackingConfig) {
            window.trackingConfig.sendEvent('web_vitals', {
                metric_name: metricName,
                metric_value: value,
                metric_rating: rating
            }).catch(error => {
                console.error('Failed to send web vitals metric:', error);
            });
        }
    }

    measureCLS() {
        let clsValue = 0;
        let clsEntries = [];

        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                // Only count layout shifts that occur without user input
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                    clsEntries.push(entry);
                }
            }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        // Report CLS when page visibility changes or after 5 seconds
        const reportCLS = () => {
            this.reportMetric('CLS', clsValue);
            observer.disconnect();
        };

        document.addEventListener('visibilitychange', reportCLS);
        setTimeout(reportCLS, 5000);
    }

    measureLCP() {
        const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.reportMetric('LCP', lastEntry.startTime);
            observer.disconnect();
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback: report after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (!this.metrics.LCP) {
                    // Use load event timing as fallback
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        this.reportMetric('LCP', navigation.loadEventStart);
                    }
                }
            }, 0);
        });
    }

    measureFID() {
        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                this.reportMetric('FID', entry.processingStart - entry.startTime);
                observer.disconnect();
                break; // Only report the first input delay
            }
        });

        observer.observe({ type: 'first-input', buffered: true });

        // Fallback: measure click delay manually
        let firstInputReported = false;
        const measureFirstInput = (event) => {
            if (firstInputReported) return;
            firstInputReported = true;
            
            const now = performance.now();
            const delay = now - event.timeStamp;
            this.reportMetric('FID', delay);
            
            // Remove listeners after first measurement
            ['click', 'mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(type => {
                document.removeEventListener(type, measureFirstInput, true);
            });
        };

        ['click', 'mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(type => {
            document.addEventListener(type, measureFirstInput, true);
        });
    }

    measureFCP() {
        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    this.reportMetric('FCP', entry.startTime);
                    observer.disconnect();
                    break;
                }
            }
        });

        observer.observe({ type: 'paint', buffered: true });
    }

    measureTTFB() {
        // Measure Time to First Byte using Navigation Timing
        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                this.reportMetric('TTFB', entry.responseStart - entry.requestStart);
                observer.disconnect();
                break;
            }
        });

        observer.observe({ type: 'navigation', buffered: true });

        // Fallback for older browsers
        window.addEventListener('load', () => {
            if (!this.metrics.TTFB) {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.reportMetric('TTFB', navigation.responseStart - navigation.requestStart);
                }
            }
        });
    }

    getMetrics() {
        return this.metrics;
    }
}

// Initialize Core Web Vitals measurement
const webVitals = new CoreWebVitals();

// Global error tracking
window.addEventListener('error', (event) => {
    if (window.trackingConfig) {
        window.trackingConfig.sendEvent('error', {
            error_message: event.message,
            error_stack: event.error ? event.error.stack : null,
            error_line: event.lineno,
            error_column: event.colno,
            error_filename: event.filename
        }).catch(console.error);
    }
});

// Unhandled promise rejection tracking
window.addEventListener('unhandledrejection', (event) => {
    if (window.trackingConfig) {
        window.trackingConfig.sendEvent('error', {
            error_message: event.reason ? event.reason.toString() : 'Unhandled Promise Rejection',
            error_stack: event.reason && event.reason.stack ? event.reason.stack : null
        }).catch(console.error);
    }
});

// Export for use in other modules
window.webVitals = webVitals;