import { useState, useEffect } from 'react'
import './App.css'
import { ProductCard } from './components/ProductCard'

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
  const [view, setView] = useState<'products' | 'cart' | 'checkout'>('products');
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
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
        <nav className="nav-buttons">
          <button onClick={() => setView('products')}>Products</button>
          <button onClick={() => setView('cart')} className="cart-btn">
            Cart ({cart.filter(item => item.quantity > 0).length})
          </button>
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
            <div className="form-group">
              <input type="text" placeholder="Full Name" className="form-input" />
              <input type="text" placeholder="Address" className="form-input" />
              <input type="text" placeholder="City" className="form-input" />
              <input type="text" placeholder="Zip Code" className="form-input" />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total Amount: {formatPrice(cartTotal)}</p>
              <button 
                onClick={() => { alert('Order placed successfully!'); setCart([]); setView('products'); }}
                className="btn-success"
              >
                Place Order
              </button>
              <button onClick={() => setView('cart')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>Back to Cart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
