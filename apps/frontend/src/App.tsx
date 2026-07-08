import { useState, useEffect } from 'react'
import { ulid } from 'ulid'
import './App.css'
import { ProductCard } from './components/ProductCard'

const ORDER_SERVICE_URL = import.meta.env.VITE_ORDER_SERVICE_URL || 'http://localhost:6001'
const PRODUCT_SERVICE_URL = import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:5000'
const PAYMENT_SERVICE_URL = import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:5002'
const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:7000'

const serviceDocs = [
  { label: 'Backend API', url: `${PRODUCT_SERVICE_URL}/api/docs` },
  { label: 'Order Service', url: `${ORDER_SERVICE_URL}/api/docs` },
  { label: 'Payment Service', url: `${PAYMENT_SERVICE_URL}/api/docs` },
  { label: 'Inventory Service', url: `${INVENTORY_SERVICE_URL}/api/docs` },
]

interface Product {
// ...existing code...

  id: number;
  title: string;
  price: number;
  thumbnail: string;
  description: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<'products' | 'cart' | 'checkout' | 'payment' | 'success'>('products');
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [shipping, setShipping] = useState({ customerName: '', address: '', city: '', zip: '' });
  // add phone and email
  const [contact, setContact] = useState({ phone: '', email: '' });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(60);
  const [orderServiceUp, setOrderServiceUp] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showDocsMenu, setShowDocsMenu] = useState(false);

  useEffect(() => {
    // Clear any previous order message when opening checkout
    if (view === 'checkout') {
      setOrderMessage(null);
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'payment') {
      return;
    }

    setPaymentTimeLeft(60);
    const timer = setInterval(() => {
      setPaymentTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, paymentOrderId]);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch(`${ORDER_SERVICE_URL}/health`);
        setOrderServiceUp(response.ok);
      } catch (err) {
        setOrderServiceUp(false);
      } finally {
        setHealthLoading(false);
      }
    }

    fetchHealth();
  }, []);

  useEffect(() => {
    fetch(`${PRODUCT_SERVICE_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          console.error('Unexpected API response format:', data);
          setProducts([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  const formatPrice = (price: any) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) return '₹0.00';
    
    const converted = currency === 'INR' ? numericPrice * 96 : numericPrice;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${converted.toFixed(2)}`;
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          // Prevent going above stock or below 0
          const clampedQty = Math.max(0, Math.min(newQty, item.stock));
          return { ...item, quantity: clampedQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading products...</div>;

  return (
    <div className="app-container">
      <header className="header">
        <h1>QuickCommerce</h1>
        <nav className="nav-buttons" style={{ position: 'relative' }}>
          <button onClick={() => setView('products')}>Products</button>
          <button onClick={() => setView('cart')} className="cart-btn">
            Cart ({cart.filter(item => item.quantity > 0).length})
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDocsMenu(prev => !prev)}
              title="Open API documentation"
            >
              Docs
            </button>
            {showDocsMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', zIndex: 20 }}>
                {serviceDocs.map((doc) => (
                  <button
                    key={doc.label}
                    onClick={() => {
                      window.open(doc.url, '_blank', 'noopener');
                      setShowDocsMenu(false);
                    }}
                    style={{ textAlign: 'left', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => setCurrency(prev => prev === 'INR' ? 'USD' : 'INR')}
            title={`Switch to ${currency === 'INR' ? 'USD' : 'INR'}`}
            style={{ fontWeight: 'bold', background: currency === 'INR' ? 'var(--primary-color)' : 'white' }}
          >
            {currency}
          </button>
        </nav>
      </header>

      {view === 'products' && (
        <div className="product-grid">
          {products.map(product => {
            const cartItem = cart.find(item => item.id === product.id);
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                quantity={cartItem?.quantity} 
                onAdd={addToCart} 
                onUpdateQuantity={updateQuantity} 
                formatPrice={formatPrice}
              />
            );
          })}
        </div>
      )}

      {view === 'cart' && (
        <div>
          <h2>Your Cart</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty. <button onClick={() => setView('products')}>Go shopping!</button></p>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <img src={item.thumbnail} alt={item.title} className="cart-item-img" />
                      <span>{item.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#eee', borderRadius: '4px', padding: '2px' }}>
                        <button 
                          onClick={() => updateQuantity(item.id, -1)} 
                          style={{ width: '25px', height: '25px', cursor: 'pointer', border: 'none', background: 'white', borderRadius: '2px' }}
                        >-</button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)} 
                          style={{ width: '25px', height: '25px', cursor: 'pointer', border: 'none', background: 'white', borderRadius: '2px' }}
                        >+</button>
                      </div>
                      <span style={{ marginRight: '15px', fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>{formatPrice(item.price * item.quantity)}</span>
                      <button onClick={() => removeFromCart(item.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'right', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>
                Total: {formatPrice(cartTotal)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => setView('products')} style={{ marginRight: '10px' }}>Continue Shopping</button>
                <button 
                  onClick={() => setView('checkout')} 
                  className="btn-primary"
                  disabled={!orderServiceUp || healthLoading}
                  title={!orderServiceUp ? 'Checkout unavailable while order service is unhealthy' : ''}
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'checkout' && (
        <div className="checkout-container">
          <h2>Checkout</h2>
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>Shipping Details</h3>
            {orderMessage && (
              <div style={{ marginBottom: '15px', color: 'green', fontWeight: 'bold' }}>{orderMessage}</div>
            )}
            <div className="form-group">
              <input
                type="text"
                placeholder="Full Name"
                className="form-input"
                value={shipping.customerName}
                onChange={(e) => setShipping({ ...shipping, customerName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Address"
                className="form-input"
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
              />
              <input
                type="text"
                placeholder="Phone"
                className="form-input"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="form-input"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="City"
                className="form-input"
                value={shipping.city}
                onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
              />
              <input
                type="text"
                placeholder="Zip Code"
                className="form-input"
                value={shipping.zip}
                onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
              />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total Amount: {formatPrice(cartTotal)}</p>
              {!orderMessage && (
                <button
                  onClick={async () => {
                    if (!shipping.customerName || !shipping.address) {
                      alert('Please complete shipping details.');
                      return;
                    }
                    if (!contact.phone || !contact.email) {
                      alert('Phone and email are required.');
                      return;
                    }
                    if (cart.length === 0) {
                      alert('Your cart is empty.');
                      return;
                    }

                    if (!orderServiceUp) {
                      alert('Checkout is unavailable right now. Please try again later.');
                      return;
                    }

                    setPlacingOrder(true);
                    const idempotencyKey = ulid();

                    try {
                      const response = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          customerName: shipping.customerName,
                          address: `${shipping.address}, ${shipping.city}, ${shipping.zip}`,
                          phone: contact.phone,
                          email: contact.email,
                          currency: currency,
                          items: cart.map(item => ({ productId: (item as any).external_id ?? item.id, quantity: item.quantity, price: item.price })),
                          idempotencyKey,
                        }),
                      });

                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.error || 'Unable to place order');
                      }

                      // redirect to mock payment screen where user completes payment
                      setPaymentOrderId(data.orderId);
                      setPaymentAmount(cartTotal);
                      setView('payment');
                    } catch (err) {
                      console.error('Order error:', err);
                      alert('Could not place order. Please try again.');
                    } finally {
                      setPlacingOrder(false);
                    }
                  }}
                  className="btn-success"
                  disabled={placingOrder}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
              )}
              {!orderMessage && (
                <button onClick={() => setView('cart')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>Back to Cart</button>
              )}
              {(!orderServiceUp && !healthLoading) && (
                <div style={{ marginTop: '15px', color: 'red', fontWeight: 'bold' }}>
                  Order service is currently unavailable. Checkout is disabled until Redis/inventory health is restored.
                </div>
              )}
              {orderMessage && (
                <button onClick={() => setView('products')} style={{ marginLeft: '10px' }} className="btn-primary">Continue Shopping</button>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'payment' && (
        <div style={{ padding: 20 }}>
          <h2>Mock Payment Provider</h2>
          <div style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8, maxWidth: 480 }}>
            <p>Order: <strong>{paymentOrderId}</strong></p>
            <p>Amount: <strong>{formatPrice(paymentAmount || 0)}</strong></p>
            <p style={{ marginTop: 8, fontStyle: 'italic' }}>Testing rule: payments greater than <strong>5000</strong> will be declined.</p>
            <p style={{ marginTop: 8, color: '#333', fontWeight: 600 }}>
              You have <strong>60 seconds</strong> to complete payment. After the timer expires, the order will be marked failed and inventory will be released.
            </p>
            <div style={{ marginTop: 8, marginBottom: 15, fontSize: '1.1rem', fontWeight: 'bold' }}>
              Time remaining: <span style={{ color: paymentTimeLeft <= 10 ? 'red' : '#0070f3' }}>{paymentTimeLeft}s</span>
            </div>
            {paymentAmount != null && (
              <p style={{ marginTop: 8, color: paymentAmount > 5000 ? 'red' : 'green', fontWeight: 'bold' }}>
                {paymentAmount > 5000 ? 'This payment will be DECLINED (amount &gt; 5000).' : 'This payment will SUCCEED (amount ≤ 5000).'}
              </p>
            )}
            <p>Please click "Done Payment" to simulate returning from a payment gateway.</p>
            <div style={{ marginTop: 20 }}>
              <button
                onClick={async () => {
                  if (!paymentOrderId || paymentAmount == null) return;
                  setPaymentProcessing(true);
                  try {
                    const resp = await fetch(`${PAYMENT_SERVICE_URL}/api/payments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        orderId: paymentOrderId, 
                        amount: currency === 'INR' ? paymentAmount * 96 : paymentAmount, 
                        currency: currency,
                        customerName: shipping.customerName, 
                        address: shipping.address, 
                        phone: contact.phone, 
                        email: contact.email 
                      })
                    });
                    const data = await resp.json();
                    if (!resp.ok) {
                      alert(`Payment failed: ${data.error || resp.statusText}`);
                      setView('checkout');
                      return;
                    }

                    // show a short loader then show success screen
                    await new Promise(r => setTimeout(r, 800));
                    setCart([]);
                    setPaymentProcessing(false);
                    setView('success');
                  } catch (err) {
                    console.error('Payment error', err);
                    alert('Payment request failed');
                    setView('checkout');
                  } finally {
                    setPaymentProcessing(false);
                  }
                }}
                disabled={paymentProcessing}
                className="btn-success"
              >
                {paymentProcessing ? 'Processing...' : 'Done Payment'}
              </button>
              <button onClick={() => setView('checkout')} style={{ marginLeft: 10 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {view === 'success' && (
        <div style={{ padding: 20 }}>
          <h2>Payment Successful</h2>
          <p style={{ fontWeight: 'bold' }}>Your payment was successful. Thank you for your order.</p>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => { setView('products'); setOrderMessage(null); }} className="btn-primary">Continue Shopping</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
