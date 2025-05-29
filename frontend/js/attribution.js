// Attribution simulation and tracking
class AttributionSimulator {
    constructor() {
        this.journeyScenarios = {
            ad_click: {
                name: 'Ad Click → Purchase',
                description: 'User clicks ad and immediately purchases',
                steps: ['ad_click', 'product_view', 'purchase'],
                delay: 0
            },
            direct: {
                name: 'Direct Visit → Purchase', 
                description: 'User directly visits product page and purchases',
                steps: ['direct_visit', 'product_view', 'purchase'],
                delay: 0
            },
            ad_delayed: {
                name: 'Ad View → Close → Return → Purchase',
                description: 'User sees ad, closes browser, returns next day and purchases',
                steps: ['ad_view', 'page_close', 'return_visit', 'product_view', 'purchase'],
                delay: 24 * 60 * 60 * 1000 // 24 hours
            },
            search: {
                name: 'Ad View → Google Search → Purchase',
                description: 'User sees ad, searches Google, finds product and purchases',
                steps: ['ad_view', 'google_search', 'organic_click', 'product_view', 'purchase'],
                delay: 2 * 60 * 60 * 1000 // 2 hours
            },
            history: {
                name: 'Ad Click → Close → Browser History → Purchase',
                description: 'User clicks ad, closes browser, uses history to return and purchase',
                steps: ['ad_click', 'page_close', 'history_visit', 'product_view', 'purchase'],
                delay: 6 * 60 * 60 * 1000 // 6 hours
            }
        };
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAttribution());
        } else {
            this.setupAttribution();
        }
    }

    setupAttribution() {
        this.setupJourneyButtons();
        this.trackCurrentVisit();
        this.updateJourneyDisplay();
    }

    setupJourneyButtons() {
        // Journey simulation buttons are handled by global functions
        // Add hover effects and active states
        const journeyButtons = document.querySelectorAll('.journey-btn');
        journeyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                journeyButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
            });
        });

        // Simulate journey button in header
        const simulateBtn = document.getElementById('simulateJourney');
        if (simulateBtn) {
            simulateBtn.addEventListener('click', () => this.showJourneyMenu());
        }
    }

    showJourneyMenu() {
        // Create dropdown menu for journey selection
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 250px;
            padding: 0.5rem;
        `;

        Object.entries(this.journeyScenarios).forEach(([key, scenario]) => {
            const option = document.createElement('button');
            option.style.cssText = `
                width: 100%;
                text-align: left;
                padding: 0.75rem;
                border: none;
                background: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                margin-bottom: 0.25rem;
            `;
            option.textContent = scenario.name;
            option.onclick = () => {
                this.simulateJourney(key);
                menu.remove();
            };
            option.onmouseover = () => option.style.background = '#f8f9fa';
            option.onmouseout = () => option.style.background = 'none';
            
            menu.appendChild(option);
        });

        // Position relative to simulate button
        const simulateBtn = document.getElementById('simulateJourney');
        if (simulateBtn) {
            simulateBtn.style.position = 'relative';
            simulateBtn.appendChild(menu);

            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!menu.contains(e.target) && e.target !== simulateBtn) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                });
            }, 0);
        }
    }

    simulateJourney(journeyType) {
        const scenario = this.journeyScenarios[journeyType];
        if (!scenario) return;

        console.log(`🎭 Simulating journey: ${scenario.name}`);

        // Update attribution source
        window.attributionSource = journeyType;
        
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('utm_source', journeyType);
        window.history.replaceState({}, '', url);

        // Update UI displays
        this.updateAttributionDisplay(journeyType);
        
        // Track journey simulation start
        this.sendEvent('journey_simulation_start', {
            journey_type: journeyType,
            journey_name: scenario.name,
            expected_steps: scenario.steps.length,
            simulated_delay: scenario.delay
        });

        // Simulate the journey steps
        this.executeJourneySteps(journeyType, scenario);
    }

    async executeJourneySteps(journeyType, scenario) {
        for (let i = 0; i < scenario.steps.length; i++) {
            const step = scenario.steps[i];
            const isLastStep = i === scenario.steps.length - 1;
            
            // Add small delay for realism (except for instant scenarios)
            if (i > 0 && scenario.delay > 0) {
                await this.simulateDelay(Math.min(1000, scenario.delay / scenario.steps.length));
            }

            this.trackJourneyStep(journeyType, step, i + 1, scenario.steps.length);
            
            // Visual feedback
            this.showJourneyProgress(step, i + 1, scenario.steps.length);
        }

        console.log(`✅ Journey simulation completed: ${scenario.name}`);
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    trackJourneyStep(journeyType, step, stepNumber, totalSteps) {
        // Track the journey step metadata
        this.sendEvent('journey_step', {
            journey_type: journeyType,
            step_name: step,
            step_number: stepNumber,
            total_steps: totalSteps,
            timestamp: Date.now()
        });

        // Trigger actual business events based on the step
        this.triggerBusinessEvent(step, journeyType);
    }

    triggerBusinessEvent(step, journeyType) {
        // Get UTM and referrer data based on journey type
        const attributionData = this.getAttributionDataForJourney(journeyType, step);

        switch (step) {
            case 'ad_view':
                this.sendEvent('ad_view', {
                    ad_id: 'journey_sim_banner',
                    ad_type: 'banner',
                    ad_position: 'top',
                    ad_placement: 'homepage_banner',
                    viewport_percentage: 100,
                    page_url: attributionData.ad_page_url, // Override page_url for ad_view
                    attribution_source: journeyType,
                    referrer_url: attributionData.ad_page_url,
                    utm_source: attributionData.utm.source,
                    utm_medium: attributionData.utm.medium,
                    utm_campaign: attributionData.utm.campaign,
                    utm_content: attributionData.utm.content,
                    utm_term: attributionData.utm.term,
                    simulated: true
                });
                break;

            case 'ad_click':
                // First send ad_view then ad_click
                this.sendEvent('ad_view', {
                    ad_id: 'journey_sim_banner',
                    ad_type: 'banner',
                    ad_position: 'top',
                    ad_placement: 'homepage_banner',
                    viewport_percentage: 100,
                    page_url: attributionData.ad_page_url, // Override page_url for ad_view
                    attribution_source: journeyType,
                    referrer_url: attributionData.ad_page_url,
                    utm_source: attributionData.utm.source,
                    utm_medium: attributionData.utm.medium,
                    utm_campaign: attributionData.utm.campaign,
                    utm_content: attributionData.utm.content,
                    utm_term: attributionData.utm.term,
                    simulated: true
                });
                
                setTimeout(() => {
                    this.sendEvent('ad_click', {
                        ad_id: 'journey_sim_banner',
                        ad_type: 'banner',
                        ad_placement: 'homepage_banner',
                        click_x: 150,
                        click_y: 100,
                        click_url: attributionData.click_destination,
                        page_url: attributionData.ad_page_url, // Override page_url for ad_click
                        attribution_source: journeyType,
                        referrer_url: attributionData.ad_page_url,
                        utm_source: attributionData.utm.source,
                        utm_medium: attributionData.utm.medium,
                        utm_campaign: attributionData.utm.campaign,
                        utm_content: attributionData.utm.content,
                        utm_term: attributionData.utm.term,
                        simulated: true
                    });
                }, 200);
                break;

            case 'product_view':
                this.sendEvent('page_view', {
                    page_title: 'Ultimate Cat Cardboard Box',
                    page_type: 'product',
                    page_url: attributionData.product_page_url,
                    product_id: 'cat-cardboard-box',
                    attribution_source: journeyType,
                    referrer_url: attributionData.referrer_url,
                    referrer_type: attributionData.referrer_type,
                    utm_source: attributionData.utm.source,
                    utm_medium: attributionData.utm.medium,
                    utm_campaign: attributionData.utm.campaign,
                    utm_content: attributionData.utm.content,
                    utm_term: attributionData.utm.term,
                    simulated: true
                });
                break;

            case 'purchase':
                // Update attribution source before purchase
                window.attributionSource = journeyType;
                
                // Simulate a purchase with proper attribution
                if (window.productManager) {
                    // Use the existing buyNow method to trigger a real purchase
                    window.productManager.buyNow();
                } else {
                    // Fallback: send purchase event directly
                    this.sendEvent('purchase', {
                        transaction_id: 'sim_txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        value: 24.99,
                        currency: 'USD',
                        cart_items: 1,
                        products: [{
                            id: 'cat-cardboard-box',
                            name: 'Ultimate Cat Cardboard Box',
                            size: 'medium',
                            quantity: 1,
                            price: 24.99,
                            total: 24.99
                        }],
                        attribution_source: journeyType,
                        referrer_url: attributionData.referrer_url,
                        utm_source: attributionData.utm.source,
                        utm_medium: attributionData.utm.medium,
                        utm_campaign: attributionData.utm.campaign,
                        utm_content: attributionData.utm.content,
                        utm_term: attributionData.utm.term,
                        conversion_path: { 
                            source: journeyType,
                            referrer: attributionData.referrer_url,
                            utm_data: attributionData.utm
                        },
                        simulated: true
                    });
                }
                break;

            case 'google_search':
                this.sendEvent('external_referral', {
                    referrer_type: 'search',
                    referrer_source: 'google',
                    referrer_url: attributionData.google_search_url,
                    search_query: attributionData.search_query,
                    search_results_page: 1,
                    attribution_source: journeyType,
                    simulated: true
                });
                break;

            case 'organic_click':
                this.sendEvent('referral_click', {
                    referrer_type: 'organic',
                    referrer_source: 'google',
                    referrer_url: attributionData.google_search_url,
                    click_url: attributionData.click_destination,
                    search_query: attributionData.search_query,
                    organic_position: 2, // Simulate ranking #2 in search results
                    attribution_source: journeyType,
                    simulated: true
                });
                break;

            case 'return_visit':
            case 'history_visit':
                this.sendEvent('return_visit', {
                    visit_type: step,
                    referrer_url: attributionData.referrer_url,
                    referrer_type: step === 'history_visit' ? 'browser_history' : 'direct_return',
                    time_since_last_visit: attributionData.time_gap,
                    attribution_source: journeyType,
                    original_utm_source: attributionData.utm.source,
                    original_utm_medium: attributionData.utm.medium,
                    original_utm_campaign: attributionData.utm.campaign,
                    simulated: true
                });
                break;
        }
    }

    getAttributionDataForJourney(journeyType, step) {
        const baseUrl = window.location.protocol + '//' + window.location.host;
        const currentPort = window.location.port;
        
        // Base ad page URL (where ads are displayed) - NO UTM params for ad events
        const adPageUrl = currentPort === '5173' 
            ? 'http://localhost:3000/index.html'  // Vite dev server viewing Express content
            : `${baseUrl}/index.html`;

        // Product page URL with proper UTM parameters - FOR product page events
        const utmParams = new URLSearchParams({
            utm_source: this.getUtmSource(journeyType),
            utm_medium: this.getUtmMedium(journeyType),
            utm_campaign: this.getUtmCampaign(journeyType),
            utm_content: this.getUtmContent(journeyType)
        });
        
        // Add utm_term only if it exists
        if (this.getUtmTerm(journeyType)) {
            utmParams.set('utm_term', this.getUtmTerm(journeyType));
        }

        const productPageUrl = `${window.location.origin}/product.html?${utmParams.toString()}`;

        const data = {
            ad_page_url: adPageUrl, // Clean URL for ad events
            product_page_url: productPageUrl, // UTM-parameterized URL for product events
            click_destination: productPageUrl,
            utm: {
                source: this.getUtmSource(journeyType),
                medium: this.getUtmMedium(journeyType),
                campaign: this.getUtmCampaign(journeyType),
                content: this.getUtmContent(journeyType),
                term: this.getUtmTerm(journeyType)
            }
        };

        // Set referrer and specific data based on journey type and step
        switch (journeyType) {
            case 'ad_click':
                data.referrer_url = adPageUrl;
                data.referrer_type = 'ad_click';
                break;

            case 'ad_delayed':
                if (step === 'return_visit') {
                    data.referrer_url = null; // Direct return visit
                    data.referrer_type = 'direct';
                    data.time_gap = '24_hours';
                } else {
                    data.referrer_url = adPageUrl;
                    data.referrer_type = 'ad_view';
                }
                break;

            case 'search':
                data.google_search_url = 'https://www.google.com/search?q=cat+cardboard+box+ultimate+best&hl=en&gl=us&tbm=&source=hp&ei=xyz123&oq=cat+cardboard+box&gs_lp=search';
                data.search_query = 'cat cardboard box ultimate best';
                data.referrer_url = step === 'organic_click' ? data.google_search_url : adPageUrl;
                data.referrer_type = step === 'organic_click' ? 'organic_search' : 'ad_view';
                break;

            case 'history':
                if (step === 'history_visit') {
                    data.referrer_url = 'browser://history'; // Special browser history referrer
                    data.referrer_type = 'browser_history';
                    data.time_gap = '6_hours';
                } else {
                    data.referrer_url = adPageUrl;
                    data.referrer_type = 'ad_click';
                }
                break;

            case 'direct':
            default:
                data.referrer_url = null;
                data.referrer_type = 'direct';
                break;
        }

        return data;
    }

    getUtmSource(journeyType) {
        const sourceMap = {
            'ad_click': 'publisher_cat_demo',
            'ad_delayed': 'publisher_cat_demo',
            'search': 'google',
            'history': 'publisher_cat_demo',
            'direct': 'direct'
        };
        return sourceMap[journeyType] || 'unknown';
    }

    getUtmMedium(journeyType) {
        const mediumMap = {
            'ad_click': 'display',
            'ad_delayed': 'display',
            'search': 'organic',
            'history': 'display',
            'direct': 'direct'
        };
        return mediumMap[journeyType] || 'unknown';
    }

    getUtmCampaign(journeyType) {
        const campaignMap = {
            'ad_click': 'cat_products_q1_2025',
            'ad_delayed': 'cat_products_q1_2025',
            'search': 'organic_search',
            'history': 'cat_products_q1_2025',
            'direct': 'direct'
        };
        return campaignMap[journeyType] || 'unknown';
    }

    getUtmContent(journeyType) {
        const contentMap = {
            'ad_click': 'homepage_banner_320x50',
            'ad_delayed': 'homepage_banner_320x50',
            'search': 'organic_listing',
            'history': 'homepage_banner_320x50',
            'direct': 'direct_visit'
        };
        return contentMap[journeyType] || 'unknown';
    }

    getUtmTerm(journeyType) {
        const termMap = {
            'ad_click': 'cat_cardboard_box',
            'ad_delayed': 'cat_cardboard_box',
            'search': 'cat_cardboard_box_ultimate_best',
            'history': 'cat_cardboard_box',
            'direct': null
        };
        return termMap[journeyType] || null;
    }

    showJourneyProgress(step, stepNumber, totalSteps) {
        // Create or update progress indicator
        let progressEl = document.getElementById('journey-progress');
        
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'journey-progress';
            progressEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                text-align: center;
                min-width: 300px;
            `;
            document.body.appendChild(progressEl);
        }

        const stepNames = {
            ad_view: '👀 Viewing Ad',
            ad_click: '👆 Clicking Ad', 
            direct_visit: '🔗 Direct Visit',
            page_close: '❌ Closing Browser',
            return_visit: '🔄 Returning to Site',
            google_search: '🔍 Searching Google',
            organic_click: '🎯 Clicking Search Result',
            history_visit: '📖 Using Browser History',
            product_view: '📱 Viewing Product',
            purchase: '🎉 Making Purchase'
        };

        progressEl.innerHTML = `
            <h3 style="color: #1a73e8; margin-bottom: 1rem;">Journey Simulation</h3>
            <div style="font-size: 2rem; margin-bottom: 1rem;">${stepNames[step] || step}</div>
            <div style="color: #666;">Step ${stepNumber} of ${totalSteps}</div>
            <div style="background: #f0f0f0; height: 8px; border-radius: 4px; margin: 1rem 0; overflow: hidden;">
                <div style="background: #1a73e8; height: 100%; width: ${(stepNumber / totalSteps) * 100}%; transition: width 0.3s ease;"></div>
            </div>
        `;

        // Auto-remove after last step
        if (stepNumber === totalSteps) {
            setTimeout(() => {
                progressEl.remove();
            }, 2000);
        }
    }

    updateAttributionDisplay(journeyType) {
        const scenario = this.journeyScenarios[journeyType];
        if (!scenario) return;

        // Update header attribution
        const attributionEl = document.getElementById('attributionSource');
        if (attributionEl) {
            attributionEl.textContent = scenario.name.split(' → ')[0];
        }

        // Update current source in attribution card
        const currentSourceEl = document.getElementById('currentSource');
        if (currentSourceEl) {
            currentSourceEl.textContent = scenario.name;
        }

        // Add visual feedback to simulation button
        const activeBtn = document.querySelector(`[onclick="simulateJourney('${journeyType}')"]`);
        if (activeBtn) {
            document.querySelectorAll('.journey-btn').forEach(btn => btn.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    }

    trackCurrentVisit() {
        // Track initial page view with current attribution
        const attribution = window.attributionSource || 'direct';
        
        this.sendEvent('attribution_page_view', {
            page_type: 'product',
            attribution_source: attribution,
            is_simulation: attribution !== 'direct',
            session_start: Date.now()
        });
    }

    updateJourneyDisplay() {
        // Update any journey-related UI elements
        const currentAttribution = window.attributionSource || 'direct';
        this.updateAttributionDisplay(currentAttribution);
    }

    sendEvent(eventType, eventData) {
        if (window.trackingConfig) {
            return window.trackingConfig.sendEvent(eventType, eventData);
        } else {
            console.warn('Tracking config not available for event:', eventType);
            return Promise.resolve();
        }
    }

    // Public API for external calls
    getJourneyScenarios() {
        return this.journeyScenarios;
    }

    getCurrentAttribution() {
        return {
            source: window.attributionSource || 'direct',
            scenario: this.journeyScenarios[window.attributionSource] || null
        };
    }
}

// Global function for HTML onclick handlers
window.simulateJourney = function(journeyType) {
    if (window.attributionSimulator) {
        window.attributionSimulator.simulateJourney(journeyType);
    }
};

// Initialize attribution simulator
const attributionSimulator = new AttributionSimulator();
window.attributionSimulator = attributionSimulator;