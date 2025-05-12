const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const ShoppingCart = require('../models/ShoppingCart');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const OrderDetail = require('../models/OrderDetail');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Address = require('../models/Address');
const Notification = require("../models/NotificationModel");
const cloudinary = require("cloudinary").v2;

exports.oauth = async (req, res) => {
  const provider = req.params.provider;
  res.json({ message: `Logging in with ${provider}` });
};

exports.registerUser = async (req, res) => {
  try {
    const { UserName, UserEmail, Password, UserType } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10); // 10 is the salt rounds
    const existsuser  = await User.findOne({UserEmail: UserEmail}) ;
    
    if(existsuser){
      return res.status(400).json({ message: "Email already exists" });
    }
    
    // Create a new user with the hashed password
    const newUser = new User({
      UserName,
      UserEmail,
      Password: hashedPassword,
      UserType,
    });
    
    await newUser.save();
    if (UserType === 'Customer') {
      await Customer.create({
        CustomerName: UserName,
        CustomerEmail: UserEmail,
        user: newUser._id,
      });
    }
    else{
      await Admin.create({
        adminName: UserName,
        adminEmail: UserEmail,
        adminAddress: UserAddress,
        user: newUser._id,
      });
    }
    
    // Create a new notification for the admin
    await Notification.create({
      message: `New user registered: ${newUser.UserName} as a ${newUser.UserType}`,
      type: "new_user",
      actionBy: newUser._id,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.logoutUser = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed!" });
      }
      res.clearCookie("connect.sid"); // Clear session cookie
      return res.json({ message: "Logged out successfully!" });
    });
  } else {
    return res.status(400).json({ message: "No active session found." });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { UserEmail, Password } = req.body;

    // Find the user
    const user = await User.findOne({ UserEmail: UserEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(Password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    if(user.UserType === 'Admin'){
      const admin = await Admin.findOne({ user: user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      res.status(200).json({
      message: 'Login successful',
      token,
      role: admin.role, // Include role for client-side logic
    });
    }
    else{
    res.status(200).json({
      message: 'Login successful',
      token,
      role: user.UserType, // Include role for client-side logic
    });
  }
    req.session.userId = user._id; 
    req.session.userRole = user.role; 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a User
exports.createUser = async (req, res) => {
  try {
    const { UserName, UserEmail, Password, UserType } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10); // 10 is the salt rounds
    
    const existsuser  = await User.findOne({UserEmail: UserEmail}) ;
    if(existsuser){
      return res.status(400).json({ message: "Email already exists" });
    }
    // Create a new user with the hashed password
    const user = new User({
      UserName,
      UserEmail,
      Password: hashedPassword,
      UserType,
    });
    
    await user.save();
    if (user.UserType === 'Customer') {
      await Customer.create({
        CustomerName: user.UserName,
        CustomerEmail: user.UserEmail,
        CustomerAddress: user.UserAddress,
        user: user._id,
      });
    }
    else{
      await Admin.create({
        adminName: user.UserName,
        adminEmail: user.UserEmail,
        adminAddress: user.UserAddress,
        user: user._id,
      });
    }
    
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Read a User by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Updated controller function for user profile
exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from token
    let updates = req.body;

    // Hash password only if it's being updated
    if (updates.Password) {
      updates.Password = await bcrypt.hash(updates.Password, 10);
    }
    
    let customerImageUrl = null;
    
    // Handle Cloudinary upload for Image
    if (req.body.Image) {
      const uploadedResponse = await cloudinary.uploader.upload(req.body.Image, {
        folder: "customer_images",
      });
      customerImageUrl = uploadedResponse.secure_url;
    }
    
    // Update User Model
    const updatedUser = await User.findByIdAndUpdate(userId, {
      UserName: updates.UserName,
      UserEmail: updates.UserEmail,
      // ...(updates.Password && { Password: updates.Password }), // Update only if provided
    }, { new: true }).select("-Password");
    console.log("Updated User:", updatedUser);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Handle address for customer
    let addressId = null;
    if (updates.CustomerAddress) {
      // Create or update address
      const addressData = {
        streetOrSociety: updates.CustomerAddress.streetOrSociety,
        cityVillage: updates.CustomerAddress.cityVillage,
        pincode: updates.CustomerAddress.pincode,
        state: updates.CustomerAddress.state,
        country: updates.CustomerAddress.country,
        ownerModel: 'Customer'
      };
      
      // Find if customer already has an address
      const customer = await Customer.findOne({ user: userId }).populate('CustomerAddress');
      
      if (customer && customer.CustomerAddress && customer.CustomerAddress.length > 0) {
        // Update existing address
        addressId = customer.CustomerAddress[0]._id;
        await Address.findByIdAndUpdate(addressId, addressData);
      } else {
        // Create new address
        const newAddress = new Address(addressData);
        const savedAddress = await newAddress.save();
        addressId = savedAddress._id;
      }
    }
    
    // Prepare customer update data
    const customerUpdateData = {
      CustomerName: updates.UserName,
      CustomerEmail: updates.UserEmail,
      ...(updates.CustomerContact && { CustomerContact: updates.CustomerContact }),
      ...(customerImageUrl && { Image: customerImageUrl }),
    };
    
    // Add address reference if we have one
    if (addressId) {
      customerUpdateData.CustomerAddress = [addressId];
    }
    
    // Update Customer Model
    const updatedCustomer = await Customer.findOneAndUpdate(
      { user: userId }, // Find customer linked to this user
      customerUpdateData,
      { new: true }
    );
    
    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer record not found" });
    }
    
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
};
// Delete a User
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete Admin and Customer records
    const adminDeleted = await Admin.deleteMany({ user: userId });
    const customerDeleted = await Customer.deleteMany({ user: userId });

    // Delete ShoppingCart and CartItems
    const carts = await ShoppingCart.find({ user: userId });
    const cartIds = carts.map(cart => cart._id);
    await CartItem.deleteMany({ _id: { $in: cartIds } });
    await ShoppingCart.deleteMany({ user: userId });

    // Delete Orders and OrderDetails
    const orders = await Order.find({ user: userId });
    const orderIds = orders.map(order => order._id);
    await OrderDetail.deleteMany({ order: { $in: orderIds } });
    await Order.deleteMany({ user: userId });

    // Delete Address
    const address = await Address.find({ user: userId });
    const addressIds = address.map(address => address);
    const addressDeleted = await Address.deleteMany({ _id: { $in: addressIds } });

    // Delete the user
    await User.deleteOne({ _id: userId });

    // Create a new notification for the admin
    await Notification.create({
      message: `Delete user Account: ${user.UserName}`,
      type: "user_deleted",
      actionBy: userId,
    });
    res.status(200).json({
      message: 'User and all associated records deleted successfully',
      recordsDeleted: {
        adminDeleted: adminDeleted.deletedCount,
        customerDeleted: customerDeleted.deletedCount,
        cartDeleted: cartIds.length,
        ordersDeleted: orderIds.length,
        addressDeleted: addressDeleted.deletedCount
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getusers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getcurrentuser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const admin = await Admin.findOne({ user: req.user.id });
    res.status(200).json({ user, admin });
  }
  catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    // 🔹 Step 1: Find User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let userTypeData = null;
    let userType = "unknown";

    // 🔹 Step 2: Check if user is a Customer
    const customer = await Customer.findOne({ user: user._id }).populate("CustomerAddress");
    if (customer) {
      userType = "customer";
      userTypeData = customer;
    } else {
      // 🔹 Step 3: Check if user is an Admin
      const admin = await Admin.findOne({ user: user._id }).populate("adminAddress");
      if (admin) {
        userType = "admin";
        userTypeData = admin;
      }
    }

    // 🔹 Step 4: Send response
    res.json({
      user,
      userType,
      userTypeData,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};