import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
// Import jspdf-autotable correctly
import autoTable from "jspdf-autotable";

const RazorpayPayment = ({ amount, onSuccess, onFailure, customerInfo }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [receiptGenerated, setReceiptGenerated] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = async () => {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  // Create and open Razorpay order
  const createOrder = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/create-order", {
        amount: amount,
        currency: "INR"
      });

      if (response.data.success) {
        openRazorpayCheckout(response.data);
      } else {
        toast.error("Failed to create payment order");
        if (onFailure) onFailure("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Payment initialization failed");
      if (onFailure) onFailure("Payment initialization failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Open Razorpay checkout
  const openRazorpayCheckout = (orderData) => {
    if (!window.Razorpay) {
      toast.error("Razorpay SDK failed to load");
      return;
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_90ZGyZNVzzFKRH",
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Green Cart",
      description: "Payment for your order",
      order_id: orderData.order_id,
      handler: function (response) {
        handlePaymentSuccess(response);
      },
      prefill: {
        name: customerInfo?.name || "",
        email: customerInfo?.email || "",
        contact: customerInfo?.phone || ""
      },
      theme: {
        color: "#4CAF50"
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment cancelled");
          if (onFailure) onFailure("Payment cancelled by user");
        }
      }
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
  };

  // Update the handlePaymentSuccess function to properly handle the address data
const handlePaymentSuccess = async (response) => {
  try {
    const verifyData = {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    };

    // Verify payment signature
    const verifyResponse = await axios.post("http://localhost:5000/api/verify-payment", verifyData);
    
    if (verifyResponse.data.success) {
      setPaymentId(response.razorpay_payment_id);
      toast.success("Payment successful!");
      
      // Fetch payment details for receipt generation
      const paymentId = response.razorpay_payment_id;
      try {
        const detailsResponse = await axios.get(`http://localhost:5000/api/payment/${paymentId}`);
        
        if (detailsResponse.data.success) {
          const paymentDetails = detailsResponse.data;
          console.log("Payment details fetched:", paymentDetails);
          
          // Create a complete customer info object with address data
          let completeCustomerInfo = { ...customerInfo };
          
          // Only fetch address if we have a deliveryAddress ID
          if (customerInfo && customerInfo.deliveryAddress && typeof customerInfo.deliveryAddress === 'string') {
            try {
              const addressResponse = await axios.get(`http://localhost:5000/api/addresses/${customerInfo.deliveryAddress}`);
              if (addressResponse.data && addressResponse.data.success) {
                completeCustomerInfo.deliveryAddress = addressResponse.data.address;
              } else {
                console.warn("Address data structure not as expected:", addressResponse.data);
                // Fallback - keep original address ID
              }
            } catch (addressError) {
              console.error("Error fetching address:", addressError);
              // Continue with receipt generation even if address fetch fails
            }
          }
          
          // Set payment details for state
          setPaymentDetails(paymentDetails);
          
          // Auto generate and download receipt with a short delay
          setTimeout(() => {
            try {
              generateReceipt(paymentDetails, paymentId, completeCustomerInfo);
              setReceiptGenerated(true);
            } catch (receiptError) {
              console.error("Error generating receipt:", receiptError);
              toast.error("Receipt generation failed, please download manually");
            }
          }, 800);
        }
      } catch (error) {
        console.error("Error fetching payment details:", error);
        toast.error("Receipt generation failed, please verify payment manually");
      }
      
      if (onSuccess) onSuccess(response);
    } else {
      toast.error("Payment verification failed");
      if (onFailure) onFailure("Payment verification failed");
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    toast.error("Payment verification failed");
    if (onFailure) onFailure("Payment verification failed");
  }
};


  // Fetch payment details with related order and customer information
  const fetchPaymentDetails = async (id = null) => {
    const payId = id || paymentId;
      
    if (!payId) {
      toast.error("Please enter a payment ID");
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch payment details
      const response = await axios.get(`http://localhost:5000/api/payment/${payId}`);
       console.log("response", response);   
      if (response.data.success) {
        let paymentData = response.data;
        console.log("paymentData",paymentData);
        // If the payment has an orderId, fetch the order details
        if (paymentData.orderId) {
          try {
            const orderResponse = await axios.get(`http://localhost:5000/api/orders/${paymentData.orderId}`);
            console.log("orderresponse", orderResponse);
            if (orderResponse.data.success) {
              paymentData.orderDetails = orderResponse.data.order;
              console.log("orderdetail",paymentData.orderDetail);
              // If order has a user ID, fetch customer details
              if (orderResponse.data.order.user) {
                try {
                  const customerResponse = await axios.get(`http://localhost:5000/api/customers/user/${orderResponse.data.order.user}`);
                  
                  if (customerResponse.data.success) {
                    paymentData.customerDetails = customerResponse.data.customer;
                  }
                } catch (customerError) {
                  console.error("Error fetching customer:", customerError);
                }
              }
            }
          } catch (orderError) {
            console.error("Error fetching order:", orderError);
          }
        }
        
        // Store the complete payment data with related information
        setPaymentDetails(paymentData);
        setReceiptGenerated(true);
        toast.success("Payment details fetched successfully");
        
        // Auto-generate receipt if this is first successful fetch
        if (!receiptGenerated) {
          generateReceipt(paymentData, payId);
        }
      } else {
        toast.error("Failed to fetch payment details");
      }
    } catch (error) {
      console.error("Error fetching payment:", error);
      toast.error("Failed to fetch payment details");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate enhanced PDF receipt with complete customer and order details
 // Update the generateReceipt function to accept the complete customer info
const generateReceipt = (details = null, id = null, completeCustomerInfo = null) => {
  const payDetails = details || paymentDetails;
  const payId = id || paymentId;
  // Use the complete customer info if provided, otherwise fall back to the state
  const customerData = completeCustomerInfo || customerInfo;
    
  if (!payDetails) {
    toast.error("No payment details available");
    return;
  }
  
  try {
    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
        
    // Add logo and header
    doc.setFontSize(20);
    doc.setTextColor(0, 128, 0);
    doc.text("Green Cart", pageWidth / 2, 20, { align: "center" });
        
    // Add receipt title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Payment Receipt", pageWidth / 2, 30, { align: "center" });
        
    // Add date and receipt number
    doc.setFontSize(10);
    const today = new Date().toLocaleDateString();
    doc.text(`Date: ${today}`, 20, 40);
    doc.text(`Receipt id: ${payDetails.id || payId}`, 20, 45);
        
    // Get customer information from the payment data
    // First try to get from the explicitly fetched customerDetails
    const customer = payDetails.customerDetails || {};
    
    // Add customer information - with better fallbacks to ensure data appears
    doc.setFontSize(12);
    doc.text("Customer Information", 20, 55);
    doc.setFontSize(10);
    
    // For customer name, check multiple possible locations with fallbacks
    const customerName = 
      customerData?.name || 
      customer.Name || 
      (payDetails.orderDetails?.user?.name) ||
      (payDetails.metadata?.customerName) ||
      "N/A";
    doc.text(`Name: ${customerName}`, 25, 60);
    
    // For customer email, check multiple possible locations with fallbacks
    const customerEmail = 
      customerData?.email || 
      customer.Email || 
      (payDetails.orderDetails?.user?.email) ||
      (payDetails.metadata?.customerEmail) ||
      "N/A";
    doc.text(`Email: ${customerEmail}`, 25, 65);
    
    // For customer phone, check multiple possible locations with fallbacks
    const customerPhone =
      customerData?.phone || 
      customer.CustomerContact || 
      customer.Phone ||
      (payDetails.metadata?.customerPhone) ||
      "N/A";
    doc.text(`Phone: ${customerPhone}`, 25, 70);
    
    // Add shipping address if available
    let addressText = "N/A";
    
    // Check if we have the complete address object
    if (customerData?.deliveryAddress && typeof customerData.deliveryAddress === 'object') {
      const address = customerData.deliveryAddress;
      const addressParts = [];
      
      // Build address string from the fields in your Address schema
      if (address.streetOrSociety) addressParts.push(address.streetOrSociety);
      if (address.cityVillage) addressParts.push(address.cityVillage);
      if (address.pincode) addressParts.push(`Pincode: ${address.pincode}`);
      if (address.state) addressParts.push(address.state);
      if (address.country) addressParts.push(address.country);
      
      // Join the address parts with commas
      if (addressParts.length > 0) {
        addressText = addressParts.join(', ');
      }
    } else if (payDetails.orderDetails?.shippingAddress) {
      // Try order shipping address
      const shipAddress = payDetails.orderDetails.shippingAddress;
      addressText = typeof shipAddress === 'string' ? shipAddress : 
                   (typeof shipAddress === 'object' ? 
                     Object.values(shipAddress).filter(Boolean).join(', ') : 'N/A');
    } else if (payDetails.metadata?.customerAddress) {
      // Fallback to metadata if available
      addressText = payDetails.metadata.customerAddress;
    }

    // doc.text(`Delivery Address: ${addressText}`, 25, 75);
    
    // Payment Summary
    doc.setFontSize(12);
    doc.text("Payment Summary", 20, 85);
    
    // Format amount with proper decimal places
    const amount = payDetails.amount ? Number(payDetails.amount / 100).toFixed(2) : '0.00';
    
    // Get payment status with fallbacks
    const paymentStatus = payDetails.status || payDetails.Status || "N/A";
    
    // Get payment method with fallbacks
    const paymentMethod = 
      payDetails.method || 
      payDetails.paymentMethod || 
      payDetails.orderDetails?.paymentMethod || 
      "Razorpay";
    
    autoTable(doc, {
      startY: 90,
      head: [["Description", "Amount", "Status", "Payment Method"]],
      body: [
        [
          "Payment for your order",
          `₹${amount}`,
          paymentStatus,
          paymentMethod
        ]
      ],
      theme: "grid",
      headStyles: { fillColor: [76, 175, 80] }
    });
    
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 120;
    
    // Add order details if available
    if (payDetails.orderDetails) {
      const order = payDetails.orderDetails;
      
      doc.setFontSize(12);
      doc.text("Order Details", 20, finalY);
      finalY += 10;
      
      doc.setFontSize(10);
      doc.text(`Order ID: ${order._id || "N/A"}`, 25, finalY);
      finalY += 5;
      doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`, 25, finalY);
      finalY += 5;
      doc.text(`Order Status: ${order.orderStatus || "N/A"}`, 25, finalY);
      finalY += 5;
      doc.text(`Payment Status: ${order.paymentStatus || "N/A"}`, 25, finalY);
      finalY += 5;
      doc.text(`Payment Method: ${order.paymentMethod || "N/A"}`, 25, finalY);
      finalY += 10;
      
      // Add ordered items table
      if (order.orderItems && order.orderItems.length > 0) {
        const tableItems = order.orderItems.map(item => {
          const productName = item.product?.Name || "Product";
          const quantity = item.quantity || 0;
          const unitPrice = item.price ? Number(item.price).toFixed(2) : '0.00';
          const subtotal = (item.price && item.quantity) 
            ? (item.price * item.quantity).toFixed(2) 
            : '0.00';
            
          return [productName, quantity.toString(), `₹${unitPrice}`, `₹${subtotal}`];
        });
        
        autoTable(doc, {
          startY: finalY,
          head: [["Product", "Quantity", "Unit Price", "Subtotal"]],
          body: tableItems,
          foot: [["", "", "Total", `₹${Number(order.totalPrice).toFixed(2)}`]],
          theme: "grid",
          headStyles: { fillColor: [76, 175, 80] },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });
        
        finalY = doc.lastAutoTable.finalY + 10;
      }
    }
    
    // Add order status timeline if available
    if (payDetails.orderDetails?.timestamps) {
      const timestamps = payDetails.orderDetails.timestamps;
      
      doc.setFontSize(12);
      doc.text("Order Timeline", 20, finalY);
      finalY += 10;
      
      const timelineData = [];
      if (timestamps.ordered) timelineData.push(["Order Placed", new Date(timestamps.ordered).toLocaleString()]);
      if (timestamps.processing) timelineData.push(["Processing", new Date(timestamps.processing).toLocaleString()]);
      if (timestamps.packed) timelineData.push(["Packed", new Date(timestamps.packed).toLocaleString()]);
      if (timestamps.shipped) timelineData.push(["Shipped", new Date(timestamps.shipped).toLocaleString()]);
      if (timestamps.delivered) timelineData.push(["Delivered", new Date(timestamps.delivered).toLocaleString()]);
      if (timestamps.cancelled) timelineData.push(["Cancelled", new Date(timestamps.cancelled).toLocaleString()]);
      
      if (timelineData.length > 0) {
        autoTable(doc, {
          startY: finalY,
          head: [["Status", "Date & Time"]],
          body: timelineData,
          theme: "grid",
          headStyles: { fillColor: [76, 175, 80] }
        });
        
        finalY = doc.lastAutoTable.finalY + 10;
      }
    }
    
    // Add footer text
    doc.setFontSize(10);
    doc.text("Thank you for shopping with Green Cart!", pageWidth / 2, finalY, { align: "center" });
    doc.text("This is a computer-generated receipt and does not require a signature.", pageWidth / 2, finalY + 10, { align: "center" });
        
    // Save PDF
    const fileName = `receipt_${payDetails.id || payId}.pdf`;
    doc.save(fileName);
    toast.success("Receipt downloaded successfully");
  } catch (error) {
    console.error("Error generating receipt:", error);
    toast.error("Failed to generate receipt");
    throw error; // Re-throw to allow the calling function to handle it
  }
};
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-green-800 mb-4">Razorpay Payment</h2>
      
      {/* Payment Button */}
      <button 
        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out w-full mb-4"
        onClick={createOrder}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : `Pay ₹${amount}`}
      </button>

      {/* Payment Verification Section */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Verify Payment</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="Enter Payment ID"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => fetchPaymentDetails()}
            disabled={isLoading || !paymentId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
          >
            Verify
          </button>
        </div>

        {/* Payment Details Display */}
        {paymentDetails && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-700 mb-2">Payment Details:</h4>
            <ul className="space-y-1 text-sm">
              <li><span className="font-medium">Amount:</span> ₹{paymentDetails.amount}</li>
              <li><span className="font-medium">Currency:</span> {paymentDetails.currency}</li>
              <li><span className="font-medium">Status:</span> <span className={`font-medium ${paymentDetails.status === 'captured' ? 'text-green-600' : 'text-orange-500'}`}>{paymentDetails.status}</span></li>
              <li><span className="font-medium">Method:</span> {paymentDetails.method || "N/A"}</li>
              <li><span className="font-medium">Payment ID:</span> {paymentDetails.id || paymentId}</li>
            </ul>
            
            {/* Receipt Actions - Only manual download if needed again */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => generateReceipt()}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300"
              >
                Download Receipt Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RazorpayPayment;