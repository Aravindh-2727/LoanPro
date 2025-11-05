// owner.js - WORKING VERSION
console.log("📊 Owner Dashboard Loaded");

const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

let allCustomers = [];
let currentCustomerId = null;

// 1. CALCULATE CUSTOMER STATUS - DEFINED FIRST
function calculateCustomerStatus(customer) {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    if (totalPaid >= customer.totalLoanAmount) {
        return 'deactivated';
    }
    
    const loanStartDate = new Date(customer.loanStartDate);
    const today = new Date();
    const daysSinceStart = Math.floor((today - loanStartDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart > 100) {
        return 'pending';
    }
    
    return 'active';
}

// 2. RENDER CUSTOMER LIST
function renderCustomerList(customers) {
    const container = document.getElementById("customersContainer");
    if (!container) return;
    
    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">No customers found</div>';
        return;
    }

    let html = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
                <thead>
                    <tr style="background: #2c3e50; color: white;">
                        <th style="padding: 12px; text-align: left;">Name</th>
                        <th style="padding: 12px; text-align: left;">Phone</th>
                        <th style="padding: 12px; text-align: left;">Loan Amount</th>
                        <th style="padding: 12px; text-align: left;">Status</th>
                        <th style="padding: 12px; text-align: left;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    customers.forEach(customer => {
        const status = calculateCustomerStatus(customer);
        const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const statusColor = status === 'deactivated' ? '#27ae60' : 
                           status === 'pending' ? '#f39c12' : '#3498db';
        
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">
                    <strong>${customer.name}</strong>
                    <br>
                    <small style="color: #666;">${customer.address}</small>
                </td>
                <td style="padding: 12px;">${customer.phone}</td>
                <td style="padding: 12px;">
                    <strong>₹${customer.totalLoanAmount?.toLocaleString()}</strong>
                    <br>
                    <small>Paid: ₹${totalPaid.toLocaleString()}</small>
                </td>
                <td style="padding: 12px;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                        ${status}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <button onclick="showCustomerDetails('${customer._id}')" style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// 3. SHOW CUSTOMER DETAILS
async function showCustomerDetails(customerId) {
    try {
        const response = await fetch(`${API_BASE}/api/customers/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch customer");
        
        const customer = await response.json();
        const status = calculateCustomerStatus(customer);
        const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const remainingAmount = customer.totalLoanAmount - totalPaid;
        
        // Show customer details in alert (simple approach)
        alert(`CUSTOMER DETAILS:\n\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nLoan Amount: ₹${customer.totalLoanAmount}\nAmount Paid: ₹${totalPaid}\nRemaining: ₹${remainingAmount}\nStatus: ${status}`);
        
    } catch (err) {
        console.error("Error viewing customer:", err);
        alert("Failed to load customer details");
    }
}

// 4. UPDATE ANALYTICS
function updateAnalytics(customers) {
    const totalCustomersElem = document.getElementById("analyticsTotalCustomers");
    const activeLoansElem = document.getElementById("analyticsActiveLoans");
    const totalLoanAmountElem = document.getElementById("analyticsTotalLoanAmount");

    if (totalCustomersElem) totalCustomersElem.textContent = customers.length;

    const activeLoans = customers.filter(c => calculateCustomerStatus(c) === 'active').length;
    if (activeLoansElem) activeLoansElem.textContent = activeLoans;

    const totalLoan = customers.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    if (totalLoanAmountElem) totalLoanAmountElem.textContent = "₹" + totalLoan.toLocaleString();
}

// 5. LOAD CUSTOMERS - MAIN FUNCTION
async function loadCustomers() {
    try {
        console.log("Loading customers from:", `${API_BASE}/api/customers`);
        
        const response = await fetch(`${API_BASE}/api/customers`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const customers = await response.json();
        console.log("Loaded customers:", customers.length);
        
        allCustomers = customers;

        updateAnalytics(allCustomers);
        renderCustomerList(allCustomers);
        
    } catch (err) {
        console.error("Error loading customers:", err);
        document.getElementById("customersContainer").innerHTML = `
            <div style="padding: 20px; background: #fee; color: #c00; border-radius: 8px; text-align: center;">
                <strong>Error:</strong> Failed to load customers: ${err.message}
            </div>
        `;
    }
}

// 6. ADD CUSTOMER FUNCTIONS
function showAddCustomerForm() {
    document.getElementById("addCustomerForm").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
}

function hideAddCustomerForm() {
    document.getElementById("addCustomerForm").classList.add("hidden");
    document.getElementById("customerList").classList.remove("hidden");
}

async function saveCustomer() {
    const name = document.getElementById("newCustName").value.trim();
    const phone = document.getElementById("newCustPhone").value.trim();
    const address = document.getElementById("newCustAddress").value.trim();
    const startDate = document.getElementById("newCustStart").value;
    const totalLoanAmount = parseFloat(document.getElementById("newCustDue").value) || 0;

    if (!name || !phone) {
        alert("Name and phone are required!");
        return;
    }

    const newCustomer = {
        name,
        phone,
        address,
        loanStartDate: startDate,
        totalLoanAmount,
        dailyPayment: Math.round(totalLoanAmount / 100),
        payments: [],
        status: "active"
    };

    try {
        const response = await fetch(`${API_BASE}/api/owner/add-customer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCustomer),
        });

        if (response.ok) {
            alert("Customer added successfully!");
            hideAddCustomerForm();
            loadCustomers();
        } else {
            const data = await response.json();
            alert("Failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Error adding customer.");
    }
}

// 7. SEARCH FUNCTIONALITY
function setupSearch() {
    const searchInput = document.getElementById("searchCustomer");
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            const term = e.target.value.toLowerCase();
            const filtered = allCustomers.filter(customer =>
                customer.name.toLowerCase().includes(term) ||
                customer.phone.includes(term) ||
                customer.address.toLowerCase().includes(term)
            );
            renderCustomerList(filtered);
        });
    }
}

// 8. FILTER FUNCTIONS
function setupFilters() {
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', function() {
            const status = this.value;
            let filtered = allCustomers;
            
            if (status !== 'all') {
                filtered = allCustomers.filter(customer => calculateCustomerStatus(customer) === status);
            }
            
            renderCustomerList(filtered);
        });
    }
}

// 9. INITIALIZATION
document.addEventListener("DOMContentLoaded", function() {
    console.log("Initializing owner dashboard...");
    
    // Set up event listeners
    document.getElementById("addCustomerBtn")?.addEventListener("click", showAddCustomerForm);
    document.getElementById("saveCustomerBtn")?.addEventListener("click", saveCustomer);
    document.getElementById("cancelAddBtn")?.addEventListener("click", hideAddCustomerForm);
    document.getElementById("ownerLogoutBtn")?.addEventListener("click", function() {
        window.location.href = "index.html";
    });
    
    // Set up search and filters
    setupSearch();
    setupFilters();
    
    // Load initial data
    loadCustomers();
});

console.log("Owner dashboard script loaded successfully");
