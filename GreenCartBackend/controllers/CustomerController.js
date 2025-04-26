const Customer = require('../models/Customer');
const Address = require('../models/Address');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ✅ Create a Customer with Multiple Addresses
exports.createCustomer = async (req, res) => {
  try {
    const { CustomerName, CustomerEmail, CustomerContact, Image, CustomerAddress, user } = req.body;

    // Check if the email already exists
    const existingUser = await User.findOne({ UserEmail: CustomerEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(user.Password, 10);

    // Create new user
    const newUser = new User({
      UserName: CustomerName,
      UserEmail: CustomerEmail,
      UserType: 'Customer',
      Password: hashedPassword,
    });
    await newUser.save();

    // Create multiple addresses
    const addressIds = [];
    if (Array.isArray(CustomerAddress) && CustomerAddress.length > 0) {
      for (const addr of CustomerAddress) {
        const newAddress = new Address({ 
          ...addr, 
          ownerId: newUser._id, 
          ownerModel: 'Customer' 
        });
        await newAddress.save();
        addressIds.push(newAddress._id);
      }
    }

    // Create customer
    const newCustomer = new Customer({
      CustomerName,
      CustomerEmail,
      CustomerContact,
      Image,
      CustomerAddress: addressIds, // Store multiple addresses
      user: newUser._id
    });

    await newCustomer.save();
    res.status(201).json({ message: 'Customer created successfully', customer: newCustomer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get All Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate('user')
      .populate('CustomerAddress'); // Fetch all associated addresses

    if (!customers || customers.length === 0) {
      return res.status(404).json({ message: 'No customers found' });
    }
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a Customer by ID
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('CustomerAddress'); // Populate multiple addresses

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a Customer by UserID
exports.getCustomerByUserID = async (req, res) => {
  try {
    const customer = await Customer.findOne({ user: req.params.userId }); // Assuming you pass userId as a route param
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ✅ Update a Customer and Addresses
exports.updateCustomer = async (req, res) => {
  try {
    const { CustomerName, CustomerEmail, CustomerContact, Image, CustomerAddress, user } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Update User details if provided
    if (user) {
      const hashedPassword = await bcrypt.hash(user.Password, 10);
      await User.findByIdAndUpdate(customer.user, {
        UserName: user.UserName,
        UserEmail: user.UserEmail,
        UserType: user.UserType,
        Password: hashedPassword,
      }, { new: true });
    }

    // ✅ Handle Address Updates
    if (Array.isArray(CustomerAddress)) {
      const updatedAddressIds = [];

      for (const addr of CustomerAddress) {
        if (addr._id) {
          // Update existing address
          await Address.findByIdAndUpdate(addr._id, addr, { new: true });
          updatedAddressIds.push(addr._id);
        } else {
          // Create new address and associate it
          const newAddress = new Address({
            ...addr,
            ownerId: customer._id,
            ownerModel: "Customer",
          });
          await newAddress.save();
          updatedAddressIds.push(newAddress._id);
        }
      }

      // Assign updated addresses to customer
      customer.CustomerAddress = updatedAddressIds;
    }

    // ✅ Update Customer Details
    customer.CustomerName = CustomerName || customer.CustomerName;
    customer.CustomerEmail = CustomerEmail || customer.CustomerEmail;
    customer.CustomerContact = CustomerContact || customer.CustomerContact;
    customer.Image = Image || customer.Image;
    console.log(customer);
    await customer.save();
    res.status(200).json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete a Customer and Associated Addresses
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Delete all associated addresses
    await Address.deleteMany({ _id: { $in: customer.CustomerAddress } });

    // Delete associated user
    await User.findByIdAndDelete(customer.user);

    // Delete customer
    await customer.deleteOne();

    res.status(200).json({ message: 'Customer and associated addresses deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Fetch Unique Addresses for a Customer (Customer & OrderDetail)
exports.getUniqueAddressesForCustomer = async (req, res) => {
  try {
    const userId = req.user.id; // Extract from authentication middleware

    // Step 1: Find the customer linked to this user
    const customer = await Customer.findOne({ user: userId }).populate('CustomerAddress');
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Step 2: Fetch addresses from Customer & OrderDetail
    const customerAddresses = customer.CustomerAddress || [];

    const orderAddresses = await Address.find({ ownerId: customer._id, ownerModel: "OrderDetail" });

    // Combine addresses & remove duplicates
    const uniqueAddresses = [...new Map(
      [...customerAddresses, ...orderAddresses].map((addr) => [addr._id.toString(), addr])
    ).values()];

    res.json({ addresses: uniqueAddresses });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
