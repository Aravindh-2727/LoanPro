// owner.js - CORRECTED VERSION WITH FUNCTIONS FIRST
console.log("📊 Owner Dashboard Loaded");

// Use the global API_BASE variable with fallback
const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

console.log("🌐 Using API Base:", window.API_BASE);

let allCustomers = [];
let currentCustomerId = null;

// ==================== ALL FUNCTIONS MUST BE DEFINED FIRST ====================

// ✅ Function 1: Calculate Customer Status
function calculateCustomerStatus(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  if (totalPaid >= customer.totalLoanAmount) {
    return { ...customer, calculatedStatus: 'deactivated' };
  }
  
  const loanStartDate = new Date(customer.loanStartDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today - loanStartDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceStart > 100) {
    return { ...customer, calculatedStatus: 'pending' };
  }
  
  return { ...customer, calculatedStatus: 'active' };
}

// ✅ Function 2: Calculate Days Status
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

// ✅ Function 3: Show Loading
function showLoading(containerId, message = "Loading...") {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p>${message}</p>
      </div>
    `;
  }
}

// ✅ Function 4: Show Error
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div style="padding: 25px; background: #f8d7da; color: #721c24; border-radius: 8px; text-align: center; margin: 20px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
        <p style="margin: 10px 0; font-weight: bold;">${message}</p>
        <button class="btn btn-primary" onclick="loadOwnerDashboard()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}

// ✅ Function 5: Update Analytics
function updateAnalytics(customers) {
  const totalCustomersElem = document.getElementById("analyticsTotalCustomers");
  const activeLoansElem = document.getElementById("analyticsActiveLoans");
  const totalLoanAmountElem = document.getElementById("analyticsTotalLoanAmount");
  const amountReceivedElem = document.getElementById("analyticsAmountReceived");
  const activeLoansReceivedElem = document.getElementById("analyticsActiveLoansReceived");

  if (totalCustomersElem) totalCustomersElem.textContent = customers.length;

  const activeLoans = customers.filter(c => c.calculatedStatus === 'active').length;
  if (activeLoansElem) activeLoansElem.textContent = activeLoans;

  let totalLoan = 0, amountReceived = 0, activeLoansReceived = 0;
  
  customers.forEach(c => {
    totalLoan += c.totalLoanAmount || 0;
    const customerPaid = c.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    amountReceived += customerPaid;
    
    if (c.calculatedStatus === 'active') {
      activeLoansReceived += customerPaid;
    }
  });

  if (totalLoanAmountElem) totalLoanAmountElem.textContent = "₹" + totalLoan.toLocaleString();
  if (amountReceivedElem) amountReceivedElem.textContent = "₹" + amountReceived.toLocaleString();
  if (activeLoansReceivedElem) activeLoansReceivedElem.textContent = "₹" + activeLoansReceived.toLocaleString();
}

// ✅ Function 6: Apply Filters
function applyFilters() {
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const amountFilter = document.getElementById('filterAmount')?.value || 'all';
  const dateFilter = document.getElementById('filterDate')?.value || 'all';
  const sortBy = document.getElementById('sortBy')?.value || 'name';
  
  let filteredCustomers = [...allCustomers];
  
  if (statusFilter !== 'all') {
    filteredCustomers = filteredCustomers.filter(customer => 
      customer.calculatedStatus === statusFilter
    );
  }
  
  if (amountFilter !== 'all') {
    filteredCustomers = filteredCustomers.filter(customer => {
      const amount = customer.totalLoanAmount;
      switch (amountFilter) {
        case 'high': return amount >= 50000;
        case 'medium': return amount >= 25000 && amount < 50000;
        case 'low': return amount < 25000;
        default: return true;
      }
    });
  }
  
  if (dateFilter !== 'all') {
    const today = new Date();
    filteredCustomers = filteredCustomers.filter(customer => {
      const startDate = new Date(customer.loanStartDate);
      const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'recent': return daysSinceStart <= 30;
        case 'old': return daysSinceStart > 30;
        default: return true;
      }
    });
  }
  
  updateCustomerCount(filteredCustomers.length);
  renderCustomerList(filteredCustomers);
}

// ✅ Function 7: Update Customer Count
function updateCustomerCount(count) {
  const customerCountElem = document.getElementById('customerCount');
  if (customerCountElem) {
    customerCountElem.textContent = `${count} customer${count !== 1 ? 's' : ''}`;
  }
}

// ✅ Function 8: Render Customer List
function renderCustomerList(customers) {
  const customersContainer = document.getElementById("customersContainer");
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters or add a new customer</p>
      </div>
    `;
    return;
  }

  let tableHTML = `
    <div style="width: 100%; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #2c3e50; color: white;">
            <th style="padding: 15px; text-align: left;">Customer</th>
            <th style="padding: 15px; text-align: left;">Contact</th>
            <th style="padding: 15px; text-align: left;">Loan Amount</th>
            <th style="padding: 15px; text-align: left;">Status</th>
            <th style="padding: 15px; text-align: left;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  customers.forEach(customer => {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const isDeactivated = customer.calculatedStatus === 'deactivated';
    
    tableHTML += `
      <tr style="border-bottom: 1px solid #eee; cursor: pointer;" onclick="viewCustomerDetails('${customer._id}')">
        <td style="padding: 15px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white;">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <div style="font-weight: bold; font-size: 16px; color: #2c3e50;">${customer.name}</div>
              <div style="color: #666; font-size: 14px;">${customer.address}</div>
            </div>
          </div>
        </td>
        <td style="padding: 15px;">
          <div style="color: #666;">${customer.phone}</div>
        </td>
        <td style="padding: 15px;">
          <div style="font-weight: bold; color: #2c3e50;">₹${customer.totalLoanAmount.toLocaleString()}</div>
          <div style="color: #666; font-size: 12px;">Paid: ₹${totalPaid.toLocaleString()}</div>
        </td>
        <td style="padding: 15px;">
          <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${customer.calculatedStatus === 'deactivated' ? '#27ae60' : customer.calculatedStatus === 'pending' ? '#f39c12' : '#3498db'}; color: white;">
            ${customer.calculatedStatus === 'deactivated' ? 'Completed' : customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
          </span>
        </td>
        <td style="padding: 15px;">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')" style="padding: 6px 12px; margin: 2px;">View</button>
          ${isDeactivated ? `
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteCustomer('${customer._id}', '${customer.name}')" style="padding: 6px 12px; margin: 2px;">Delete</button>
          ` : ''}
        </td>
      </tr>
    `;
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  customersContainer.innerHTML = tableHTML;
}

// ✅ Function 9: View Customer Details
async function viewCustomerDetails(customerId) {
  try {
    currentCustomerId = customerId;
    
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    
    // Show basic customer info
    alert(`Customer: ${customer.name}\nPhone: ${customer.phone}\nLoan: ₹${customer.totalLoanAmount}`);
    
  } catch (err) {
    console.error("Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

// ✅ Function 10: Delete Customer
function deleteCustomer(customerId, customerName) {
  if (confirm(`Delete customer ${customerName}?`)) {
    console.log("Would delete customer:", customerId);
    alert("Delete functionality would go here");
  }
}

// ==================== MAIN DASHBOARD FUNCTION ====================

// ✅ Function 11: Load Owner Dashboard (THIS USES THE FUNCTIONS ABOVE)
async function loadOwnerDashboard() {
  try {
    showLoading("customersContainer", "Loading customers...");
    
    console.log("🔄 Loading customers from:", `${window.API_BASE}/api/customers`);
    
    const response = await fetch(`${window.API_BASE}/api/customers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    });
    
    console.log("📡 Response status:", response.status);
    console.log("✅ Response ok:", response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch customers: HTTP ${response.status}`);
    }
    
    const customers = await response.json();
    console.log("✅ Successfully loaded customers:", customers.length);
    
    // ✅ This line was causing the error - now functions are defined above
    allCustomers = customers.map(calculateCustomerStatus);

    updateAnalytics(allCustomers);
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ==================== INITIALIZATION ====================

// ✅ Function 12: Initialize Dashboard
function initializeOwnerDashboard() {
  console.log("🏁 Owner Dashboard Initialized");
  console.log("🌐 Final API Base:", window.API_BASE);

  // Setup event listeners
  document.getElementById("backToListBtn")?.addEventListener("click", () => {
    document.getElementById("customerDetailView")?.classList.add("hidden");
    document.getElementById("customerList")?.classList.remove("hidden");
  });

  document.getElementById("addCustomerBtn")?.addEventListener("click", () => {
    document.getElementById("addCustomerForm")?.classList.remove("hidden");
    document.getElementById("customerList")?.classList.add("hidden");
  });

  document.getElementById("saveCustomerBtn")?.addEventListener("click", async () => {
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
      const res = await fetch(`${window.API_BASE}/api/owner/add-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      if (res.ok) {
        alert("✅ Customer added successfully!");
        document.getElementById("addCustomerForm")?.classList.add("hidden");
        document.getElementById("customerList")?.classList.remove("hidden");
        loadOwnerDashboard();
      } else {
        const data = await res.json();
        alert("❌ Failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("❌ Error adding customer.");
    }
  });

  document.getElementById("cancelAddBtn")?.addEventListener("click", () => {
    document.getElementById("addCustomerForm")?.classList.add("hidden");
    document.getElementById("customerList")?.classList.remove("hidden");
  });

  document.getElementById("ownerLogoutBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.getElementById("searchCustomer")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allCustomers.filter(c =>
      c.name.toLowerCase().includes(term) || 
      c.phone.includes(term) || 
      c.address.toLowerCase().includes(term)
    );
    updateCustomerCount(filtered.length);
    renderCustomerList(filtered);
  });

  // Setup filters
  document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
  document.getElementById('filterAmount')?.addEventListener('change', applyFilters);
  document.getElementById('filterDate')?.addEventListener('change', applyFilters);
  document.getElementById('sortBy')?.addEventListener('change', applyFilters);

  // Load dashboard
  loadOwnerDashboard();
}

// ✅ Start the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeOwnerDashboard);
