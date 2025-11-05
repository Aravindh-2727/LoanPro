const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ✅ ENHANCED CORS Configuration - ALLOW SPECIFIC ORIGINS
const allowedOrigins = [
  'https://loan-pro-ten.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));

// ✅ Handle preflight requests
app.options('*', cors());

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

// ✅ Schemas (keep your existing schemas)
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

// ✅ Initialize Owner Account (keep your existing function)
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

// ✅ Health Check - FIXED ENDPOINT
app.get("/", (req, res) => {
    res.json({ 
        status: "Server is running!", 
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        timestamp: new Date().toISOString(),
        message: "LoanPro Backend API"
    });
});

// ✅ FIXED Analytics Endpoint - Add this before other routes
app.get("/api/analytics", async (req, res) => {
    try {
        const customers = await Customer.find();
        const totalCustomers = customers.length;
        const activeLoans = customers.filter(c => c.status === 'active').length;
        const totalLoanAmount = customers.reduce((sum, c) => sum + c.totalLoanAmount, 0);
        const amountReceived = customers.reduce((sum, c) =>
            sum + c.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0), 0
        );

        res.json({ 
            totalCustomers, 
            activeLoans, 
            totalLoanAmount, 
            amountReceived,
            success: true 
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ 
            message: 'Server error',
            success: false 
        });
    }
});

// ✅ Health Check Endpoint
app.get("/api/health", (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    res.json({ 
        status: "OK", 
        database: dbStatus,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ✅ Update Loan Status Function (keep your existing function)
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

// ✅ Owner Login - ADD CORS HEADERS
app.post('/api/owner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        const owner = await Owner.findOne({ email });
        if (!owner) return res.status(400).json({ message: 'Owner not found' });

        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({ 
            message: 'Login successful',
            success: true 
        });
    } catch (error) {
        console.error('Owner login error:', error);
        res.status(500).json({ 
            message: 'Server error',
            success: false 
        });
    }
});

// ✅ Customer Login - ADD CORS HEADERS
app.post('/api/customer/login', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number required' });

        const customer = await Customer.findOne({ phone });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        res.json({
            ...customer.toObject(),
            success: true
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error',
            success: false 
        });
    }
});

// ✅ Get All Customers - ADD CORS HEADERS
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
        res.status(500).json({ 
            message: 'Server error',
            success: false 
        });
    }
});

// ✅ Keep all your other existing routes (Get Customer by ID, Add Customer, Add Payment, Update Customer, Delete Customer, Delete Payment)
// ... [ALL YOUR EXISTING ROUTES REMAIN THE SAME] ...

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
