// owner.js - FINAL FIXED VERSION
console.log("📊 Owner Dashboard Loaded");

const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

let allCustomers = [];
let currentCustomerId = null;

/* ✅ Global Functions */
window.calculateCustomerStatus = function(customer) {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    if (totalPaid >= customer.totalLoanAmount) return 'deactivated';

    const days = Math.floor((new Date() - new Date(customer.loanStartDate)) / (1000*60*60*24));
    if (days > 100) return 'pending';

    return 'active';
};

window.showError = function(msg) {
    alert(msg);
};

/* ✅ Render Customer List */
function renderCustomerList(customers) {
    const container = document.getElementById("customersContainer");
    if (!container) return;

    if (customers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;">No customers found</div>';
        return;
    }

    let html = `
    <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;">
    <thead><tr style="background:#2c3e50;color:#fff;">
    <th style="padding:12px">Name</th>
    <th style="padding:12px">Phone</th>
    <th style="padding:12px">Loan</th>
    <th style="padding:12px">Status</th>
    <th style="padding:12px">Actions</th>
    </tr></thead><tbody>`;

    customers.forEach(customer => {
        const status = calculateCustomerStatus(customer);
        const totalPaid = customer.payments?.reduce((s,p)=>s+(p.amount||0),0) || 0;
        const statusColor = status === 'deactivated' ? '#27ae60'
                        : status === 'pending' ? '#f39c12'
                        : '#3498db';

        html += `
        <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px;">
            <strong>${customer.name}</strong><br>
            <small style="color:#666">${customer.address}</small>
        </td>
        <td style="padding:12px">${customer.phone}</td>
        <td style="padding:12px">
            <strong>₹${customer.totalLoanAmount?.toLocaleString()}</strong><br>
            <small>Paid: ₹${totalPaid.toLocaleString()}</small>
        </td>
        <td style="padding:12px;">
            <span style="background:${statusColor};color:#fff;padding:4px 8px;border-radius:12px;font-size:12px;">
                ${status}
            </span>
        </td>
        <td style="padding:12px;">
            <button onclick="showCustomerDetails('${customer._id}')" style="padding:6px 12px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                View
            </button>
        </td>
        </tr>`;
    });

    container.innerHTML = html + "</tbody></table></div>";
}

/* ✅ View Customer Details */
async function showCustomerDetails(id) {
    try {
        const res = await fetch(`${API_BASE}/api/customers/${id}`);
        const c = await res.json();

        const totalPaid = c.payments?.reduce((s,p)=>s+(p.amount||0),0) || 0;
        const remaining = c.totalLoanAmount - totalPaid;
        const status = calculateCustomerStatus(c);

        alert(
            `CUSTOMER DETAILS\n\nName: ${c.name}\nPhone: ${c.phone}\nAddress: ${c.address}\n` +
            `Loan: ₹${c.totalLoanAmount}\nPaid: ₹${totalPaid}\nRemaining: ₹${remaining}\nStatus: ${status}`
        );

    } catch {
        showError("Failed to load customer details");
    }
}

/* ✅ Analytics */
function updateAnalytics(customers) {
    document.getElementById("analyticsTotalCustomers").textContent = customers.length;
    document.getElementById("analyticsActiveLoans").textContent =
        customers.filter(c => calculateCustomerStatus(c) === 'active').length;
    document.getElementById("analyticsTotalLoanAmount").textContent =
        "₹" + customers.reduce((s,c)=>s+(c.totalLoanAmount||0),0).toLocaleString();
}

/* ✅ Load Customers */
async function loadCustomers() {
    try {
        const res = await fetch(`${API_BASE}/api/customers`);
        const data = await res.json();

        allCustomers = data;
        updateAnalytics(allCustomers);
        renderCustomerList(allCustomers);

        console.log(`✅ Loaded customers: ${allCustomers.length}`);
    } catch (err) {
        showError("Error loading customers: " + err.message);
    }
}

/* ✅ Add New Customer */
async function saveCustomer() {
    const name = newCustName.value.trim();
    const phone = newCustPhone.value.trim();
    const address = newCustAddress.value.trim();
    const start = newCustStart.value;
    const total = parseFloat(newCustDue.value)||0;

    if (!name || !phone) return showError("Name & phone required");

    const body = { name, phone, address, loanStartDate:start, totalLoanAmount:total, dailyPayment:Math.round(total/100), payments:[], status:"active" };

    try {
        const res = await fetch(`${API_BASE}/api/owner/add-customer`, {
            method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Failed to add");
        alert("✅ Customer added");
        hideAddCustomerForm();
        loadCustomers();
    } catch {
        showError("Error adding customer");
    }
}

/* ✅ Search + Filter */
function setupSearch(){
    searchCustomer?.addEventListener("input", e=>{
        const term = e.target.value.toLowerCase();
        renderCustomerList(allCustomers.filter(c =>
            c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.address.toLowerCase().includes(term)
        ));
    });
}
function setupFilters(){
    filterStatus?.addEventListener("change", function(){
        renderCustomerList(
            this.value==="all" ? allCustomers :
            allCustomers.filter(c => calculateCustomerStatus(c)===this.value)
        );
    });
}

/* ✅ Dashboard Loader */
async function loadOwnerDashboard(){
    console.log("🏁 Owner Dashboard Initialized");
    await loadCustomers();
    console.log("✅ Dashboard Ready");
}

/* ✅ Page Init */
document.addEventListener("DOMContentLoaded", ()=>{
    addCustomerBtn.onclick = ()=> addCustomerForm.classList.remove("hidden");
    saveCustomerBtn.onclick = saveCustomer;
    cancelAddBtn.onclick = ()=> addCustomerForm.classList.add("hidden");
    ownerLogoutBtn.onclick = ()=> location.href="index.html";

    setupSearch();
    setupFilters();
    loadOwnerDashboard();
});

console.log("✅ Owner dashboard script loaded");
