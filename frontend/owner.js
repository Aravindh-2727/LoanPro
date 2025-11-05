// owner.js - MINIMAL WORKING VERSION
console.log("📊 Owner Dashboard Loaded");

// Global variables
const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
let allCustomers = [];
let currentCustomerId = null;

// Simple utility functions
const showLoading = (containerId) => {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading...</div>';
    }
};

const showError = (containerId, message) => {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="padding: 20px; background: #fee; color: #c00; border-radius: 8px; text-align: center;">
                <strong>Error:</strong> ${message}
                <br><br>
                <button onclick="loadCustomers()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
};

// Calculate customer status
const calculateCustomerStatus = (customer) => {
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
};

// Main function to load customers
async function loadCustomers() {
    try {
        showLoading("customersContainer");
        
        console.log("Loading customers from:", `${API_BASE}/api/customers`);
        
        const response = await fetch(`${API_BASE}/api/customers`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const customers = await response.json();
        console.log("Loaded customers:", customers.length);
        
        // Process customers
        allCustomers = customers.map(customer => {
            return {
                ...customer,
                status: calculateCustomerStatus(customer),
                totalPaid: customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
            };
        });

        // Update analytics
        updateAnalytics(allCustomers);
        
        // Render customer list
        renderCustomerList(allCustomers);
        
    } catch (err) {
        console.error("Error loading customers:", err);
        showError("customersContainer", `Failed to load customers: ${err.message}`);
    }
}

// Update analytics
function updateAnalytics(customers) {
    const totalCustomersElem = document.getElementById("analyticsTotalCustomers");
    const activeLoansElem = document.getElementById("analyticsActiveLoans");
    const totalLoanAmountElem = document.getElementById("analyticsTotalLoanAmount");

    if (totalCustomersElem) totalCustomersElem.textContent = customers.length;

    const activeLoans = customers.filter(c => c.status === 'active').length;
    if (activeLoansElem) activeLoansElem.textContent = activeLoans;

    const totalLoan = customers.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    if (totalLoanAmountElem) totalLoanAmountElem.textContent = "₹" + totalLoan.toLocaleString();
}

// Render customer list
function renderCustomerList(customers) {
    const container = document.getElementById("customersContainer");
    if (!container) return;
    
    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">No customers found</div>';
        return;
    }

    let html = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
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
        const statusColor = customer.status === 'deactivated' ? '#27ae60' : 
                           customer.status === 'pending' ? '#f39c12' : '#3498db';
        
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
                    <small>Paid: ₹${customer.totalPaid.toLocaleString()}</small>
                </td>
                <td style="padding: 12px;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                        ${customer.status}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <button onclick="viewCustomer('${customer._id}')" style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">
                        View
                    </button>
                    ${customer.status === 'deactivated' ? `
                        <button onclick="deleteCustomer('${customer._id}')" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">
                            Delete
                        </button>
                    ` : ''}
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

// View customer details
async function viewCustomer(customerId) {
    try {
        console.log("Viewing customer:", customerId);
        
        const response = await fetch(`${API_BASE}/api/customers/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch customer");
        
        const customer = await response.json();
        
        // Show customer details
        alert(`Customer Details:\n\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nLoan Amount: ₹${customer.totalLoanAmount}`);
        
    } catch (err) {
        console.error("Error viewing customer:", err);
        alert("Failed to load customer details");
    }
}

// Delete customer
function deleteCustomer(customerId) {
    if (confirm("Are you sure you want to delete this customer?")) {
        console.log("Deleting customer:", customerId);
        alert("Delete functionality would be implemented here");
    }
}

// Add customer
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
            loadCustomers(); // Reload the list
        } else {
            const data = await response.json();
            alert("Failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        alert("Error adding customer.");
    }
}

// Back to list
function backToList() {
    document.getElementById("customerDetailView").classList.add("hidden");
    document.getElementById("customerList").classList.remove("hidden");
}

// Logout
function logout() {
    window.location.href = "index.html";
}

// Search functionality
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

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function() {
    console.log("Initializing owner dashboard...");
    
    // Set up event listeners
    document.getElementById("backToListBtn")?.addEventListener("click", backToList);
    document.getElementById("addCustomerBtn")?.addEventListener("click", showAddCustomerForm);
    document.getElementById("saveCustomerBtn")?.addEventListener("click", saveCustomer);
    document.getElementById("cancelAddBtn")?.addEventListener("click", hideAddCustomerForm);
    document.getElementById("ownerLogoutBtn")?.addEventListener("click", logout);
    
    // Set up search
    setupSearch();
    
    // Load initial data
    loadCustomers();
});

console.log("Owner dashboard script loaded successfully");
