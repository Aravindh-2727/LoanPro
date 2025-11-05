// owner.js - FIXED WITH FUNCTION DECLARATIONS
console.log("📊 Owner Dashboard Loaded");

// Use the global API_BASE variable with fallback
const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

console.log("🌐 Using API Base:", window.API_BASE);

let allCustomers = [];
let currentCustomerId = null;

// ==================== FUNCTION DECLARATIONS (HOISTED) ====================

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

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="loadOwnerDashboard()">Retry</button>
      </div>
    `;
  }
}

function updateAnalytics(customers) {
  const totalCustomersElem = document.getElementById("analyticsTotalCustomers");
  const activeLoansElem = document.getElementById("analyticsActiveLoans");
  const totalLoanAmountElem = document.getElementById("analyticsTotalLoanAmount");
  const amountReceivedElem = document.getElementById("analyticsAmountReceived");
  const activeLoansReceivedElem = document.getElementById("analyticsActiveLoansReceived");

  if (!totalCustomersElem || !activeLoansElem || !totalLoanAmountElem) return;

  totalCustomersElem.textContent = customers.length;

  const activeLoans = customers.filter(c => c.calculatedStatus === 'active').length;
  activeLoansElem.textContent = activeLoans;

  let totalLoan = 0, amountReceived = 0, activeLoansReceived = 0;
  
  customers.forEach(c => {
    totalLoan += c.totalLoanAmount || 0;
    const customerPaid = c.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    amountReceived += customerPaid;
    
    if (c.calculatedStatus === 'active') {
      activeLoansReceived += customerPaid;
    }
  });

  totalLoanAmountElem.textContent = "₹" + totalLoan.toLocaleString();
  if (amountReceivedElem) amountReceivedElem.textContent = "₹" + amountReceived.toLocaleString();
  if (activeLoansReceivedElem) activeLoansReceivedElem.textContent = "₹" + activeLoansReceived.toLocaleString();
}

function setupFilters() {
  const filters = ['filterStatus', 'filterAmount', 'filterDate', 'sortBy'];
  filters.forEach(filterId => {
    const filter = document.getElementById(filterId);
    if (filter) {
      filter.addEventListener('change', applyFilters);
    }
  });
}

function applyFilters() {
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const amountFilter = document.getElementById('filterAmount')?.value || 'all';
  const dateFilter = document.getElementById('filterDate')?.value || 'all';
  const sortBy = document.getElementById('sortBy')?.value || 'name';
  
  let filteredCustomers = [...allCustomers];
  
  // Status filter
  if (statusFilter !== 'all') {
    filteredCustomers = filteredCustomers.filter(customer => 
      customer.calculatedStatus === statusFilter
    );
  }
  
  // Amount filter
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
  
  // Date filter
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
  
  // Sort
  filteredCustomers = sortCustomers(filteredCustomers, sortBy);
  updateCustomerCount(filteredCustomers.length);
  renderCustomerList(filteredCustomers);
}

function sortCustomers(customers, sortBy) {
  return [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'amount':
        return b.totalLoanAmount - a.totalLoanAmount;
      case 'amount-asc':
        return a.totalLoanAmount - b.totalLoanAmount;
      case 'date':
        return new Date(b.loanStartDate) - new Date(a.loanStartDate);
      case 'date-old':
        return new Date(a.loanStartDate) - new Date(b.loanStartDate);
      case 'days':
        const daysA = calculateDaysStatus(a).days;
        const daysB = calculateDaysStatus(b).days;
        return daysA - daysB;
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

function updateCustomerCount(count) {
  const customerCountElem = document.getElementById('customerCount');
  if (customerCountElem) {
    customerCountElem.textContent = `${count} customer${count !== 1 ? 's' : ''}`;
  }
}

function clearAllFilters() {
  document.getElementById('filterStatus').value = 'all';
  document.getElementById('filterAmount').value = 'all';
  document.getElementById('filterDate').value = 'all';
  document.getElementById('sortBy').value = 'name';
  document.getElementById('searchCustomer').value = '';
  applyFilters();
}

function renderCustomerList(customers) {
  const customersContainer = document.getElementById("customersContainer");
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div class="empty-state-full">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters or add a new customer</p>
        <button class="btn btn-success" onclick="clearAllFilters(); document.getElementById('addCustomerBtn').click()">
          Add New Customer
        </button>
        <button class="btn btn-secondary" onclick="clearAllFilters()">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  let tableHTML = `
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
  `;

  customers.forEach(customer => {
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
    const isDeactivated = customer.calculatedStatus === 'deactivated';
    const daysStatus = calculateDaysStatus(customer);
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount / 100);
    
    tableHTML += `
      <tr class="customer-row" onclick="viewCustomerDetails('${customer._id}')">
        <td class="customer-info-cell-full">
          <div class="customer-info-content">
            <div class="customer-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="customer-details-full">
              <div class="customer-name">${customer.name}</div>
              <div class="customer-address">${customer.address}</div>
            </div>
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
          <div class="daily-payment">Daily: ₹${dailyPayment}</div>
          ${isDeactivated ? '<div class="fully-paid-badge">Fully Paid</div>' : ''}
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
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')">View</button>
          <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editCustomer('${customer._id}')">Edit</button>
          ${isDeactivated ? `
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteCustomer('${customer._id}', '${customer.name}')">Delete</button>
          ` : `
            <button class="btn btn-outline-danger btn-sm" disabled>Delete</button>
          `}
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
    const isPending = customerWithStatus.calculatedStatus === 'pending';
    
    // Show detail view, hide list
    document.getElementById("customerDetailView").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
    
    // Update customer info
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
    document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
    document.getElementById("custDailyPayment").textContent = `₹${customer.dailyPayment || Math.round(customer.totalLoanAmount / 100)}`;
    
    // Update status
    document.getElementById("custStatus").innerHTML = `<span class="status-${customerWithStatus.calculatedStatus}">${customerWithStatus.calculatedStatus}</span>`;
    
    // Update days status
    const daysStatusText = daysStatus.status === 'completed' ? 'Loan Completed' :
                          daysStatus.status === 'overdue' ? `Overdue: ${daysStatus.days} days` :
                          `${daysStatus.days} days remaining`;
    document.getElementById("custDaysStatus").innerHTML = `<span class="status-${daysStatus.status}">${daysStatusText}</span>`;
    
    // Show/hide banners
    document.getElementById("completionBanner").classList.toggle("hidden", !isDeactivated);
    document.getElementById("pendingWarning").classList.toggle("hidden", !isPending);
    
    if (isPending) {
      document.getElementById("overdueDays").textContent = daysStatus.days;
    }
    
    // Update progress
    if (isDeactivated) {
      document.getElementById("progressSection").style.display = 'none';
    } else {
      document.getElementById("progressSection").style.display = 'block';
      document.getElementById("progressFill").style.width = `${paymentProgress}%`;
      document.getElementById("progressPercent").textContent = `${paymentProgress.toFixed(1)}% Paid`;
      document.getElementById("progressAmount").textContent = `(₹${totalPaid.toLocaleString()} of ₹${customer.totalLoanAmount.toLocaleString()})`;
    }
    
    // Render payment history
    renderPaymentHistory(customer.payments, totalPaid);
    
  } catch (err) {
    console.error("Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

function renderPaymentHistory(payments, totalPaid) {
  const container = document.getElementById("paymentHistoryContainer");
  
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

  let tableHTML = `
    <div class="payment-table-container">
      <table class="payment-table-customer">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Principal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  payments.forEach(payment => {
    tableHTML += `
      <tr>
        <td>${payment.date}</td>
        <td class="payment-amount">₹${payment.amount}</td>
        <td class="payment-principal">₹${payment.principal}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deletePayment('${currentCustomerId}', '${payment.date}')">Delete</button>
        </td>
      </tr>
    `;
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
    <div class="payment-summary">
      <strong>Total Payments: ₹${totalPaid.toLocaleString()}</strong>
    </div>
  `;

  container.innerHTML = tableHTML;
}

// Stub functions for other features
function editCustomer(customerId) {
  console.log("Edit customer:", customerId);
  alert("Edit feature coming soon");
}

function addPayment() {
  console.log("Add payment for:", currentCustomerId);
  alert("Add payment feature coming soon");
}

function deletePayment(customerId, paymentDate) {
  console.log("Delete payment:", customerId, paymentDate);
  alert("Delete payment feature coming soon");
}

function deleteCustomer(customerId, customerName) {
  console.log("Delete customer:", customerId, customerName);
  if (confirm(`Are you sure you want to delete ${customerName}?`)) {
    alert("Delete customer feature coming soon");
  }
}

// ==================== MAIN DASHBOARD FUNCTION ====================

async function loadOwnerDashboard() {
  try {
    showLoading("customersContainer", "Loading customers...");
    
    const response = await fetch(`${window.API_BASE}/api/customers`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const customers = await response.json();
    allCustomers = customers.map(calculateCustomerStatus);

    updateAnalytics(allCustomers);
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ==================== INITIALIZATION ====================

function initializeOwnerDashboard() {
  console.log("🏁 Owner Dashboard Initialized");
  
  // Event listeners
  document.getElementById("backToListBtn")?.addEventListener("click", () => {
    document.getElementById("customerDetailView").classList.add("hidden");
    document.getElementById("customerList").classList.remove("hidden");
  });
  
  document.getElementById("addCustomerBtn")?.addEventListener("click", () => {
    document.getElementById("addCustomerForm").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
  });
  
  document.getElementById("cancelAddBtn")?.addEventListener("click", () => {
    document.getElementById("addCustomerForm").classList.add("hidden");
    document.getElementById("customerList").classList.remove("hidden");
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
        alert("Customer added successfully!");
        document.getElementById("addCustomerForm").classList.add("hidden");
        document.getElementById("customerList").classList.remove("hidden");
        loadOwnerDashboard();
      } else {
        const data = await res.json();
        alert("Failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("Error adding customer.");
    }
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

  // Load data
  loadOwnerDashboard();
}

// Start the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeOwnerDashboard);
