// customer.js - UPDATED TO REMOVE DUPLICATE VARIABLES
console.log("👤 Customer Dashboard Loaded");

// Define API_BASE for deployment - UPDATED TO PREVENT CONFLICT
const CUSTOMER_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:5000" 
    : "https://loanpro-backend-t41k.onrender.com";

// REST OF YOUR EXISTING customer.js CODE REMAINS EXACTLY THE SAME
let currentCustomer = null;
let customerPayments = [];

// 🧭 DOM Elements - REMOVED DUPLICATES THAT ARE IN script.js
// These are already declared in script.js, so we'll reference them directly
// const customerDashboard = document.getElementById("customerDashboard");
// const customerLoginSection = document.getElementById("customerLogin");
// const customerPhoneInput = document.getElementById("customerPhone");
// const customerLoginBtn = document.getElementById("customerLoginBtn");
// const customerLogoutBtn = document.getElementById("customerLogoutBtn");

// Customer-specific DOM elements (not in script.js)
const customerNameDisplay = document.getElementById("customerName");
const customerPhoneDisplay = document.getElementById("customerPhoneDisplay");
const customerAddressDisplay = document.getElementById("customerAddressDisplay");
const loanAmountDisplay = document.getElementById("loanAmountDisplay");
const dailyPaymentDisplay = document.getElementById("dailyPaymentDisplay");
const startDateDisplay = document.getElementById("startDateDisplay");
const totalPaidDisplay = document.getElementById("totalPaidDisplay");
const remainingAmountDisplay = document.getElementById("remainingAmountDisplay");
const paymentProgressFill = document.getElementById("paymentProgressFill");
const paymentProgressText = document.getElementById("paymentProgressText");
const paymentHistoryBody = document.getElementById("paymentHistoryBody");
const daysStatusDisplay = document.getElementById("daysStatusDisplay");
const customerStatusDisplay = document.getElementById("customerStatusDisplay");

// ✅ Customer Login - UPDATED TO USE GLOBAL VARIABLES FROM script.js
if (window.customerLoginBtn) {
    window.customerLoginBtn.addEventListener("click", async () => {
        const phone = window.customerPhoneInput.value.trim();
        
        if (!phone || phone.length < 10) {
            alert("Please enter a valid phone number (at least 10 digits)");
            return;
        }

        try {
            showCustomerLoading("Logging in...");
            
            const res = await fetch(`${CUSTOMER_API_BASE}/api/customers/phone/${phone}`);
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("Customer not found. Please check your phone number.");
                }
                throw new Error(`Login failed: ${res.status}`);
            }
            
            const customer = await res.json();
            currentCustomer = customer;
            
            // Hide login, show dashboard - USING GLOBAL VARIABLES
            window.customerLoginSection.classList.add("hidden");
            window.customerDashboard.classList.remove("hidden");
            
            // Load customer data
            loadCustomerData();
            
        } catch (err) {
            console.error("❌ Customer login error:", err);
            alert(err.message || "Login failed. Please try again.");
            hideCustomerLoading();
        }
    });
}

// ✅ Load Customer Data
async function loadCustomerData() {
    if (!currentCustomer) return;
    
    try {
        showCustomerLoading("Loading your data...");
        
        // Refresh customer data
        const res = await fetch(`${CUSTOMER_API_BASE}/api/customers/${currentCustomer._id}`);
        if (!res.ok) throw new Error("Failed to load customer data");
        
        const customer = await res.json();
        currentCustomer = customer;
        
        // Update displays
        customerNameDisplay.textContent = customer.name;
        customerPhoneDisplay.textContent = customer.phone;
        customerAddressDisplay.textContent = customer.address;
        loanAmountDisplay.textContent = `₹${customer.totalLoanAmount.toLocaleString()}`;
        dailyPaymentDisplay.textContent = `₹${customer.dailyPayment}`;
        startDateDisplay.textContent = customer.loanStartDate;
        
        // Calculate payment totals
        const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
        const paymentProgress = (totalPaid / customer.totalLoanAmount) * 100;
        
        totalPaidDisplay.textContent = `₹${totalPaid.toLocaleString()}`;
        remainingAmountDisplay.textContent = `₹${remainingAmount.toLocaleString()}`;
        
        // Update progress bar
        paymentProgressFill.style.width = `${paymentProgress}%`;
        paymentProgressText.textContent = `${paymentProgress.toFixed(1)}% Paid`;
        
        // Calculate and display status
        const customerWithStatus = calculateCustomerStatus(customer);
        const daysStatus = calculateDaysStatus(customerWithStatus);
        
        // Update status displays
        updateStatusDisplays(customerWithStatus, daysStatus);
        
        // Render payment history
        renderPaymentHistory(customer.payments || []);
        
        hideCustomerLoading();
        
    } catch (err) {
        console.error("❌ Error loading customer data:", err);
        alert("Failed to load your data. Please try again.");
        hideCustomerLoading();
    }
}

// ✅ Calculate Customer Status
function calculateCustomerStatus(customer) {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    // If fully paid, status is deactivated
    if (totalPaid >= customer.totalLoanAmount) {
        return { ...customer, calculatedStatus: 'deactivated' };
    }
    
    // Calculate days since loan start
    const loanStartDate = new Date(customer.loanStartDate);
    const today = new Date();
    const daysSinceStart = Math.floor((today - loanStartDate) / (1000 * 60 * 60 * 24));
    
    // If more than 100 days and not fully paid, status is pending
    if (daysSinceStart > 100) {
        return { ...customer, calculatedStatus: 'pending' };
    }
    
    // Otherwise, status is active
    return { ...customer, calculatedStatus: 'active' };
}

// ✅ Calculate Days Status
function calculateDaysStatus(customer) {
    const loanStartDate = new Date(customer.loanStartDate);
    const today = new Date();
    const daysSinceStart = Math.floor((today - loanStartDate) / (1000 * 60 * 60 * 24));
    
    if (customer.calculatedStatus === 'deactivated') {
        return { status: 'completed', days: 0 };
    } else if (customer.calculatedStatus === 'pending') {
        return { status: 'overdue', days: daysSinceStart - 100 };
    } else {
        const daysLeft = Math.max(0, 100 - daysSinceStart);
        return { status: 'active', days: daysLeft };
    }
}

// ✅ Update Status Displays
function updateStatusDisplays(customer, daysStatus) {
    // Update main status display
    let statusHTML = '';
    let statusClass = '';
    
    switch (customer.calculatedStatus) {
        case 'deactivated':
            statusHTML = '<i class="fas fa-check-circle"></i> Loan Completed';
            statusClass = 'status-completed';
            break;
        case 'pending':
            statusHTML = `<i class="fas fa-exclamation-triangle"></i> Overdue: ${daysStatus.days} days`;
            statusClass = 'status-pending';
            break;
        default:
            statusHTML = `<i class="fas fa-clock"></i> ${daysStatus.days} days remaining`;
            statusClass = 'status-active';
    }
    
    customerStatusDisplay.innerHTML = `<span class="${statusClass}">${statusHTML}</span>`;
    
    // Update days status display
    let daysHTML = '';
    switch (daysStatus.status) {
        case 'completed':
            daysHTML = '<span class="status-completed"><i class="fas fa-trophy"></i> Congratulations! Loan Paid</span>';
            break;
        case 'overdue':
            daysHTML = `<span class="status-pending"><i class="fas fa-exclamation-circle"></i> Overdue by ${daysStatus.days} days</span>`;
            break;
        default:
            daysHTML = `<span class="status-active"><i class="fas fa-calendar-check"></i> ${daysStatus.days} days to complete</span>`;
    }
    
    daysStatusDisplay.innerHTML = daysHTML;
}

// ✅ Render Payment History
function renderPaymentHistory(payments) {
    if (!payments || payments.length === 0) {
        paymentHistoryBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-payments">
                    <i class="fas fa-receipt"></i>
                    <div>No payments recorded yet</div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort payments by date (newest first)
    const sortedPayments = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    paymentHistoryBody.innerHTML = sortedPayments.map(payment => `
        <tr>
            <td>${payment.date}</td>
            <td class="payment-amount">₹${payment.amount.toLocaleString()}</td>
            <td class="payment-principal">₹${payment.principal.toLocaleString()}</td>
            <td class="payment-type">${payment.type || 'Regular'}</td>
        </tr>
    `).join('');
}

// ✅ Show Customer Loading
function showCustomerLoading(message = "Loading...") {
    const loadingElement = document.getElementById("customerLoading");
    const loadingText = document.getElementById("customerLoadingText");
    
    if (loadingElement && loadingText) {
        loadingText.textContent = message;
        loadingElement.classList.remove("hidden");
    }
}

// ✅ Hide Customer Loading
function hideCustomerLoading() {
    const loadingElement = document.getElementById("customerLoading");
    if (loadingElement) {
        loadingElement.classList.add("hidden");
    }
}

// ✅ Customer Logout - UPDATED TO USE GLOBAL VARIABLES
if (window.customerLogoutBtn) {
    window.customerLogoutBtn.addEventListener("click", () => {
        currentCustomer = null;
        customerPayments = [];
        
        // Clear phone input
        window.customerPhoneInput.value = "";
        
        // Show login, hide dashboard - USING GLOBAL VARIABLES
        window.customerDashboard.classList.add("hidden");
        window.customerLoginSection.classList.remove("hidden");
    });
}

// ✅ Enter key support for login - UPDATED TO USE GLOBAL VARIABLES
if (window.customerPhoneInput) {
    window.customerPhoneInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            window.customerLoginBtn.click();
        }
    });
}

// 🚀 Initialize Customer Dashboard
window.addEventListener("DOMContentLoaded", () => {
    console.log("👤 Customer Dashboard Initialized");
    
    // Check if customer is already logged in (from session storage)
    const savedCustomerId = sessionStorage.getItem('currentCustomerId');
    if (savedCustomerId) {
        // Optional: Auto-login functionality can be added here
    }
});
