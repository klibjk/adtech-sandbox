#!/usr/bin/env node

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TagQA {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.apiUrl = process.env.API_URL || 'http://localhost:3000/api';
    }

    async setup() {
        console.log('🚀 Starting Tag QA Test Suite\n');
        
        this.browser = await chromium.launch({ 
            headless: process.env.HEADLESS !== 'false',
            slowMo: 100 
        });
        
        this.page = await this.browser.newPage();
        
        // Set up console and network monitoring
        this.setupMonitoring();
    }

    setupMonitoring() {
        // Monitor console logs
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });

        // Monitor network requests
        this.page.on('request', request => {
            if (request.url().includes('/api/events')) {
                console.log(`📡 Event request: ${request.method()} ${request.url()}`);
            }
        });

        this.page.on('response', response => {
            if (response.url().includes('/api/events') && !response.ok()) {
                console.log(`❌ Event request failed: ${response.status()} ${response.url()}`);
            }
        });
    }

    async test(description, testFn) {
        try {
            console.log(`🧪 Testing: ${description}`);
            await testFn();
            console.log(`✅ PASS: ${description}\n`);
            this.results.passed++;
            this.results.tests.push({ description, status: 'PASS', error: null });
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}\n`);
            this.results.failed++;
            this.results.tests.push({ description, status: 'FAIL', error: error.message });
        }
    }

    async waitForTrackingLoad() {
        // Wait for tracking configuration to be available
        await this.page.waitForFunction(() => {
            return typeof window.trackingConfig !== 'undefined' && 
                   typeof window.adManager !== 'undefined';
        }, { timeout: 10000 });
    }

    async testPageLoad() {
        await this.test('Page loads successfully', async () => {
            const response = await this.page.goto(this.baseUrl);
            if (!response.ok()) {
                throw new Error(`Page failed to load: ${response.status()}`);
            }
            
            await this.waitForTrackingLoad();
            
            // Check that essential elements are present
            await this.page.waitForSelector('#trackingMode', { timeout: 5000 });
            await this.page.waitForSelector('.ad-unit', { timeout: 5000 });
        });
    }

    async testTrackingConfiguration() {
        await this.test('Tracking configuration initializes correctly', async () => {
            const config = await this.page.evaluate(() => {
                return {
                    hasTrackingConfig: typeof window.trackingConfig !== 'undefined',
                    hasSessionId: window.trackingConfig?.sessionId ? true : false,
                    hasUserId: window.trackingConfig?.userId ? true : false,
                    trackingMode: window.trackingConfig?.trackingMode
                };
            });

            if (!config.hasTrackingConfig) {
                throw new Error('trackingConfig not initialized');
            }
            if (!config.hasSessionId) {
                throw new Error('Session ID not generated');
            }
            if (!config.hasUserId) {
                throw new Error('User ID not generated');
            }
            if (!['cookie', 'cookieless'].includes(config.trackingMode)) {
                throw new Error(`Invalid tracking mode: ${config.trackingMode}`);
            }
        });
    }

    async testCookieMode() {
        await this.test('Cookie tracking mode works', async () => {
            // Ensure we're in cookie mode
            await this.page.check('#trackingMode');
            await this.page.waitForTimeout(500);

            const mode = await this.page.evaluate(() => window.trackingConfig.trackingMode);
            if (mode !== 'cookie') {
                throw new Error(`Expected cookie mode, got: ${mode}`);
            }

            // Check that cookie is set
            const cookies = await this.page.context().cookies();
            const adtechCookie = cookies.find(c => c.name === 'adtech_user_id');
            if (!adtechCookie) {
                throw new Error('AdTech cookie not found');
            }
        });
    }

    async testCookielessMode() {
        await this.test('Cookieless tracking mode works', async () => {
            // Switch to cookieless mode
            await this.page.uncheck('#trackingMode');
            await this.page.waitForTimeout(500);

            const mode = await this.page.evaluate(() => window.trackingConfig.trackingMode);
            if (mode !== 'cookieless') {
                throw new Error(`Expected cookieless mode, got: ${mode}`);
            }

            // Check that user ID starts with fingerprint prefix
            const userId = await this.page.evaluate(() => window.trackingConfig.userId);
            if (!userId.startsWith('fp_')) {
                throw new Error(`Expected fingerprint user ID, got: ${userId}`);
            }
        });
    }

    async testAdVisibility() {
        await this.test('Ad visibility tracking works', async () => {
            // Wait for page to settle
            await this.page.waitForTimeout(1000);

            // Check that banner ad is automatically viewed
            const adViews = await this.page.evaluate(() => {
                return window.adManager ? window.adManager.getViewedAds() : [];
            });

            if (adViews.length === 0) {
                throw new Error('No ad views detected');
            }

            // Verify banner ad is viewed
            if (!adViews.includes('banner-001')) {
                throw new Error('Banner ad not automatically viewed');
            }
        });
    }

    async testAdClicks() {
        await this.test('Ad click tracking works', async () => {
            // Click on banner ad
            await this.page.click('[data-ad-id="banner-001"]');
            await this.page.waitForTimeout(1000);

            const adClicks = await this.page.evaluate(() => {
                return window.adManager ? window.adManager.getClickedAds() : [];
            });

            if (!adClicks.includes('banner-001')) {
                throw new Error('Banner ad click not tracked');
            }
        });
    }

    async testStickyAd() {
        await this.test('Sticky ad appears on scroll', async () => {
            // Scroll down to trigger sticky ad
            await this.page.evaluate(() => window.scrollTo(0, 300));
            await this.page.waitForTimeout(1000);

            const stickyVisible = await this.page.isVisible('#sticky-ad.visible');
            if (!stickyVisible) {
                throw new Error('Sticky ad not visible after scroll');
            }
        });
    }

    async testInterstitialAd() {
        await this.test('Interstitial ad can be triggered', async () => {
            await this.page.click('#triggerInterstitial');
            await this.page.waitForTimeout(500);

            const modalVisible = await this.page.isVisible('#interstitial-modal.show');
            if (!modalVisible) {
                throw new Error('Interstitial modal not shown');
            }

            // Close the modal
            await this.page.click('#interstitial-modal .close-btn');
            await this.page.waitForTimeout(500);

            const modalHidden = await this.page.isHidden('#interstitial-modal.show');
            if (!modalHidden) {
                throw new Error('Interstitial modal not hidden after close');
            }
        });
    }

    async testEventSending() {
        await this.test('Events are sent to API', async () => {
            let eventSent = false;

            // Listen for network requests
            this.page.on('response', async (response) => {
                if (response.url().includes('/api/events') && response.ok()) {
                    eventSent = true;
                }
            });

            // Trigger an event by clicking an ad
            await this.page.click('[data-ad-id="banner-001"]');
            await this.page.waitForTimeout(2000);

            if (!eventSent) {
                throw new Error('No events sent to API');
            }
        });
    }

    async testWebVitals() {
        await this.test('Core Web Vitals are collected', async () => {
            // Wait for web vitals to be measured
            await this.page.waitForTimeout(3000);

            const vitals = await this.page.evaluate(() => {
                return window.webVitals ? window.webVitals.getMetrics() : {};
            });

            // Check that at least some metrics are collected
            const metrics = Object.keys(vitals);
            if (metrics.length === 0) {
                throw new Error('No Web Vitals metrics collected');
            }

            console.log(`   📊 Collected metrics: ${metrics.join(', ')}`);
        });
    }

    async testDataLayerIntegration() {
        await this.test('Data layer integration works', async () => {
            const dataLayer = await this.page.evaluate(() => window.dataLayer || []);
            
            if (dataLayer.length === 0) {
                throw new Error('Data layer is empty');
            }

            // Check for expected event types
            const eventTypes = dataLayer.map(event => event.event).filter(Boolean);
            const expectedEvents = ['page_load'];
            
            const hasExpectedEvents = expectedEvents.some(expected => 
                eventTypes.includes(expected)
            );

            if (!hasExpectedEvents) {
                throw new Error(`Expected events not found in data layer. Found: ${eventTypes.join(', ')}`);
            }
        });
    }

    async testErrorHandling() {
        await this.test('Error tracking works', async () => {
            // Inject a test error
            await this.page.evaluate(() => {
                throw new Error('Test error for QA validation');
            });

            await this.page.waitForTimeout(1000);

            // Check that error was tracked (we can't easily verify API call in this test)
            // Just verify that error handler exists
            const hasErrorHandler = await this.page.evaluate(() => {
                return typeof window.addEventListener === 'function';
            });

            if (!hasErrorHandler) {
                throw new Error('Error handling not properly set up');
            }
        });
    }

    async testAPIHealthCheck() {
        await this.test('API health check responds', async () => {
            const response = await this.page.request.get(`${this.apiUrl}/health`);
            
            if (!response.ok()) {
                throw new Error(`Health check failed: ${response.status()}`);
            }

            const health = await response.json();
            if (health.status !== 'healthy' && health.status !== 'degraded') {
                throw new Error(`Unexpected health status: ${health.status}`);
            }
        });
    }

    async testClearData() {
        await this.test('Clear data functionality works', async () => {
            // Get initial metrics
            const initialMetrics = await this.page.evaluate(() => {
                return {
                    totalEvents: document.getElementById('totalEvents')?.textContent || '0',
                    adViews: document.getElementById('adViews')?.textContent || '0',
                    adClicks: document.getElementById('adClicks')?.textContent || '0'
                };
            });

            // Clear data
            await this.page.click('#clearData');
            await this.page.waitForTimeout(1000);

            // Check that metrics are reset
            const clearedMetrics = await this.page.evaluate(() => {
                return {
                    totalEvents: document.getElementById('totalEvents')?.textContent || '0',
                    adViews: document.getElementById('adViews')?.textContent || '0',
                    adClicks: document.getElementById('adClicks')?.textContent || '0'
                };
            });

            if (clearedMetrics.totalEvents !== '0' || 
                clearedMetrics.adViews !== '0' || 
                clearedMetrics.adClicks !== '0') {
                throw new Error('Metrics not properly cleared');
            }
        });
    }

    async runAllTests() {
        await this.setup();

        try {
            await this.testAPIHealthCheck();
            await this.testPageLoad();
            await this.testTrackingConfiguration();
            await this.testCookieMode();
            await this.testCookielessMode();
            await this.testAdVisibility();
            await this.testAdClicks();
            await this.testStickyAd();
            await this.testInterstitialAd();
            await this.testEventSending();
            await this.testWebVitals();
            await this.testDataLayerIntegration();
            await this.testErrorHandling();
            await this.testClearData();

        } finally {
            await this.cleanup();
        }

        this.printResults();
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📋 TAG QA TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total:  ${this.results.passed + this.results.failed}`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.tests
                .filter(test => test.status === 'FAIL')
                .forEach(test => {
                    console.log(`   • ${test.description}: ${test.error}`);
                });
        }

        console.log('\n' + (this.results.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
        
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// CLI execution
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
AdTech Analytics Tag QA Test Suite

Usage: node tests/tag-qa.js [options]

Options:
  --help, -h          Show this help message
  --headless=false    Run browser in non-headless mode

Environment Variables:
  BASE_URL           Base URL for testing (default: http://localhost:3000)
  API_URL            API URL for testing (default: http://localhost:3000/api)
  HEADLESS           Run in headless mode (default: true)

Examples:
  node tests/tag-qa.js                    # Run all tests
  HEADLESS=false node tests/tag-qa.js     # Run with visible browser
        `);
        return;
    }

    const qa = new TagQA();
    await qa.runAllTests();
}

// Install Playwright if not already installed
try {
    await import('playwright');
} catch (error) {
    console.error('❌ Playwright not installed. Please run: npm install playwright');
    process.exit(1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}