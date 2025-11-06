// owner.js - CLEAN FIXED VERSION
console.log("📊 Owner Dashboard Loaded");

const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

console.log("🌐 Using API Base:", window.API_BASE);

let allCustomers = [];
let currentCustomerId = null;

// ✅ Calculate Customer Status
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

// ✅ Show Loading
function showLoading(containerId, message = "Loading...") {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }
}

// ✅ Show Error
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="loadOwnerDashboard()">Retry</button>
      </div>
    `;
  }
}

// ✅ Update Analytics
function updateAnalytics(customers) {
  const totalCustomers = customers.length;
  const activeLoans = customers.filter(c => c.calculatedStatus === 'active').length;
  const totalLoanAmount = customers.reduce((sum, c) => sum + c.totalLoanAmount, 0);
  const amountReceived = customers.reduce((sum, c) =>
    sum + c.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0), 0
  );

  // Update DOM elements
  const elements = {
    "analyticsTotalCustomers": totalCustomers,
    "analyticsActiveLoans": activeLoans,
    "analyticsTotalLoanAmount": `₹${totalLoanAmount.toLocaleString()}`,
    "analyticsAmountReceived": `₹${amountReceived.toLocaleString()}`
  };

  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = elements[id];
  });
}

// ✅ Load Dashboard
async function loadOwnerDashboard() {
  try {
    showLoading("customersContainer", "Loading customers...");
    
    const response = await fetch(`${window.API_BASE}/api/customers`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.status}`);
    }
    
    const customers = await response.json();
    console.log("✅ Successfully loaded customers:", customers.length);
    
    allCustomers = customers.map(customer => calculateCustomerStatus(customer));
    updateAnalytics(allCustomers);
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ✅ Setup Filters
function setupFilters() {
  const elements = ["searchCustomer", "filterStatus", "filterAmount", "filterDate", "sortBy"];
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("change", applyFilters);
  });
}

// ✅ Apply Filters
function applyFilters() {
  const searchTerm = document.getElementById("searchCustomer")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const sortBy = document.getElementById("sortBy")?.value || "name";

  let filtered = allCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm) || 
                         customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || customer.calculatedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort results
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "amount": return b.totalLoanAmount - a.totalLoanAmount;
      case "amount-asc": return a.totalLoanAmount - b.totalLoanAmount;
      case "date": return new Date(b.loanStartDate) - new Date(a.loanStartDate);
      case "date-old": return new Date(a.loanStartDate) - new Date(b.loanStartDate);
      default: return a.name.localeCompare(b.name);
    }
  });

  updateCustomerCount(filtered.length);
  renderCustomerList(filtered);
}

// ✅ Clear All Filters
function clearAllFilters() {
  document.getElementById("searchCustomer").value = "";
  document.getElementById("filterStatus").value = "all";
  document.getElementById("filterAmount").value = "all";
  document.getElementById("filterDate").value = "all";
  document.getElementById("sortBy").value = "name";
  applyFilters();
}

// ✅ Update Customer Count
function updateCustomerCount(count) {
  const countElement = document.getElementById("customerCount");
  if (countElement) {
    countElement.textContent = `${count} customer${count !== 1 ? 's' : ''} found`;
  }
}

// ✅ Render Customer List
function renderCustomerList(customers) {
  const customersContainer = document.getElementById("customersContainer");
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div class="empty-state-full">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters</p>
      </div>
    `;
    return;
  }

  customersContainer.innerHTML = `
    <div class="customer-list-container-full">
      <table class="customer-table-fullwidth">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Loan Amount</th>
            <th>Paid/Remaining</th>
            <th>Status</th>
            <th>Days Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(customer => renderCustomerRow(customer)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ✅ Render Customer Row
function renderCustomerRow(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const daysStatus = calculateDaysStatus(customer);
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;
  
  return `
    <tr class="customer-row" onclick="viewCustomerDetails('${customer._id}')">
      <td class="customer-info-cell-full">
        <div class="customer-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="customer-details-full">
          <div class="customer-name">${customer.name}</div>
          <div class="customer-address">${customer.address}</div>
        </div>
      </td>
      <td class="contact-info-full">
        <div class="phone-number">
          <i class="fas fa-phone"></i> ${customer.phone}
        </div>
        <div class="start-date">
          <i class="fas fa-calendar"></i> ${customer.loanStartDate}
        </div>
      </td>
      <td class="loan-amount-cell-full">
        <div class="loan-amount">₹${customer.totalLoanAmount.toLocaleString()}</div>
        <div class="daily-payment">Daily: ₹${dailyPayment.toLocaleString()}</div>
      </td>
      <td class="payment-info-full">
        <div class="payment-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(100, (totalPaid / customer.totalLoanAmount) * 100)}%"></div>
          </div>
          <div class="payment-stats">
            <span class="paid">₹${totalPaid.toLocaleString()} paid</span>
            <span class="remaining">₹${remainingAmount.toLocaleString()} left</span>
          </div>
        </div>
      </td>
      <td class="status-cell-full">
        <span class="status-badge status-${customer.calculatedStatus}">
          ${customer.calculatedStatus === 'deactivated' ? 'Completed' : 
            customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
        </span>
      </td>
      <td class="days-status-cell-full">
        ${daysStatus.status === 'completed' ? 
          '<span class="days-completed"><i class="fas fa-trophy"></i> Completed</span>' :
          daysStatus.status === 'overdue' ? 
          `<span class="days-overdue"><i class="fas fa-exclamation-triangle"></i> Overdue: ${daysStatus.days} days</span>` :
          `<span class="days-remaining"><i class="fas fa-clock"></i> ${daysStatus.days} days left</span>`
        }
      </td>
      <td class="actions-cell-full">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    </tr>
  `;
}

// ✅ View Customer Details
async function viewCustomerDetails(customerId) {
  try {
    currentCustomerId = customerId;
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    const customerWithStatus = calculateCustomerStatus(customer);
    
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
    const paymentProgress = (totalPaid / customer.totalLoanAmount) * 100;
    const daysStatus = calculateDaysStatus(customerWithStatus);
    const isDeactivated = customerWithStatus.calculatedStatus === 'deactivated';
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;
    
    // Show detail view
    document.getElementById("customerDetailView").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
    
    // Populate details
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    document.getElementById("custDailyPayment").textContent = `₹${dailyPayment.toLocaleString()}`;
    document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
    document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
    
    // Update status
    document.getElementById("custStatus").innerHTML = `
      <span class="status-${customerWithStatus.calculatedStatus}">
        ${customerWithStatus.calculatedStatus === 'deactivated' ? 
          '<i class="fas fa-check-circle"></i> Completed' : 
          customerWithStatus.calculatedStatus === 'pending' ? 
          '<i class="fas fa-exclamation-triangle"></i> Overdue Pending' : 
          '<i class="fas fa-spinner"></i> Active'}
      </span>
    `;
    
    // Update days status
    const daysStatusElement = document.getElementById("custDaysStatus");
    if (daysStatus.status === 'completed') {
      daysStatusElement.innerHTML = '<span class="status-deactivated"><i class="fas fa-trophy"></i> Loan Completed</span>';
    } else if (daysStatus.status === 'overdue') {
      daysStatusElement.innerHTML = `<span class="status-pending"><i class="fas fa-exclamation-circle"></i> Overdue: ${daysStatus.days} days</span>`;
    } else {
      daysStatusElement.innerHTML = `<span class="status-active"><i class="fas fa-clock"></i> ${daysStatus.days} days remaining</span>`;
    }
    
    // Render payment history
    renderPaymentHistory(customer.payments, totalPaid);
    
  } catch (err) {
    console.error("❌ Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

// ✅ Render Payment History
function renderPaymentHistory(payments, totalPaid) {
  const container = document.getElementById("paymentHistoryContainer");
  if (!container) return;
  
  if (!payments || payments.length === 0) {
    container.innerHTML = `
      <div class="no-payments">
        <i class="fas fa-receipt fa-3x"></i>
        <h4>No Payment History</h4>
        <p>No payments have been recorded yet.</p>
      </div>
    `;
    return;
  }

  const sortedPayments = payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div class="payment-table-container">
      <table class="payment-table-customer">
        <thead>
          <tr>
            <th><i class="fas fa-calendar"></i> Date</th>
            <th><i class="fas fa-money-bill-wave"></i> Amount</th>
            <th><i class="fas fa-chart-bar"></i> Principal</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPayments.map(payment => `
            <tr>
              <td>${payment.date}</td>
              <td class="payment-amount">₹${payment.amount}</td>
              <td class="payment-principal">₹${payment.principal}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="payment-summary">
      <strong>Total Payments: ₹${totalPaid}</strong>
    </div>
  `;
}

// ✅ Back to List
function backToList() {
  document.getElementById("customerDetailView").classList.add("hidden");
  document.getElementById("customerList").classList.remove("hidden");
}

// 🚀 Initialize
window.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  
  document.getElementById("backToListBtn")?.addEventListener("click", backToList);
  document.getElementById("ownerLogoutBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
  
  loadOwnerDashboard();
});
