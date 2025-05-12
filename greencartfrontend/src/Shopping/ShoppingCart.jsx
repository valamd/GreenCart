import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart as CartIcon, Trash2, Plus, Minus, Loader2, MapPin, CreditCard, Package, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import { fetchCartItems, updateCartItemQuantity, removeCartItem, confirmOrder, fetchUserAddresses, createNewAddress } from "../api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/Card";
import AddressModal from "../components/AddressModal";
import { Label } from "../components/ui/Label";
import { RadioGroup, RadioGroupItem } from "../components/ui/RadioButton";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import RazorpayPayment from "../order/RazorpayPayment"; // Import the new component

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [totalCartPrice, setTotalCartPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [activeStep, setActiveStep] = useState(1); // 1: Cart, 2: Address & Payment, 3: Confirm
  const [newAddressData, setNewAddressData] = useState({
    cityVillage: "",
    pincode: "",
    state: "",
    country: "",
    streetOrSociety: "",
  });
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    fetchSavedAddresses();
  
    // fetchUserInfo();
  }, []);
  useEffect(() => {  
    fetchUserInfo();
  }, [customerInfo]);
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("http://localhost:5000/api/users/getuserdetails", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const userData = await response.json();
        let name = "";
        let email = "";
        let phone = "";
        name = userData.userTypeData?.CustomerName || "";
        email = userData.userTypeData?.CustomerEmail || "";
        phone = userData.userTypeData?.CustomerContact || "";
        setCustomerInfo({ name, email, phone });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetchCartItems(token);
      setCartItems(response.data.cartItems || []);

      const total = (response.data.cartItems || []).reduce((sum, item) => {
        return sum + (item?.product?.Price || 0) * (item?.quantity || 0);
      }, 0);
      setTotalCartPrice(total);
    } catch (error) {
      console.error("Error fetching cart items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Fetching saved addresses...");
      const response = await fetchUserAddresses(token);
      
      console.log("API Response:", response.data);
      setSavedAddresses(response.data.addresses || []);
      
      // Auto-select the first address if available
      if (response.data.addresses && response.data.addresses.length > 0 && !selectedAddressId) {
        setSelectedAddressId(response.data.addresses[0]._id);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error.response?.data || error.message);
      toast.error("Failed to load saved addresses");
    }
  };
  
  const handleCreateNewAddress = async () => {
    try {
      if (!Object.values(newAddressData).every(field => field.trim() !== "")) {
        toast.error("Please fill in all address fields.");
        return;
      }
      console.log("Creating new address:", newAddressData);
      const token = localStorage.getItem("authToken");
      const response = await createNewAddress(token, newAddressData);

      if (response.status === 201) {
        toast.success("Address created successfully!");
        setSelectedAddressId(response.data.address._id);
        setIsAddressModalOpen(false);
        fetchSavedAddresses();
      }
    } catch (error) {
      console.error("Error creating address:", error);
      toast.error("Failed to create address.");
    }
  };
  
  const updateQuantity = async (id, change) => {
    try {
      const token = localStorage.getItem("authToken");
      const updatedItem = cartItems.find((item) => item._id === id);
      const newQuantity = Math.max(1, updatedItem.quantity + change);

      const response = await updateCartItemQuantity(id, newQuantity, token);

      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item._id === id ? { ...item, quantity: newQuantity } : item
        )
      );

      setTotalCartPrice(response.data.shoppingCart.totalPrice);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Could not update item quantity.");
    }
  };

  const removeFromCart = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await removeCartItem(id, token);

      setCartItems((prevItems) => prevItems.filter((item) => item._id !== id));
      setTotalCartPrice(response.data.shoppingCart.totalPrice);

      toast.success("Item removed from cart.");
    } catch (error) {
      console.error("Error removing cart item:", error);
      toast.error("Failed to remove item.");
    }
  };

  // Handle Razorpay payment success
  const handlePaymentSuccess = async (paymentResponse) => {
    try {
      await processOrderWithPayment(paymentResponse);
    } catch (error) {
      console.error("Error processing order after payment:", error);
      toast.error("Payment was successful but order processing failed");
    }
  };

  // Handle Razorpay payment failure
  const handlePaymentFailure = (error) => {
    console.error("Payment failed:", error);
    toast.error("Payment failed: " + error);
    setIsSubmitting(false);
  };

  // Process order after successful payment
  const processOrderWithPayment = async (paymentResponse) => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("authToken");
  
      if (!token) {
        toast.error("User is not authenticated. Please log in.");
        return;
      }
  
      let deliveryAddressId = selectedAddressId;
      
      if (!deliveryAddressId && newAddressData) {
        const newAddress = await createNewAddress(token, newAddressData);
        if (!newAddress?.data?.address?._id) {
          throw new Error("Failed to create new address.");
        }
        deliveryAddressId = newAddress.data.address._id;
      }
  
      if (!deliveryAddressId) {
        toast.error("Please select or create a delivery address.");
        return;
      }
  
      const orderData = {
        orderItems: cartItems.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.Price,
        })),
        paymentMethod: "Online Payment", // Set to online payment
        paymentDetails: {
          id: paymentResponse.razorpay_payment_id,
          status: "completed", 
          update_time: new Date().toISOString(),
          order_id: paymentResponse.razorpay_order_id,
          signature: paymentResponse.razorpay_signature
        },
        totalPrice: totalCartPrice,
        orderStatus: "pending",
        paymentStatus: "paid", // Set status to paid
        OrderDetail: {
          deliveryAddress: deliveryAddressId,
          totalPrice: totalCartPrice,
          tax: 0,
          discount: 0,
          finalPrice: totalCartPrice,
        },
      };
  
      const response = await confirmOrder(token, orderData);
  
      if (response?.success) {
        toast.success("Order placed successfully!");
        setIsOrderConfirmed(true);
        setCartItems([]);
        setTotalCartPrice(0);
      } else {
        throw new Error(response?.message || "Failed to create order.");
      }
    } catch (error) {
      console.error("Error creating order:", error.message);
      toast.error(error.message || "Failed to confirm order.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Original confirm order function for COD
  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("authToken");
  
      if (!token) {
        toast.error("User is not authenticated. Please log in.");
        return;
      }

      // If payment method is online, show Razorpay
      if (paymentMethod === "UPI") {
        setShowRazorpay(true);
        setIsSubmitting(false);
        return;
      }
  
      let deliveryAddressId = selectedAddressId;
      
      if (!deliveryAddressId && newAddressData) {
        const newAddress = await createNewAddress(token, newAddressData);
        if (!newAddress?.data?.address?._id) {
          throw new Error("Failed to create new address.");
        }
        deliveryAddressId = newAddress.data.address._id;
      }
  
      if (!deliveryAddressId) {
        toast.error("Please select or create a delivery address.");
        return;
      }
  
      const orderData = {
        orderItems: cartItems.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.Price,
        })),
        paymentMethod: paymentMethod,
        totalPrice: totalCartPrice,
        orderStatus: "pending",
        OrderDetail: {
          deliveryAddress: deliveryAddressId,
          totalPrice: totalCartPrice,
          tax: 0,
          discount: 0,
          finalPrice: totalCartPrice,
        },
      };
  
      const response = await confirmOrder(token, orderData);
  
      if (response?.success) {
        toast.success("Order placed successfully!");
        setIsOrderConfirmed(true);
        setCartItems([]);
        setTotalCartPrice(0);
      } else {
        throw new Error(response?.message || "Failed to create order.");
      }
    } catch (error) {
      console.error("Error creating order:", error.message);
      toast.error(error.message || "Failed to confirm order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stepper component
  const Stepper = () => (
    <div className="w-full py-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center w-full max-w-3xl">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center">
            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${activeStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-300'} z-10`}>
              <CartIcon size={20} />
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">Cart</div>
          </div>
          
          {/* Connector */}
          <div className={`flex-1 h-1 ${activeStep >= 2 ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
          
          {/* Step 2 */}
          <div className="relative flex flex-col items-center">
            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${activeStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-300'} z-10`}>
              <MapPin size={20} />
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">Delivery</div>
          </div>
          
          {/* Connector */}
          <div className={`flex-1 h-1 ${activeStep >= 3 ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
          
          {/* Step 3 */}
          <div className="relative flex flex-col items-center">
            <div className={`w-10 h-10 flex items-center justify-center rounded-full ${activeStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-300'} z-10`}>
              <CheckCircle size={20} />
            </div>
            <div className="mt-2 text-sm font-medium text-gray-700">Confirm</div>
          </div>
        </div>
      </div>
    </div>
  );

  // If order is confirmed
  if (isOrderConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-emerald-50 to-teal-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-10 text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Order Confirmed!</h1>
            <p className="text-gray-600 mb-8">Thank you for your purchase. Your order has been successfully placed.</p>
            <button 
              onClick={() => window.location.href = '/products'} 
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Continue Shopping
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Display loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-emerald-50 to-teal-50 flex justify-center items-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Loader2 className="animate-spin text-emerald-600" size={50} />
          <p className="mt-4 text-emerald-800 font-medium">Loading your cart...</p>
        </motion.div>
      </div>
    );
  }

  // If cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-emerald-50 to-teal-50 py-12">
        <BackButton/>
        <div className="max-w-3xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-10 text-center"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CartIcon size={40} className="text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Looks like you haven't added any products to your cart yet.</p>
            <button 
              onClick={() => window.location.href = '/products'} 
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Browse Products
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-emerald-50 to-teal-50 py-12">
     <BackButton/>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto px-4"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <CartIcon size={32} className="text-emerald-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
              Your Shopping Cart
            </h1>
          </div>
          <p className="text-gray-600 mt-2 max-w-xl mx-auto">Complete your purchase and get your items delivered right to your doorstep.</p>
        </div>

        <Stepper />

        {/* Razorpay Payment Component - Only shown when UPI is selected and payment is initiated */}
        {showRazorpay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete Your Payment</h2>
              <RazorpayPayment 
                amount={totalCartPrice}
                onSuccess={handlePaymentSuccess}
                onFailure={handlePaymentFailure}
                customerInfo={customerInfo}
              />
              <button 
                onClick={() => setShowRazorpay(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Left Column (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {activeStep === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {cartItems.map((item, index) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                        <div className="flex flex-col md:flex-row">
                          <div className="w-full md:w-1/4 p-4 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <img 
                              src={item.product.Images?.[0] || "/placeholder-image.jpg"} 
                              alt={item.product.Name} 
                              className="w-24 h-24 object-cover rounded-lg shadow-sm"
                            />
                          </div>
                          <div className="w-full md:w-3/4 p-4">
                            <CardHeader className="p-0 pb-2">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <CardTitle className="text-xl font-bold text-gray-800">{item.product.Name}</CardTitle>
                                <div className="flex items-center space-x-2 mt-2 md:mt-0">
                                  <button 
                                    onClick={() => updateQuantity(item._id, -1)} 
                                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-10 text-center font-semibold text-gray-700">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateQuantity(item._id, 1)} 
                                    className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-full transition-colors"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0 py-2">
                              <div className="flex flex-col md:flex-row justify-between">
                                <div>
                                  <div className="text-sm text-gray-600">Price: <span className="font-medium text-gray-800">₹{item.product.Price.toLocaleString()}</span></div>
                                  <div className="text-sm text-gray-600">Subtotal: <span className="font-medium text-gray-800">₹{(item.product.Price * item.quantity).toLocaleString()}</span></div>
                                </div>
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => removeFromCart(item._id)} 
                                  className="mt-3 md:mt-0 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <Trash2 size={16} /> Remove
                                </motion.button>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Address Section */}
                  <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin /> Delivery Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <RadioGroup 
                          value={selectedAddressId} 
                          onValueChange={setSelectedAddressId}
                          className="space-y-4"
                        >
                          {savedAddresses.map((address) => (
                            <div key={address._id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                              <RadioGroupItem value={address._id} id={address._id} className="mr-3" />
                              <Label htmlFor={address._id} className="flex-1 cursor-pointer">
                                <div className="font-medium">{address.streetOrSociety}</div>
                                <div className="text-sm text-gray-600">{address.cityVillage}, {address.state} {address.pincode}</div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsAddressModalOpen(true)}
                          className="w-full mt-4 px-4 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={18} /> Add New Address
                        </motion.button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Method Section */}
                  <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard /> Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <RadioGroup 
                        value={paymentMethod} 
                        onValueChange={setPaymentMethod}
                        className="space-y-4" 
                      >
                        <div className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                          <RadioGroupItem value="Cash on Delivery" id="cash" className="mr-3" />
                          <Label htmlFor="cash" className="flex-1 cursor-pointer">
                            <div className="font-medium">Cash on Delivery</div>
                            <div className="text-sm text-gray-600">Pay when your order arrives</div>
                          </Label>
                        </div>

                        <div className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                          <RadioGroupItem value="UPI" id="upi" className="mr-3" />
                          <Label htmlFor="upi" className="flex-1 cursor-pointer">
                            <div className="font-medium">Online Payment</div>
                            <div className="text-sm text-gray-600">Pay using Razorpay (Credit/Debit Card, UPI, NetBanking)</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeStep === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Order Summary */}
                  <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Package /> Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                          <span className="text-gray-600">Items ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})</span>
                          <span className="font-medium">₹{totalCartPrice.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                          <span className="text-gray-600">Delivery Address</span>
                          <span className="font-medium text-right">
                            {savedAddresses.find(addr => addr._id === selectedAddressId)?.streetOrSociety}, 
                            {savedAddresses.find(addr => addr._id === selectedAddressId)?.cityVillage}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                          <span className="text-gray-600">Payment Method</span>
                          <span className="font-medium">{paymentMethod}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-lg font-bold">Total</span>
                          <span className="text-xl font-bold text-emerald-600">₹{totalCartPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary - Right Column (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md sticky top-24">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                    <span className="text-gray-600">Items ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})</span>
                    <span>₹{totalCartPrice.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                    <span className="text-gray-600">Delivery</span>
                    <span className="text-emerald-600">Free</span>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-lg">₹{totalCartPrice.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 pb-6 pt-0">
                {activeStep === 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveStep(2)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Delivery <ArrowRight size={18} />
                  </motion.button>
                )}
                
                {activeStep === 2 && (
                  <div className="w-full space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveStep(3)}
                      disabled={!selectedAddressId}
                      className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Review Order <ArrowRight size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveStep(1)}
                      className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Cart
                    </motion.button>
                  </div>
                )}
                
                {activeStep === 3 && (
                  <div className="w-full space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirmOrder}
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> Processing...
                        </>
                      ) : (
                        <>
                          Place Order <CheckCircle size={18} />
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveStep(2)}
                      className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Delivery
                    </motion.button>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Address Modal */}
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
        newAddressData={newAddressData} 
        setNewAddressData={setNewAddressData} 
        handleCreateNewAddress={handleCreateNewAddress}
        onChange={(e) => setNewAddressData({ ...newAddressData, streetOrSociety: e.target.value })}
      />
    </div>
  );
};

export default ShoppingCart;