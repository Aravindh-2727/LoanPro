// ✅ Owner.js - Final Clean Version
console.log("📊 Owner Dashboard Loaded");

const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

let allCustomers = [];
let currentCustomerId = null;

/* -------------------------------------------
 ✅ GLOBAL SAFE FUNCTIONS
--------------------------------------------*/

// Prevents "not defined" errors in browser
window.calculateCustomerStatus = function(customer) {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    if (totalPaid >= customer.totalLoanAmount) return "deactivated";

    const days = Math.floor((new Date() - new Date(customer.loanStartDate)) / (1000*60*60*24));
    if (days > 100) return "pending";

    return "active";
};

window.showError = function(msg) {
    alert(msg);
};

// Duplicate safety — always returns correct function
function calculateCustomerStatus(customer) {
    return window.calculateCustomerStatus(customer);
}

/* -------------------------------------------
 ✅ RENDER CUSTOMER LIST
--------------------------------------------*/
function renderCustomerList(customers) {
    const container = document.getElementById("customersContainer");
    if (!container) return;

    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;">No customers found</div>';
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;">
                <thead>
                    <tr style="background:#2c3e50;color:white;">
                        <th style="padding:12px;">Name</th>
                        <th style="padding:12px;">Phone</th>
                        <th style="padding:12px;">Loan Amount</th>
                        <th style="padding:12px;">Status</th>
                        <th style="padding:12px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    customers.forEach(customer => {
        const status = calculateCustomerStatus(customer);
        const totalPaid = customer.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
        const statusColor = status === "deactivated" ? "#27ae60"
                          : status === "pending" ? "#f39c12"
                          : "#3498db";

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;">
                    <strong>${customer.name}</strong><br>
                    <small>${customer.address}</small>
                </td>
                <td style="padding:12px;">${customer.phone}</td>
                <td style="padding:12px;">
                    ₹${customer.totalLoanAmount?.toLocaleString()}<br>
                    <small>Paid: ₹${totalPaid.toLocaleString()}</small>
                </td>
                <td style="padding:12px;">
                    <span style="background:${statusColor};color:white;padding:4px 8px;border-radius:12px;">
                        ${status}
                    </span>
                </td>
                <td style="padding:12px;">
                    <button onclick="showCustomerDetails('${customer._id}')" 
                            style="padding:6px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

/* -------------------------------------------
 ✅ SHOW CUSTOMER DETAILS POPUP
--------------------------------------------*/
async function showCustomerDetails(customerId) {
    try {
        const res = await fetch(`${API_BASE}/api/customers/${customerId}`);
        if (!res.ok) throw new Error("Unable to fetch customer");
        const customer = await res.json();

        const totalPaid = customer.payments?.reduce((s,p)=>s+(p.amount||0),0) || 0;
        const remaining = customer.totalLoanAmount - totalPaid;

        alert(
`CUSTOMER DETAILS

Name: ${customer.name}
Phone: ${customer.phone}
Loan: ₹${customer.totalLoanAmount}
Paid: ₹${totalPaid}
Remaining: ₹${remaining}
Status: ${calculateCustomerStatus(customer)}`
        );

    } catch (err) {
        console.error(err);
        showError("Failed to load customer");
    }
}

/* -------------------------------------------
 ✅ ANALYTICS
--------------------------------------------*/
function updateAnalytics(customers) {
    document.getElementById("analyticsTotalCustomers").textContent = customers.length;
    document.getElementById("analyticsActiveLoans").textContent =
        customers.filter(c => calculateCustomerStatus(c) === "active").length;

    const totalLoan = customers.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    document.getElementById("analyticsTotalLoanAmount").textContent =
        "₹" + totalLoan.toLocaleString();
}

/* -------------------------------------------
 ✅ LOAD CUSTOMERS
--------------------------------------------*/
async function loadCustomers() {
    try {
        console.log("🔄 Loading customers from:", `${API_BASE}/api/customers`);

        const res = await fetch(`${API_BASE}/api/customers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const customers = await res.json();
        console.log("✅ Successfully loaded customers:", customers.length);

        allCustomers = customers;

        updateAnalytics(customers);
        renderCustomerList(customers);

    } catch (err) {
        console.error(err);
        showError("Failed to load customers");
    }
}

/* -------------------------------------------
 ✅ ADD CUSTOMER
--------------------------------------------*/
function showAddCustomerForm() {
    document.getElementById("addCustomerForm").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
}

function hideAddCustomerForm() {
    document.getElementById("addCustomerForm").classList.add("hidden");
    document.getElementById("customerList").classList.remove("hidden");
}

async function saveCustomer() {
    const name = newCustName.value.trim();
    const phone = newCustPhone.value.trim();
    const address = newCustAddress.value.trim();
    const loanStartDate = newCustStart.value;
    const totalLoanAmount = parseFloat(newCustDue.value) || 0;

    if (!name || !phone) return showError("Name & phone required");

    const newCustomer = {
        name, phone, address, loanStartDate, totalLoanAmount,
        dailyPayment: Math.round(totalLoanAmount / 100),
        payments: [], status: "active"
    };

    try {
        const res = await fetch(`${API_BASE}/api/owner/add-customer`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(newCustomer),
        });

        if (!res.ok) throw new Error("Failed to save");

        alert("✅ Customer Added");
        hideAddCustomerForm();
        loadCustomers();

    } catch {
        showError("Error saving customer");
    }
}

/* -------------------------------------------
 ✅ SEARCH + FILTER
--------------------------------------------*/
function setupSearch() {
    document.getElementById("searchCustomer")?.addEventListener("input", e => {
        const t = e.target.value.toLowerCase();
        renderCustomerList(allCustomers.filter(c =>
            c.name.toLowerCase().includes(t) || c.phone.includes(t) || c.address.toLowerCase().includes(t)
        ));
    });
}

function setupFilters() {
    document.getElementById("filterStatus")?.addEventListener("change", function () {
        const st = this.value;
        const filtered = st === "all" ? allCustomers :
            allCustomers.filter(c => calculateCustomerStatus(c) === st);
        renderCustomerList(filtered);
    });
}

/* -------------------------------------------
 ✅ DASHBOARD INIT
--------------------------------------------*/
async function loadOwnerDashboard() {
    try {
        console.log("🏁 Owner Dashboard Initialized");
        await loadCustomers();
        console.log("✅ Dashboard Ready");
    } catch (err) {
        showError("Dashboard failed to load");
    }
}

/* -------------------------------------------
 ✅ EVENT BINDING
--------------------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Owner JS Ready");
    addCustomerBtn?.addEventListener("click", showAddCustomerForm);
    saveCustomerBtn?.addEventListener("click", saveCustomer);
    cancelAddBtn?.addEventListener("click", hideAddCustomerForm);
    ownerLogoutBtn?.addEventListener("click", () => location.href="index.html");

    setupSearch();
    setupFilters();
    loadOwnerDashboard();
});

console.log("✅ owner.js loaded");
