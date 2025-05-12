import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Package } from 'lucide-react';
import { CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { useEffect } from "react"
// Simplified Notification Component
const Notification = ({ message, type, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center ${
        type === "success" ? "bg-emerald-500" : "bg-red-500"
      } text-white max-w-md`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 mr-2" />
      ) : (
        <AlertCircle className="w-5 h-5 mr-2" />
      )}
      <p>{message}</p>
    </motion.div>
  );
};




const QuickViewModal = ({ product, addToCart, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "success"
  });

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const response = await axios.get("http://localhost:5000/api/wishlist/add", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const wishlistItems = response.data || [];
        setIsWishlisted(wishlistItems.some((item) => item.product._id === product._id));
      } catch (error) {
        console.error("Error fetching wishlist:", error.response?.data || error.message);
      }
    };

    if (product && product._id) {
      fetchWishlist();
    }
  }, [product?._id]);

  const handleImageChange = (index) => {
    setCurrentImageIndex(index);
  };

  const handleQuantityChange = (type) => {
    if (type === 'increase' && quantity < product.Stock) {
      setQuantity(quantity + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Show notification for 3 seconds
  const onNotification = (message, type = "success") => {
    setNotification({
      isVisible: true,
      message,
      type
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification({
        isVisible: false,
        message: "",
        type: "success"
      });
    }, 3000);
  };

  // Add to cart function
  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await addToCart(product);
      onNotification(`${product.Name} added to cart!`, "success");
    } catch (error) {
      onNotification("Failed to add item to cart", "error");
    }
    setIsLoading(false);
  };
  
  // Toggle wishlist function
  const handleWishlistToggle = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      onNotification("Please login to manage wishlist", "error");
      return;
    }

    setWishlistLoading(true);

    try {
      if (isWishlisted) {
        await axios.delete(`http://localhost:5000/api/wishlist/remove/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        onNotification("Removed from wishlist", "success");
        setIsWishlisted(false);
      } else {
        await axios.post(
          "http://localhost:5000/api/wishlist/add",
          { productId: product._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onNotification("Added to wishlist", "success");
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error("Error updating wishlist:", error.response?.data || error.message);
      onNotification("Failed to update wishlist", "error");
    }

    setWishlistLoading(false);
  };
 if (!isOpen) return null;

  return (
    <>
      {/* Notification Component */}
      <Notification 
        message={notification.message} 
        type={notification.type} 
        isVisible={notification.isVisible} 
      />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>

          {/* Image Gallery */}
          <div className="relative bg-gray-100 flex items-center justify-center h-96 md:h-full">
            {product.Images && product.Images.length > 0 ? (
              <motion.img
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={product.Images[currentImageIndex]}
                alt={product.Name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <p className="text-gray-400">No image available</p>
              </div>
            )}
            
            {/* Thumbnail Navigation - Only show if multiple images exist */}
            {product.Images && product.Images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {product.Images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageChange(index)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === index 
                        ? 'border-emerald-500' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="p-8 space-y-6">

            {/* Product Name */}
            <h2 className="text-3xl font-bold text-gray-800">
              {product.Name}
            </h2>

            {/* Price */}
            <div className="flex items-baseline space-x-4">
              <span className="text-3xl font-bold text-emerald-600">
                ₹{product.Price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-500 line-through">
                  ₹{product.originalPrice?.toLocaleString()}
                </span>
              )}
              {product.discount && (
                <span className="text-sm text-red-500 font-medium">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">
              {product.Description || "Experience the finest quality with this exceptional product, crafted to meet your highest expectations."}
            </p>

            {/* Stock and Quantity */}
            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Package size={16} className="mr-2" />
                <span
                  className={
                    product.Stock === 0
                      ? "text-red-500 font-medium"
                      : product.Stock < 5
                      ? "text-red-500 font-medium"
                      : "text-emerald-600 font-medium"
                  }
                >
                  {product.Stock === 0
                    ? "Out of Stock"
                    : `In Stock (${product.Stock} available)`}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 font-medium">Quantity:</span>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button 
                    onClick={() => handleQuantityChange('decrease')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    -
                  </button>
                  <span className="px-4 py-2">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange('increase')}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart}
                disabled={product.Stock === 0 || isLoading}
                className={`flex-1 flex items-center justify-center py-3 rounded-lg font-semibold transition ${
                  isLoading
                    ? 'bg-gray-400 text-white cursor-wait'
                    : product.Stock > 0
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                <ShoppingCart className="mr-2" size={20} />
                {isLoading ? 'Adding...' : product.Stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className={`bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg transition ${
                  isWishlisted 
                    ? 'border-red-400 bg-red-50 text-red-500 hover:bg-red-100' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

// Example usage component
const ExampleApp = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Sample product with multiple images
  const sampleProduct = {
    id: "1",
    Name: "Premium Cotton T-Shirt",
    Category: "Apparel",
    Price: 1299,
    originalPrice: 1999,
    discount: 35,
    Stock: 42,
    rating: 4.5,
    reviews: 127,
    description: "Ultra-soft premium cotton t-shirt with a modern fit.",
    Images: [
      "/images/tshirt-front.jpg",
      "/images/tshirt-back.jpg",
      "/images/tshirt-side.jpg",
    ]
  };

  return (
    <div className="p-4">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Open Quick View
      </button>
      
      {isModalOpen && (
        <QuickViewModal 
          product={sampleProduct} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default QuickViewModal;