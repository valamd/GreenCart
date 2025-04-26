const Order = require('../models/Order');
const mongoose = require('mongoose');
const OrderDetail = require('../models/OrderDetail');
const Address = require('../models/Address');
const ShoppingCart = require('../models/ShoppingCart');
const CartItem = require('../models/CartItem');
const Notification = require("../models/NotificationModel");
const Product = require('../models/Product');
const User = require('../models/User');
// Create an Order
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // ✅ Start a transaction for data integrity

  try {
    const user = req.user.id;
    const { orderItems, totalPrice, orderStatus,paymentStatus,paymentMethod, OrderDetail: orderDetailData } = req.body;

    // ✅ Validate required fields
    if (!orderItems || !totalPrice || !orderDetailData?.deliveryAddress) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // ✅ Validate delivery address
    const addressExists = await Address.findById(orderDetailData.deliveryAddress);
    if (!addressExists) {
      return res.status(400).json({ success: false, message: 'Invalid delivery address' });
    }

    // ✅ Check product stock and decrement stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }

      if (product.Stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.Name}. Available stock: ${product.Stock}`
        });
      }

      // ✅ Deduct stock
      product.Stock -= item.quantity;
      await product.save({ session });
    }

    // ✅ Create OrderDetail
    const orderDetail = new OrderDetail({
      deliveryAddress: orderDetailData.deliveryAddress,
      totalPrice,
      tax: orderDetailData.tax || 0,
      discount: orderDetailData.discount || 0,
      finalPrice: orderDetailData.finalPrice || totalPrice,
    });

    const savedOrderDetail = await orderDetail.save({ session });

    // ✅ Create Order
    const newOrder = new Order({
      user,
      orderItems,
      totalPrice,
      orderStatus: orderStatus || 'pending',
      orderDate: new Date(),
      OrderDetail: savedOrderDetail._id,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus || 'unpaid',
    });

    const savedOrder = await newOrder.save({ session });

    // ✅ Remove ordered items from the shopping cart
    const shoppingCart = await ShoppingCart.findOne({ user }).populate('cartItems');

    if (shoppingCart) {
      const orderedProductIds = orderItems.map(item => item.product.toString());

      // ✅ Filter out ordered items from cart
      shoppingCart.cartItems = shoppingCart.cartItems.filter(
        (cartItem) => !orderedProductIds.includes(cartItem.product.toString())
      );

      // ✅ Update cart's total price
      shoppingCart.totalPrice = shoppingCart.cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

      await shoppingCart.save({ session });

      // ✅ Delete removed cart items from CartItem collection
      await CartItem.deleteMany({ product: { $in: orderedProductIds } }, { session });
    }

    // ✅ Update OrderDetail with order reference
    savedOrderDetail.order = savedOrder._id;
    await savedOrderDetail.save({ session });

    await session.commitTransaction();
    session.endSession();
    const userdetail = await User.findById(user);
    // ✅ Create a notification for admin
    await Notification.create({
      message: `New order placed by ${userdetail.UserName}`,
      type: "new_order",
      actionBy: user._id,
    });

    res.status(201).json({ success: true, message: 'Order placed successfully', order: savedOrder });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};



// Read an Order by ID
exports.getOrder = async (req, res) =>  
{
    try {
  const { orderId } = req.params;
  const order = await Order.findById(orderId).populate("OrderDetail");

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({
    success: true,
    order,
    orderStatus: {
      currentStep: order.orderStatus, // e.g., "shipped"
      expectedDelivery: new Date(order.orderDate).setDate(new Date(order.orderDate).getDate() + 3),
      timestamps: {
        ordered: order.orderDate,
        packed: order.OrderDetail.packedDate || null,
        shipped: order.OrderDetail.shippedDate || null,
        in_transit: order.OrderDetail.inTransitDate || null,
        delivered: order.OrderDetail.deliveredDate || null,
      },
    },
  });
} catch (error) {
  console.error("Error fetching order tracking:", error);
  res.status(500).json({ success: false, message: "Internal Server Error" });
}
};

// Update an Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!status) {
      return res.status(400).json({ message: "Order status is required" });
    }

    // Find the existing order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = order.orderStatus;

    // Define allowed status transitions
    const statusFlow = ["ordered","pending", "processing", "packed", "shipped", "delivered"];

    const currentIndex = statusFlow.indexOf(currentStatus);
    const newIndex = statusFlow.indexOf(status);
console.log(currentStatus);
console.log(status);
    // ✅ Allow cancellation only if the order is still in "ordered" or "processing"
    if (status === "cancelled") {
      
      if (!["ordered", "pending" ,"processing"].includes(currentStatus)) {
        return res.status(400).json({
          message: `Order cannot be cancelled once it is ${currentStatus}.`,
        });
      }
    } 
    // ❌ Prevent jumping statuses (except for cancellation)
    else if (newIndex !== currentIndex + 1) {
      return res.status(400).json({ 
        message: `Invalid status transition: Cannot skip from ${currentStatus} to ${status}.`
      });
    }

    // ❌ Prevent changing status after delivery
    if (currentStatus === "delivered") {
      return res.status(400).json({ message: "Order is already delivered, status cannot be changed." });
    }

    // Define timestamp updates based on new status
    const timestampUpdates = {};
    if (status === "processing") timestampUpdates["timestamps.processing"] = new Date();
    if (status === "packed") timestampUpdates["timestamps.packed"] = new Date();
    if (status === "shipped") timestampUpdates["timestamps.shipped"] = new Date();
    if (status === "delivered") timestampUpdates["timestamps.delivered"] = new Date();
    if (status === "cancelled") timestampUpdates["timestamps.cancelled"] = new Date();

    // Update order status and timestamps
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: status, ...timestampUpdates }, // Merge updates
      { new: true }
    );

    // Create a notification for admin
    await Notification.create({
      message: `Order status updated by ${user.UserName}`,
      type: "update_orderstatus",
      actionBy: user.id,
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Find Order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Delete OrderDetail if exists
    await OrderDetail.deleteOne({ order: orderId });

    // Delete Order
    await Order.findByIdAndDelete(orderId);

    res.status(200).json({ message: 'Order and associated details deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrders = async (req,res) => {
  try{
    const orders = await Order.find();
    if(!orders) return res.status(404).json({ message:"Order not found"});
    res.status(200).json(orders);
  }
  catch (error) { 
    res.status(400).json({ error: error.message });
  }
};

exports.getOrderByUser = async (req,res) => {
  try{
    const userId = req.user.id;
    const orders = await Order.find({ user: userId});
    if(!orders) return res.status(404).json({ message:"Order not found"});
    res.status(200).json(orders);
  }
  catch (error) { 
    res.status(400).json({ error: error.message });
  }
};

exports.OrderTracking = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // ✅ Find order by its _id
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ orderStatus: order.orderStatus, timestamps: order.timestamps });
  } catch (error) {
    console.error("Error fetching order tracking:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
