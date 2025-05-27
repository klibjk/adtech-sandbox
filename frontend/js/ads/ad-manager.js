// Ad Manager - handles ad visibility, interactions, and event firing
class AdManager {
    constructor() {
        this.observers = {};
        this.viewedAds = new Set();
        this.clickedAds = new Set();
        this.viewCount = 0;
        this.clickCount = 0;
        this.adElements = [];
        this.stickyAdVisible = false;
        this.adImageIndex = 0;
        // Use full URLs when not on Express server port
        const baseUrl = window.location.port === '3000' ? '' : 'http://localhost:3000';
        this.adImages = [
            `${baseUrl}/ad-images/grumpy-cat.jpg`,
            `${baseUrl}/ad-images/jumping-cat.avif`,
            `${baseUrl}/ad-images/cat-cardboard-box.jpg`
        ];
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAds());
        } else {
            this.setupAds();
        }
    }

    setupAds() {
        this.findAdElements();
        this.initializeAdImages();
        this.setupIntersectionObserver();
        this.setupClickTracking();
        this.setupStickyAd();
        this.setupInterstitialAd();
    }

    initializeAdImages() {
        // Update banner ad with initial image
        const bannerAd = document.getElementById('banner-ad');
        if (bannerAd) {
            this.updateAdImage(bannerAd);
        }
    }

    findAdElements() {
        this.adElements = Array.from(document.querySelectorAll('.ad-unit'));
        console.log(`🔍 Found ${this.adElements.length} ad units:`);
        this.adElements.forEach((ad, index) => {
            console.log(`🔍 Ad ${index}: ID=${ad.id}, data-ad-id=${ad.dataset.adId}, data-ad-type=${ad.dataset.adType}`);
        });
    }

    setupIntersectionObserver() {
        // Observer for tracking when ads come into view
        this.observers.visibility = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const adId = entry.target.dataset.adId;
                    const adType = entry.target.dataset.adType;
                    
                    if (entry.isIntersecting && !this.viewedAds.has(adId)) {
                        this.handleAdView(entry.target, entry.intersectionRatio);
                    }
                });
            },
            {
                threshold: [0.1, 0.5, 0.9], // Track different visibility levels
                rootMargin: '0px'
            }
        );

        // Observe all ad elements
        this.adElements.forEach(ad => {
            this.observers.visibility.observe(ad);
        });
    }

    handleAdView(adElement, viewportPercentage) {
        const adId = adElement.dataset.adId;
        const adType = adElement.dataset.adType;
        
        // Mark as viewed and increment view counter
        this.viewedAds.add(adId);
        this.viewCount++;
        adElement.classList.add('viewed');
        
        // Send tracking event
        this.sendAdEvent('ad_view', {
            ad_id: adId,
            ad_type: adType,
            viewport_percentage: Math.round(viewportPercentage * 100)
        });

        // Update UI counter
        this.updateMetricsDisplay();

        console.log(`Ad viewed: ${adId} (${adType}) - ${Math.round(viewportPercentage * 100)}% visible`);
    }

    setupClickTracking() {
        console.log(`🎯 Setting up click tracking for ${this.adElements.length} ads`);
        this.adElements.forEach((ad, index) => {
            console.log(`🎯 Adding click listener to ad ${index}: ${ad.id}`);
            ad.addEventListener('click', (event) => {
                console.log(`🎯 Click event fired on ad: ${ad.id}, target: ${event.target.tagName}`);
                // Skip click tracking if user clicked the close button
                if (!event.target.classList.contains('close-btn')) {
                    console.log(`🎯 Processing click (not close button)`);
                    this.handleAdClick(ad, event);
                } else {
                    console.log(`🎯 Skipping click (close button)`);
                }
            });
        });
    }

    handleAdClick(adElement, event) {
        const adId = adElement.dataset.adId;
        const adType = adElement.dataset.adType;
        
        console.log(`🔥 Ad click handler triggered - ID: ${adId}, Type: ${adType}`);
        console.log(`🔥 Clicked ads before adding:`, Array.from(this.clickedAds));
        
        // Check if this is the cat box ad and prevent default early
        const imgElement = adElement.querySelector('img');
        if (imgElement && imgElement.src.includes('cat-cardboard-box.jpg')) {
            console.log(`🔥 Cat box ad detected, preventing default`);
            // Prevent default to handle redirect ourselves
            event.preventDefault();
        }
        
        // Mark as clicked and increment click counter
        this.clickedAds.add(adId);
        this.clickCount++;
        adElement.classList.add('clicked');
        
        console.log(`🔥 Clicked ads after adding:`, Array.from(this.clickedAds));
        console.log(`🔥 Total clicked ads count:`, this.clickedAds.size);
        console.log(`🔥 Total click counter:`, this.clickCount);
        
        // Send tracking event
        this.sendAdEvent('ad_click', {
            ad_id: adId,
            ad_type: adType,
            click_x: event.clientX,
            click_y: event.clientY
        });

        // Update UI counter
        this.updateMetricsDisplay();

        // Visual feedback
        this.showClickFeedback(adElement, event);

        console.log(`Ad clicked: ${adId} (${adType})`);

        // Handle cat box ad redirect to product page
        if (imgElement && imgElement.src.includes('cat-cardboard-box.jpg')) {
            console.log(`🔥 Opening product page for cat box ad`);
            // Add delay for visual feedback, then open in new tab
            setTimeout(() => {
                const productUrl = `product.html?utm_source=ad_click&utm_medium=${adType}&utm_campaign=cat_box&ad_id=${adId}`;
                window.open(productUrl, '_blank');
            }, 500);
        }
    }

    showClickFeedback(adElement, event) {
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(66, 133, 244, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
            z-index: 1000;
        `;
        
        const rect = adElement.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
        
        adElement.style.position = 'relative';
        adElement.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    getNextAdImage() {
        const image = this.adImages[this.adImageIndex];
        this.adImageIndex = (this.adImageIndex + 1) % this.adImages.length;
        return image;
    }

    updateAdImage(adElement) {
        const imgElement = adElement.querySelector('img');
        if (imgElement) {
            const newImage = this.getNextAdImage();
            
            // Add loading state
            imgElement.style.opacity = '0.5';
            
            // Handle successful load
            imgElement.onload = () => {
                imgElement.style.opacity = '1';
                console.log(`✅ Successfully loaded ad image: ${newImage}`);
                
                // Trigger a new view event for the image change
                this.handleAdView(adElement, 1.0); // 100% visible since it's already on screen
            };
            
            // Handle load errors
            imgElement.onerror = () => {
                console.error(`❌ Failed to load ad image: ${newImage}`);
                // Fallback to placeholder
                imgElement.src = `https://via.placeholder.com/320x200/4285f4/ffffff?text=Ad+Image+${this.adImageIndex}`;
                imgElement.style.opacity = '1';
            };
            
            // Set the new source (this triggers the load)
            imgElement.src = newImage;
            imgElement.alt = `Advertisement ${this.adImageIndex}`;
            
            console.log(`🔄 Attempting to load ad image: ${newImage}`);
        }
    }

    setupStickyAd() {
        const stickyAd = document.getElementById('sticky-ad');
        if (!stickyAd) return;

        // Create scroll progress indicator
        this.createScrollProgressIndicator();

        // Show sticky ad after user scrolls down more (increased from 200px to 800px)
        const showStickyAd = () => {
            const scrollProgress = (window.scrollY / 800) * 100;
            this.updateScrollProgress(Math.min(scrollProgress, 100));

            if (window.scrollY > 800 && !this.stickyAdVisible) {
                stickyAd.classList.add('visible');
                this.stickyAdVisible = true;
                
                // Update ad image with rotation
                this.updateAdImage(stickyAd);
                
                // Add to intersection observer
                this.observers.visibility.observe(stickyAd);

                console.log('🎯 Sticky ad triggered at scroll position:', window.scrollY);
                
                // Hide progress indicator once ad is shown
                this.hideScrollProgress();
            }
        };

        window.addEventListener('scroll', showStickyAd);
        
        // Initial check in case page is already scrolled
        showStickyAd();
    }

    createScrollProgressIndicator() {
        if (document.getElementById('scroll-progress')) return; // Already exists

        const progressContainer = document.createElement('div');
        progressContainer.id = 'scroll-progress';
        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
                <div class="progress-text">Scroll to 800px for sticky ad</div>
            </div>
        `;
        
        progressContainer.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            width: 200px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 50;
            font-size: 12px;
            transition: opacity 0.3s ease;
        `;

        const progressBar = progressContainer.querySelector('.progress-bar');
        progressBar.style.cssText = `
            position: relative;
            background: #f0f0f0;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
        `;

        const progressFill = progressContainer.querySelector('.progress-fill');
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #4285f4, #34a853);
            width: 0%;
            transition: width 0.2s ease;
        `;

        const progressText = progressContainer.querySelector('.progress-text');
        progressText.style.cssText = `
            text-align: center;
            color: #666;
            font-weight: 500;
        `;

        document.body.appendChild(progressContainer);
    }

    updateScrollProgress(percentage) {
        const progressFill = document.querySelector('#scroll-progress .progress-fill');
        const progressText = document.querySelector('#scroll-progress .progress-text');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${percentage}%`;
            
            if (percentage < 100) {
                progressText.textContent = `${Math.round(percentage)}% - Sticky ad at 100%`;
            } else {
                progressText.textContent = '🎯 Sticky ad triggered!';
                progressText.style.color = '#34a853';
                progressText.style.fontWeight = 'bold';
            }
        }
    }

    hideScrollProgress() {
        const progressContainer = document.getElementById('scroll-progress');
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.style.opacity = '0';
                setTimeout(() => {
                    progressContainer.remove();
                }, 300);
            }, 2000);
        }
    }

    setupInterstitialAd() {
        const triggerBtn = document.getElementById('triggerInterstitial');
        const modal = document.getElementById('interstitial-modal');
        
        if (!triggerBtn || !modal) return;

        triggerBtn.addEventListener('click', () => {
            this.showInterstitial();
        });

        // Add click tracking to interstitial
        modal.addEventListener('click', (event) => {
            if (!event.target.classList.contains('close-btn') && 
                !event.target.classList.contains('modal')) {
                this.handleAdClick(modal, event);
            }
        });
    }

    showInterstitial() {
        const modal = document.getElementById('interstitial-modal');
        if (!modal) return;

        modal.classList.add('show');
        
        // Update ad image with rotation
        this.updateAdImage(modal);
        
        // Add to intersection observer to track view
        this.observers.visibility.observe(modal);
        
        console.log('🎯 Interstitial ad triggered with image rotation');
        
        // Auto-hide after 5 seconds (optional)
        setTimeout(() => {
            if (modal.classList.contains('show')) {
                this.closeInterstitial();
            }
        }, 5000);
    }

    closeInterstitial() {
        const modal = document.getElementById('interstitial-modal');
        if (modal) {
            modal.classList.remove('show');
            this.observers.visibility.unobserve(modal);
        }
    }

    sendAdEvent(eventType, eventData) {
        if (window.trackingConfig) {
            return window.trackingConfig.sendEvent(eventType, eventData);
        } else {
            console.warn('Tracking config not available');
            return Promise.resolve();
        }
    }

    updateMetricsDisplay() {
        const totalEventsEl = document.getElementById('totalEvents');
        const adViewsEl = document.getElementById('adViews');
        const adClicksEl = document.getElementById('adClicks');
        
        const totalEvents = this.viewCount + this.clickCount;
        
        console.log(`📊 Updating metrics display:`);
        console.log(`📊 View count: ${this.viewCount}, Click count: ${this.clickCount}`);
        console.log(`📊 Total events: ${totalEvents}`);
        console.log(`📊 Elements found - totalEvents: ${!!totalEventsEl}, adViews: ${!!adViewsEl}, adClicks: ${!!adClicksEl}`);
        
        if (totalEventsEl) {
            totalEventsEl.textContent = totalEvents;
            console.log(`📊 Updated totalEvents to: ${totalEvents}`);
        }
        if (adViewsEl) {
            adViewsEl.textContent = this.viewCount;
            console.log(`📊 Updated adViews to: ${this.viewCount}`);
        }
        if (adClicksEl) {
            adClicksEl.textContent = this.clickCount;
            console.log(`📊 Updated adClicks to: ${this.clickCount}`);
        }
    }

    // Public methods for external control
    getViewedAds() {
        return Array.from(this.viewedAds);
    }

    getClickedAds() {
        return Array.from(this.clickedAds);
    }

    resetMetrics() {
        this.viewedAds.clear();
        this.clickedAds.clear();
        this.viewCount = 0;
        this.clickCount = 0;
        this.updateMetricsDisplay();
        
        // Remove visual indicators
        this.adElements.forEach(ad => {
            ad.classList.remove('viewed', 'clicked');
        });
    }
}

// Global functions for HTML onclick handlers
window.closeStickyAd = function() {
    const stickyAd = document.getElementById('sticky-ad');
    if (stickyAd) {
        stickyAd.classList.remove('visible');
        if (window.adManager) {
            window.adManager.stickyAdVisible = false;
        }
    }
};

window.closeInterstitial = function() {
    if (window.adManager) {
        window.adManager.closeInterstitial();
    }
};

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize ad manager
const adManager = new AdManager();
window.adManager = adManager;