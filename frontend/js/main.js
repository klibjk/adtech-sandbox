// Main application entry point
document.addEventListener('DOMContentLoaded', function() {
    console.log('AdTech Analytics Sandbox initialized');
    
    // Send page load event
    if (window.trackingConfig) {
        window.trackingConfig.sendEvent('page_load', {
            page_title: document.title,
            page_url: window.location.href,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            screen_width: screen.width,
            screen_height: screen.height,
            color_depth: screen.colorDepth,
            pixel_ratio: window.devicePixelRatio || 1,
            timezone_offset: new Date().getTimezoneOffset(),
            language: navigator.language
        }).catch(console.error);
    }

    // Update user ID display
    if (window.trackingOrchestrator) {
        window.trackingOrchestrator.updateUserIdDisplay();
    }

    // Development helpers
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addDevelopmentHelpers();
    }
});

function addDevelopmentHelpers() {
    // Add debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        font-size: 12px;
        font-family: monospace;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    const debugTitle = document.createElement('h4');
    debugTitle.textContent = 'Debug Panel';
    debugTitle.style.margin = '0 0 10px 0';
    debugPanel.appendChild(debugTitle);

    // Add debug buttons
    const buttons = [
        {
            text: 'Show Analytics Summary',
            action: () => {
                console.log('Analytics Summary:', window.getAnalyticsSummary());
                alert('Analytics summary logged to console');
            }
        },
        {
            text: 'Trigger Test Error',
            action: () => {
                throw new Error('Test error for debugging');
            }
        },
        {
            text: 'Show DataLayer',
            action: () => {
                console.log('DataLayer:', window.dataLayer);
                alert('DataLayer logged to console');
            }
        },
        {
            text: 'Force Web Vitals',
            action: () => {
                if (window.webVitals) {
                    console.log('Web Vitals:', window.webVitals.getMetrics());
                    alert('Web Vitals logged to console');
                }
            }
        },
        {
            text: 'Test Ad Images',
            action: () => {
                console.log('Testing ad image accessibility...');
                const testImages = ['ad-images/grumpy-cat.jpg', 'ad-images/jumping-cat.avif'];
                
                testImages.forEach((imagePath, index) => {
                    const testImg = new Image();
                    testImg.onload = () => console.log(`✅ Image ${index + 1} accessible: ${imagePath}`);
                    testImg.onerror = () => console.error(`❌ Image ${index + 1} failed: ${imagePath}`);
                    testImg.src = imagePath;
                });
                
                alert('Image accessibility test running - check console');
            }
        }
    ];

    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.style.cssText = `
            display: block;
            width: 100%;
            margin: 2px 0;
            padding: 4px 8px;
            font-size: 11px;
            border: 1px solid #ddd;
            background: #f8f9fa;
            cursor: pointer;
        `;
        btn.addEventListener('click', button.action);
        debugPanel.appendChild(btn);
    });

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '🐛';
    toggleBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 320px;
        width: 30px;
        height: 30px;
        border: 1px solid #ccc;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        z-index: 1001;
        font-size: 16px;
    `;
    
    let debugVisible = true;
    toggleBtn.addEventListener('click', () => {
        debugVisible = !debugVisible;
        debugPanel.style.display = debugVisible ? 'block' : 'none';
        toggleBtn.textContent = debugVisible ? '🐛' : '👁️';
    });

    document.body.appendChild(debugPanel);
    document.body.appendChild(toggleBtn);

    // Console helpers
    console.log('%cAdTech Sandbox Debug Mode Enabled', 'color: #4285f4; font-weight: bold;');
    console.log('Available debug commands:');
    console.log('- getAnalyticsSummary(): Get current analytics state');
    console.log('- window.trackingConfig: Access tracking configuration');
    console.log('- window.adManager: Access ad management functions');
    console.log('- window.webVitals: Access web vitals measurements');
    console.log('- window.dataLayer: View GTM-style data layer');
}

// Global error boundary
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Video Content Interest Tracking
function handleVideoClick(videoElement) {
    const videoId = videoElement.dataset.videoId;
    
    // Add visual click effect
    videoElement.classList.add('clicked');
    setTimeout(() => {
        videoElement.classList.remove('clicked');
    }, 300);
    
    // Track user interest in video content
    if (window.trackingConfig) {
        window.trackingConfig.sendEvent('video_play_attempt', {
            video_id: videoId,
            video_title: videoElement.parentElement.querySelector('h3')?.textContent || 'Unknown',
            content_type: 'educational',
            user_action: 'play_button_click',
            timestamp: Date.now()
        }).catch(console.error);
    }
    
    // Show cat box ad when user shows interest in cat content
    if (window.adManager) {
        window.adManager.showCatBoxInterestAd();
    }
    
    console.log(`Video play attempt tracked: ${videoId} - Showing cat box ad due to interest`);
}

// Make function globally available for HTML onclick
window.handleVideoClick = handleVideoClick;