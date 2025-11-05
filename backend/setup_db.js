const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://aravindhvinayagam2007_db_user:RXGSMWjV3lSxBjHH@loancluster.xhvqvbf.mongodb.net/loanDB?retryWrites=true&w=majority';

async function setupDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB Atlas');

        const ownerSchema = new mongoose.Schema({
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true }
        }, { timestamps: true });

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

        const Owner = mongoose.model('Owner', ownerSchema);
        const Customer = mongoose.model('Customer', customerSchema);

        // Create owner account
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

        // Create sample customers if none exist
        const customerCount = await Customer.countDocuments();
        if (customerCount === 0) {
            console.log('📝 Creating sample customer data...');
            const sampleCustomers = [
                {
                    name: "Rajesh Kumar",
                    phone: "9876543210",
                    address: "123 Main Street, Chennai, Tamil Nadu - 600001",
                    profilePicture: "https://randomuser.me/api/portraits/men/32.jpg",
                    loanStartDate: new Date().toISOString().split('T')[0],
                    totalLoanAmount: 50000,
                    dailyPayment: 500,
                    payments: [
                        { 
                            date: new Date(Date.now() - 86400000).toISOString().split('T')[0], 
                            amount: 500, 
                            interest: 50, 
                            principal: 450 
                        },
                        { 
                            date: new Date().toISOString().split('T')[0], 
                            amount: 500, 
                            interest: 50, 
                            principal: 450 
                        }
                    ]
                },
                {
                    name: "Priya Sharma",
                    phone: "8765432109",
                    address: "456 Oak Avenue, Mumbai, Maharashtra - 400001",
                    profilePicture: "https://randomuser.me/api/portraits/women/44.jpg",
                    loanStartDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
                    totalLoanAmount: 75000,
                    dailyPayment: 750,
                    payments: [
                        { 
                            date: new Date(Date.now() - 86400000).toISOString().split('T')[0], 
                            amount: 750, 
                            interest: 75, 
                            principal: 675 
                        }
                    ]
                },
                {
                    name: "Amit Patel",
                    phone: "7654321098",
                    address: "789 Gandhi Road, Delhi - 110001",
                    profilePicture: "https://randomuser.me/api/portraits/men/67.jpg",
                    loanStartDate: new Date(Date.now() - 259200000).toISOString().split('T')[0],
                    totalLoanAmount: 100000,
                    dailyPayment: 1000,
                    payments: [
                        { 
                            date: new Date(Date.now() - 172800000).toISOString().split('T')[0], 
                            amount: 1000, 
                            interest: 100, 
                            principal: 900 
                        },
                        { 
                            date: new Date(Date.now() - 86400000).toISOString().split('T')[0], 
                            amount: 1000, 
                            interest: 100, 
                            principal: 900 
                        }
                    ]
                }
            ];
            
            await Customer.insertMany(sampleCustomers);
            console.log('✅ Sample customer data created successfully');
            console.log(`📊 Created ${sampleCustomers.length} sample customers`);
        } else {
            console.log(`✅ Database already has ${customerCount} customers`);
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Owner Email: owner@loanpro.com');
        console.log('   Owner Password: admin123');
        console.log('\n👥 Sample Customer Phone Numbers for Testing:');
        console.log('   9876543210, 8765432109, 7654321098');
        
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        
        if (error.name === 'MongoServerSelectionError') {
            console.log('\n💡 Connection Issues:');
            console.log('   1. Check your internet connection');
            console.log('   2. Verify MongoDB Atlas credentials');
            console.log('   3. Make sure your IP is whitelisted in MongoDB Atlas');
            console.log('\n🌐 To whitelist your IP:');
            console.log('   - Go to MongoDB Atlas → Network Access');
            console.log('   - Add your current IP address or use 0.0.0.0/0 (allow all)');
        }
        
        process.exit(1);
    }
}

setupDatabase();
