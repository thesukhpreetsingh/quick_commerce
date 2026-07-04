import React from 'react';

interface Product {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  description: string;
}

interface ProductCardProps {
  product: Product;
  quantity?: number;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, quantity, onAdd, onUpdateQuantity }) => {
  return (
    <div className="product-card">
      <img src={product.thumbnail} alt={product.title} className="product-image" />
      <h3 className="product-title">{product.title}</h3>
      <p className="product-desc">{product.description}</p>
      <div className="product-footer">
        <span className="price-tag">${product.price}</span>
        {quantity ? (
          <div className="quantity-controls">
            <button 
              onClick={() => onUpdateQuantity(product.id, -1)} 
              className="qty-btn"
            >-</button>
            <span className="qty-text">{quantity}</span>
            <button 
              onClick={() => onUpdateQuantity(product.id, 1)} 
              className="qty-btn"
            >+</button>
          </div>
        ) : (
          <button 
            onClick={() => onAdd(product)}
            className="add-btn"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};
