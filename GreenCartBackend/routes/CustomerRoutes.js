const express = require('express');
const CustomerController = require('../controllers/CustomerController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', CustomerController.createCustomer); // Create Customer
router.get('/', CustomerController.getCustomers); // Get Customers
router.get('/:id', CustomerController.getCustomer); // Get Customer by ID
router.get('/user/:id', CustomerController.getCustomerByUserID); // Get User by ID
router.put('/:id',authenticateToken, authorizeRole('Customer'), CustomerController.updateCustomer); // Update Customer
router.delete('/:id',authenticateToken, CustomerController.deleteCustomer); // Delete Customer

module.exports = router;
