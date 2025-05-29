// Product page functionality
class ProductManager {
    constructor() {
        this.cart = [];
        this.prices = {
            small: 19.99,
            medium: 24.99,
            large: 29.99
        };
        this.currentPrice = this.prices.medium;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupProduct());
        } else {
            this.setupProduct();
        }
    }

    setupProduct() {
        this.setupEventListeners();
        this.updateSessionInfo();
        this.handleAttributionSource();
        this.updatePrice();
        this.loadCart();
    }

    setupEventListeners() {
        // Size selection
        const sizeSelect = document.getElementById('size');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', () => this.handleSizeChange());
        }

        // Quantity controls
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            quantityInput.addEventListener('change', () => this.updatePrice());
        }

        // Add to cart
        const addToCartBtn = document.getElementById('addToCart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => this.addToCart());
        }

        // Buy now
        const buyNowBtn = document.getElementById('buyNow');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => this.buyNow());
        }

        // Checkout form
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckout(e));
        }

        // Checkout button in cart
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }
    }

    handleSizeChange() {
        const sizeSelect = document.getElementById('size');
        const selectedSize = sizeSelect.value;
        this.currentPrice = this.prices[selectedSize];
        this.updatePrice();

        // Track size selection
        this.sendEvent('product_option_selected', {
            option_type: 'size',
            option_value: selectedSize,
            price: this.currentPrice
        });
    }

    updatePrice() {
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const totalPrice = (this.currentPrice * quantity).toFixed(2);
        
        const totalPriceEl = document.getElementById('totalPrice');
        if (totalPriceEl) {
            totalPriceEl.textContent = totalPrice;
        }
    }

    addToCart() {
        const sizeSelect = document.getElementById('size');
        const quantityInput = document.getElementById('quantity');
        
        const item = {
            id: 'cat-cardboard-box',
            name: 'Ultimate Cat Cardboard Box',
            size: sizeSelect.value,
            quantity: parseInt(quantityInput.value),
            price: this.currentPrice,
            total: this.currentPrice * parseInt(quantityInput.value)
        };

        // Add to cart array
        const existingItemIndex = this.cart.findIndex(cartItem => 
            cartItem.id === item.id && cartItem.size === item.size
        );

        if (existingItemIndex >= 0) {
            this.cart[existingItemIndex].quantity += item.quantity;
            this.cart[existingItemIndex].total = this.cart[existingItemIndex].quantity * this.cart[existingItemIndex].price;
        } else {
            this.cart.push(item);
        }

        this.saveCart();
        this.updateCartDisplay();
        this.showCartModal();

        // Track add to cart event
        this.sendEvent('add_to_cart', {
            product_id: item.id,
            product_name: item.name,
            product_size: item.size,
            quantity: item.quantity,
            price: item.price,
            total_value: item.total,
            attribution_source: window.attributionSource || 'direct'
        });

        console.log('🛒 Item added to cart:', item);
    }

    buyNow() {
        // Buy Now should bypass cart entirely and purchase immediately
        const sizeSelect = document.getElementById('size');
        const quantityInput = document.getElementById('quantity');
        
        const item = {
            id: 'cat-cardboard-box',
            name: 'Ultimate Cat Cardboard Box',
            size: sizeSelect.value,
            quantity: parseInt(quantityInput.value),
            price: this.currentPrice,
            total: this.currentPrice * parseInt(quantityInput.value)
        };

        // Create temporary cart for this purchase only
        const tempCart = [item];
        const conversionValue = item.total;

        // Track purchase conversion directly (bypassing cart)
        this.sendEvent('purchase', {
            transaction_id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            value: conversionValue,
            currency: 'USD',
            cart_items: 1,
            products: tempCart,
            attribution_source: window.attributionSource || 'direct',
            conversion_path: this.getConversionPath(),
            purchase_type: 'buy_now' // Flag to distinguish from cart checkout
        });

        // Track buy now event separately
        this.sendEvent('buy_now', {
            product_id: item.id,
            product_name: item.name,
            product_size: item.size,
            quantity: item.quantity,
            price: item.price,
            total_value: item.total,
            attribution_source: window.attributionSource || 'direct'
        });

        // Update conversion counters
        this.updateConversionCounters();

        // Show success message immediately (no cart modal)
        this.showPurchaseSuccess(conversionValue);

        console.log('🚀 Buy Now purchase completed:', {
            value: conversionValue,
            attribution: window.attributionSource,
            path: this.getConversionPath(),
            type: 'buy_now'
        });
    }

    showCartModal() {
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            cartModal.classList.add('show');
        }
    }

    closeCart() {
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            cartModal.classList.remove('show');
        }
    }

    proceedToCheckout() {
        this.closeCart();
        this.updateCheckoutSummary();
        
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            checkoutModal.classList.add('show');
        }

        // Track checkout start
        this.sendEvent('begin_checkout', {
            cart_value: this.getCartTotal(),
            cart_items: this.cart.length,
            attribution_source: window.attributionSource || 'direct'
        });
    }

    closeCheckout() {
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            checkoutModal.classList.remove('show');
        }
    }

    handleCheckout(event) {
        event.preventDefault();
        
        // For demo purposes, don't require form validation
        const cartTotal = this.getCartTotal();
        const conversionValue = cartTotal;

        // Track purchase conversion
        this.sendEvent('purchase', {
            transaction_id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            value: conversionValue,
            currency: 'USD',
            cart_items: this.cart.length,
            products: this.cart,
            attribution_source: window.attributionSource || 'direct',
            conversion_path: this.getConversionPath()
        });

        // Update conversion counters
        this.updateConversionCounters();

        // Clear cart
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();

        // Show success message
        this.showPurchaseSuccess(conversionValue);
        this.closeCheckout();

        console.log('🎉 Purchase completed:', {
            value: conversionValue,
            attribution: window.attributionSource,
            path: this.getConversionPath()
        });
    }

    // Add quick checkout method for demo purposes
    quickCheckout() {
        if (this.cart.length === 0) {
            alert('Please add items to cart first');
            return;
        }

        const cartTotal = this.getCartTotal();
        const conversionValue = cartTotal;

        // Track purchase conversion with quick checkout flag
        this.sendEvent('purchase', {
            transaction_id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            value: conversionValue,
            currency: 'USD',
            cart_items: this.cart.length,
            products: this.cart,
            attribution_source: window.attributionSource || 'direct',
            conversion_path: this.getConversionPath(),
            checkout_type: 'quick_demo'
        });

        // Update conversion counters
        this.updateConversionCounters();

        // Clear cart
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();

        // Show success message
        this.showPurchaseSuccess(conversionValue);

        console.log('🎉 Quick purchase completed:', {
            value: conversionValue,
            attribution: window.attributionSource,
            path: this.getConversionPath()
        });
    }

    getConversionPath() {
        const source = window.attributionSource || 'direct';
        const sessionData = this.getSessionData();
        
        return {
            source: source,
            session_duration: Date.now() - sessionData.startTime,
            page_views: sessionData.pageViews || 1,
            tracking_mode: window.trackingConfig?.trackingMode || 'unknown'
        };
    }

    updateConversionCounters() {
        const source = window.attributionSource || 'direct';
        const counterMap = {
            'ad_click': 'adClickConversions',
            'direct': 'directConversions', 
            'ad_delayed': 'delayedConversions',
            'search': 'searchConversions',
            'history': 'delayedConversions' // Group with delayed
        };

        const counterId = counterMap[source] || 'directConversions';
        const counterEl = document.getElementById(counterId);
        
        if (counterEl) {
            const currentCount = parseInt(counterEl.textContent) || 0;
            counterEl.textContent = currentCount + 1;
            
            // Store in localStorage for persistence
            localStorage.setItem(counterId, currentCount + 1);
        }
    }

    showPurchaseSuccess(value) {
        // Create success popup
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        
        successDiv.innerHTML = `
            <h2 style="color: #4caf50; margin-bottom: 1rem;">🎉 Purchase Successful!</h2>
            <p style="margin-bottom: 1rem;">Thank you for your order!</p>
            <p style="font-weight: 600; color: #1a73e8;">Total: $${value.toFixed(2)}</p>
            <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">Attribution: ${window.attributionSource || 'Direct Visit'}</p>
            <button onclick="this.parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, 5000);
    }

    updateCartDisplay() {
        const cartContents = document.getElementById('cartContents');
        const cartTotal = document.getElementById('cartTotal');
        const cartItems = document.getElementById('cartItems');

        if (this.cart.length === 0) {
            if (cartContents) {
                cartContents.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            }
            if (cartTotal) cartTotal.textContent = '0.00';
            if (cartItems) cartItems.textContent = '0';
            return;
        }

        // Update cart contents
        if (cartContents) {
            cartContents.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)} | Qty: ${item.quantity}</small>
                    </div>
                    <div>$${item.total.toFixed(2)}</div>
                </div>
            `).join('');
        }

        // Update totals
        const total = this.getCartTotal();
        if (cartTotal) cartTotal.textContent = total.toFixed(2);
        if (cartItems) cartItems.textContent = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    updateCheckoutSummary() {
        const orderSummary = document.getElementById('orderSummary');
        const checkoutSubtotal = document.getElementById('checkoutSubtotal');
        const checkoutTotal = document.getElementById('checkoutTotal');
        const shippingCost = document.getElementById('shippingCost');

        const subtotal = this.getCartTotal();
        const shipping = subtotal >= 25 ? 0 : 5.99;
        const total = subtotal + shipping;

        if (orderSummary) {
            orderSummary.innerHTML = this.cart.map(item => `
                <div class="order-item" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${item.name} (${item.size}) x${item.quantity}</span>
                    <span>$${item.total.toFixed(2)}</span>
                </div>
            `).join('');
        }

        if (checkoutSubtotal) checkoutSubtotal.textContent = subtotal.toFixed(2);
        if (checkoutTotal) checkoutTotal.textContent = total.toFixed(2);
        if (shippingCost) shippingCost.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    }

    getCartTotal() {
        return this.cart.reduce((sum, item) => sum + item.total, 0);
    }

    saveCart() {
        localStorage.setItem('adtech_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const savedCart = localStorage.getItem('adtech_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.updateCartDisplay();
        }
        
        // Load conversion counters
        ['adClickConversions', 'directConversions', 'delayedConversions', 'searchConversions'].forEach(counterId => {
            const saved = localStorage.getItem(counterId);
            if (saved) {
                const counterEl = document.getElementById(counterId);
                if (counterEl) counterEl.textContent = saved;
            }
        });
    }

    updateSessionInfo() {
        if (window.trackingConfig) {
            const sessionId = document.getElementById('sessionId');
            const userId = document.getElementById('userId');
            const trackingMode = document.getElementById('trackingMode');

            if (sessionId) sessionId.textContent = window.trackingConfig.sessionId;
            if (userId) userId.textContent = window.trackingConfig.userId;
            if (trackingMode) trackingMode.textContent = window.trackingConfig.trackingMode;
        }
    }

    handleAttributionSource() {
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('utm_source') || urlParams.get('ref') || 'direct';
        
        window.attributionSource = source;
        
        // Update UI
        const attributionEl = document.getElementById('attributionSource');
        const currentSourceEl = document.getElementById('currentSource');
        
        const sourceNames = {
            'ad_click': 'Ad Click',
            'direct': 'Direct Visit', 
            'ad_delayed': 'Ad View → Return',
            'search': 'Google Search',
            'history': 'Browser History'
        };
        
        const displayName = sourceNames[source] || 'Direct Visit';
        
        if (attributionEl) attributionEl.textContent = displayName;
        if (currentSourceEl) currentSourceEl.textContent = displayName;

        // Track page view with attribution
        this.sendEvent('page_view', {
            page_title: document.title,
            page_type: 'product',
            product_id: 'cat-cardboard-box',
            attribution_source: source,
            referrer: document.referrer
        });
    }

    getSessionData() {
        return {
            startTime: performance.timing.navigationStart,
            pageViews: 1
        };
    }

    sendEvent(eventType, eventData) {
        if (window.trackingConfig) {
            return window.trackingConfig.sendEvent(eventType, eventData);
        } else {
            console.warn('Tracking config not available for event:', eventType);
            return Promise.resolve();
        }
    }
}

// Quantity control functions (global for HTML onclick)
window.increaseQuantity = function() {
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        const current = parseInt(quantityInput.value) || 1;
        const max = parseInt(quantityInput.getAttribute('max')) || 10;
        if (current < max) {
            quantityInput.value = current + 1;
            window.productManager.updatePrice();
        }
    }
};

window.decreaseQuantity = function() {
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        const current = parseInt(quantityInput.value) || 1;
        const min = parseInt(quantityInput.getAttribute('min')) || 1;
        if (current > min) {
            quantityInput.value = current - 1;
            window.productManager.updatePrice();
        }
    }
};

// Modal control functions
window.closeCart = function() {
    if (window.productManager) {
        window.productManager.closeCart();
    }
};

window.closeCheckout = function() {
    if (window.productManager) {
        window.productManager.closeCheckout();
    }
};

// Initialize product manager
const productManager = new ProductManager();
window.productManager = productManager;