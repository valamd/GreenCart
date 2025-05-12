import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { ShoppingCart, Package, CheckCircle, AlertCircle , Loader2, Heart, ArrowUpDown, Star } from "lucide-react";
import { addProductToCart } from "../api"; // Make sure this path is correct
import QuickViewModal from "../product/QuickViewModel"; // Adjust the path if needed
import { useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import ScrollToTop from "../components/ui/ScrollToTop";

const Notification = ({ message, type, show }) => {
  if (!show) return null;
  
  
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


const ProductCard = ({ product, addToCart }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "" });

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

    fetchWishlist();
  }, [product._id]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "" });
    }, 3000);
  };

  const handleWishlistToggle = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to manage wishlist", "error");
      return;
    }
  
    setWishlistLoading(true);
  
    try {
      if (isWishlisted) {
        await axios.delete(`http://localhost:5000/api/wishlist/remove/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification("Removed from wishlist", "success");
        setIsWishlisted(false);
      } else {
        await axios.post(
          "http://localhost:5000/api/wishlist/add",
          { productId: product._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification("Added to wishlist", "success");
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error("Error updating wishlist:", error.response?.data || error.message);
      showNotification("Failed to update wishlist", "error");
    }
  
    setWishlistLoading(false);
  };
  

  const handleAddToCart = async () => {
    // Check if product is out of stock
    if (product.Stock <= 0) {
      showNotification("Sorry, this item is out of stock", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      await addToCart(product);
      showNotification(`${product.Name} added to cart!`, "success");
    } catch (error) {
      showNotification("Failed to add item to cart", "error");
    }
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative p-4 border border-gray-100"
    >

<Notification 
  message={notification.message} 
  type={notification.type} 
  show={notification.show} 
/>
       <BackButton/>
       <ScrollToTop/>
      {/* Wishlist Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleWishlistToggle}
        disabled={wishlistLoading}
        className={`absolute top-4 right-4 p-2 rounded-full z-10 bg-white shadow-md transition ${
          isWishlisted ? "text-red-500" : "text-gray-400"
        }`}
      >
        {wishlistLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Heart className="w-6 h-6" fill={isWishlisted ? "red" : "none"} stroke={isWishlisted ? "red" : "gray"} />
        )}
      </motion.button>

      {/* Image Container */}
      <div className="relative overflow-hidden rounded-xl aspect-square mb-4">
        <motion.img
          src={product.Images?.length > 0 ? product.Images[0] : "/default-Image.jpg"}
          alt={product.Name}
          className="object-cover w-full h-full"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
          onError={(e) => (e.target.src = "/default-Image.jpg")}
        />
        
        {/* Quick view overlay on hover */}
        <motion.div 
          className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsQuickViewOpen(true)}
            className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium shadow-md"
          >
            Quick View
          </motion.button>
        </motion.div>
        {/* QuickView Modal */}
        {isQuickViewOpen && (
          <QuickViewModal 
            product={product}
            isOpen={isQuickViewOpen}
            onClose={() => setIsQuickViewOpen(false)}
            addToCart={addToCart}
            showNotification={showNotification}
          />
        )}
      </div>

      {/* Product Info */}
      
      <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 h-14">
        {product.Name}
      </h3>

      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-emerald-600">
          ₹{product.Price?.toLocaleString()}
        </span>
      </div>
         {/* Improved stock display */}
         <div className="flex items-center text-sm text-gray-600">
          <Package size={16} className="mr-1" />
          <span
            className={
              product.Stock === 0
                ? "text-red-500 font-medium"
                : product.Stock < 5
                ? "text-red-500 font-medium"
                : product.Stock < 50
                ? "text-blue-500 font-medium"
                : product.Stock < 100
                ? "text-green-500 font-medium"
                : "text-emerald-600 font-medium"
            }
          >
            {product.Stock === 0
              ? "Out of Stock"
              : `In Stock (${product.Stock} available)`}
          </span>
        </div>
      {/* Add to Cart Button */}
      <motion.button
        whileHover={{ scale: product.Stock > 0 ? 1.02 : 1 }}
        whileTap={{ scale: product.Stock > 0 ? 0.98 : 1 }}
        onClick={handleAddToCart}
        disabled={isLoading || product.Stock <= 0}
        className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-semibold shadow-md hover:shadow-lg ${
          product.Stock <= 0 
            ? "bg-gray-300 text-gray-600" 
            : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
        }`}
      >
        {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <ShoppingCart className="mr-2" size={20} />}
        {isLoading ? "Adding..." : product.Stock <= 0 ? "Out of Stock" : "Add to Cart"}
      </motion.button>
    </motion.div>
  );
};

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("featured");
  const [notification, setNotification] = useState({ show: false, message: "" });
  
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:5000/api/products/category/${encodeURIComponent(category)}`
        );
        console.log("Fetched Products:", response.data);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "" });
    }, 3000);
  };

  const addToCart = async (product) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("User is not authenticated.");
        return;
      }
      const cart = {
        productId: product._id,
        quantity: 1,
      };

      const response = await addProductToCart(cart, token);
      const data = response.data;
      showNotification("Item added to cart successfully!");
      console.log("Item added successfully:", data);
    } catch (error) {
      showNotification("Failed to add item to cart", "error");
      console.error("Error adding to cart:", error.message);
    }
  };

  const handleSort = (option) => {
    setSortOption(option);
    let sortedProducts = [...products];
    
    switch(option) {
      case "priceAsc":
        sortedProducts.sort((a, b) => a.Price - b.Price);
        break;
      case "priceDesc":
        sortedProducts.sort((a, b) => b.Price - a.Price);
        break;
      case "newest":
        // Assuming there's a createdAt field, otherwise this won't work properly
        sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Featured - no sorting needed
        break;
    }
    
    setProducts(sortedProducts);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 p-6 rounded-lg text-center max-w-4xl mx-auto"
        >
          <p className="text-red-600">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
    {/* Notification Component */}
    <Notification 
  message={notification.message} 
  type={notification.type} 
  show={notification.show} 
/>
      {/* Category Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center container mx-auto px-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            {category.charAt(0).toUpperCase() + category.slice(1)} Collection
          </h2>
          <div className="h-1 w-20 bg-emerald-500 mx-auto mb-4 rounded-full"></div>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Explore our curated selection of premium {category} items designed for quality and performance
          </p>
        </motion.div>
      </div>

      {/* Sort Section */}
      <div className="container mx-auto px-4 py-6 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          {!loading && (
            <p className="text-sm text-red-500 mb-4 md:mb-0">
  {products.length} products found
</p>
          )}
          
          <div className="relative">
            <select 
              value={sortOption}
              onChange={(e) => handleSort(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-4 pr-10 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="featured">Featured</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
            </select>
            <ArrowUpDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Products Display */}
      <div className="container mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={40} />
              <p className="text-gray-500">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-600 py-16 bg-gray-50 rounded-xl">
            <Package size={40} className="mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-medium">No products found for {category}.</p>
            <p className="mt-2 max-w-md mx-auto">We're constantly updating our inventory. Please check back later or explore other categories.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-10"

          >
            {products.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} addToCart={addToCart} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      
      {/* Recommendation Section
      {!loading && products.length > 0 && (
        <div className="bg-gray-50 py-10">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">You May Also Like</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.slice(0, 5).map((product, index) => (
                <motion.div
                  key={`recommended-${product._id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard product={product} addToCart={addToCart} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default CategoryPage;