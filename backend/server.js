const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ✅ CORS Configuration - ALLOW ALL ORIGINS FOR DEVELOPMENT
app.use(cors({
  origin: "*", // Allow all origins during development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));

app.use(bodyParser.json());
app.use(express.json());

// ✅ MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aravindhvinayagam2007_db_user:RXGSMWjV3lSxBjHH@loancluster.xhvqvbf.mongodb.net/loanDB?retryWrites=true&w=majority";

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB Connected Successfully to Atlas Cluster');
    initializeOwner();
})
.catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
});

// ✅ Schemas
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    loanStartDate: { type: String, required: true },
    totalLoanAmount: { type: Number, required: true },
    dailyPayment: { type: Number, required: true },
    payments: [{
        date: String,
        amount: Number,
        interest: Number,
        principal: Number
    }],
    penaltyApplied: { type: Boolean, default: false },
    status: { type: String, default: 'active' }
}, { timestamps: true });

const ownerSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
const Owner = mongoose.model('Owner', ownerSchema);

// ✅ Initialize Owner Account
async function initializeOwner() {
    try {
        const existingOwner = await Owner.findOne({ email: 'owner@loanpro.com' });
        if (!existingOwner) {
            console.log('👤 Creating owner account...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const owner = new Owner({ 
                email: 'owner@loanpro.com', 
                password: hashedPassword 
            });
            await owner.save();
            console.log('✅ Owner account created successfully');
        } else {
            console.log('✅ Owner account already exists');
        }
    } catch (error) {
        console.log('❌ Error in owner account setup:', error.message);
    }
}

// ✅ Health Check
app.get("/", (req, res) => {
    res.json({ 
        status: "Server is running!", 
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/health", (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    res.json({ 
        status: "OK", 
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// ✅ Update Loan Status Function
async function updateLoanStatus(customer) {
    try {
        const totalPaid = customer.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        if (totalPaid >= customer.totalLoanAmount && customer.status === 'active') {
            customer.status = 'deactivated';
            await customer.save();
            console.log(`✅ Loan deactivated for ${customer.name}`);
        }
        
        return customer;
    } catch (error) {
        console.error('Error updating loan status:', error);
        return customer;
    }
}

// ✅ Owner Login
app.post('/api/owner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        const owner = await Owner.findOne({ email });
        if (!owner) return res.status(400).json({ message: 'Owner not found' });

        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Owner login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Customer Login
app.post('/api/customer/login', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number required' });

        const customer = await Customer.findOne({ phone });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Get All Customers
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        
        const updatedCustomers = await Promise.all(
            customers.map(async (customer) => {
                return await updateLoanStatus(customer);
            })
        );
        
        res.json(updatedCustomers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Get Customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        let customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        
        customer = await updateLoanStatus(customer);
        
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Owner Add Customer
app.post('/api/owner/add-customer', async (req, res) => {
  try {
    const { name, phone, address, loanStartDate, totalLoanAmount, dailyPayment } = req.body;
    
    if (!name || !phone || !address || !loanStartDate || !totalLoanAmount) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const newCustomer = new Customer({
      name,
      phone,
      address,
      loanStartDate,
      totalLoanAmount,
      dailyPayment: dailyPayment || Math.round(totalLoanAmount * 0.01),
      payments: [],
      status: 'active'
    });

    await newCustomer.save();
    
    res.status(201).json({ 
      message: 'Customer added successfully', 
      customer: newCustomer 
    });
  } catch (error) {
    console.error('❌ Add customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    res.status(500).json({ 
      message: 'Server error while adding customer',
      error: error.message 
    });
  }
});

// ✅ Add Payment
app.post('/api/customers/:id/payments', async (req, res) => {
    try {
        const { date, amount, principal } = req.body;
        let customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        customer.payments.push({ 
            date, 
            amount, 
            principal: principal || amount
        });
        
        customer = await updateLoanStatus(customer);
        await customer.save();

        res.json({ message: 'Payment added successfully', customer });
    } catch (error) {
        console.error('Add payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Update Customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, address, loanStartDate, totalLoanAmount, dailyPayment } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.name = name;
    customer.phone = phone;
    customer.address = address;
    customer.loanStartDate = loanStartDate;
    customer.totalLoanAmount = totalLoanAmount;
    customer.dailyPayment = dailyPayment;

    await customer.save();
    res.json({ message: 'Customer updated successfully', customer });
    
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Delete Customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Delete Payment
app.delete('/api/customers/:customerId/payments/:paymentDate', async (req, res) => {
  try {
    const { customerId, paymentDate } = req.params;
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.payments = customer.payments.filter(p => p.date !== paymentDate);
    await customer.save();

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Analytics Endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const customers = await Customer.find();
        const totalCustomers = customers.length;
        const activeLoans = customers.filter(c => c.status === 'active').length;
        const totalLoanAmount = customers.reduce((sum, c) => sum + c.totalLoanAmount, 0);
        const amountReceived = customers.reduce((sum, c) =>
            sum + c.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0), 0
        );

        res.json({ totalCustomers, activeLoans, totalLoanAmount, amountReceived });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
