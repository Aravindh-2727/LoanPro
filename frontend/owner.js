// owner.js - COMPLETELY CORRECTED VERSION
console.log("📊 Owner Dashboard Loaded");

// Use the global API_BASE variable with fallback
const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

console.log("🌐 Using API Base:", window.API_BASE);

let allCustomers = [];
let currentCustomerId = null;

// ==================== UTILITY FUNCTIONS ====================

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
      <div class="loading-container" style="text-align: center; padding: 40px; color: #666;">
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p>${message}</p>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
  }
}

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-container" style="padding: 25px; background: #f8d7da; color: #721c24; border-radius: 8px; text-align: center; margin: 20px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
        <p style="margin: 10px 0; font-weight: bold;">${message}</p>
        <button class="btn btn-primary" onclick="loadOwnerDashboard()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}

// ==================== ANALYTICS FUNCTIONS ====================

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

// ==================== FILTER AND SORT FUNCTIONS ====================

function setupFilters() {
  const filterStatus = document.getElementById('filterStatus');
  const filterAmount = document.getElementById('filterAmount');
  const filterDate = document.getElementById('filterDate');
  const sortBy = document.getElementById('sortBy');
  
  [filterStatus, filterAmount, filterDate, sortBy].forEach(filter => {
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

// ==================== CUSTOMER LIST RENDERING ====================

function renderCustomerList(customers) {
  const customersContainer = document.getElementById("customersContainer");
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div class="empty-state-full" style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters or add a new customer</p>
        <button class="btn btn-success" onclick="clearAllFilters(); document.getElementById('addCustomerBtn').click()">
          Add New Customer
        </button>
        <button class="btn btn-secondary" onclick="clearAllFilters()" style="margin-left: 10px;">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  customersContainer.innerHTML = `
    <div class="customer-list-container-full" style="width: 100%; overflow-x: auto;">
      <table class="customer-table-fullwidth" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #2c3e50; color: white;">
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Customer</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Contact</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Loan Amount</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Paid/Remaining</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Status</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Days Status</th>
            <th style="padding: 15px; text-align: left; border-bottom: 2px solid #34495e;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(customer => renderCustomerRow(customer)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustomerRow(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const daysStatus = calculateDaysStatus(customer);
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount / 100);
  
  return `
    <tr class="customer-row" style="border-bottom: 1px solid #eee; transition: background-color 0.2s; cursor: pointer;" onclick="viewCustomerDetails('${customer._id}')">
      <td style="padding: 15px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white;">
            <i class="fas fa-user"></i>
          </div>
          <div style="min-width: 0;">
            <div style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 4px;">${customer.name}</div>
            <div style="color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${customer.address}</div>
          </div>
        </div>
      </td>
      <td style="padding: 15px;">
        <div style="margin-bottom: 5px;">
          <i class="fas fa-phone" style="color: #27ae60; margin-right: 8px;"></i> ${customer.phone}
        </div>
        <div style="color: #666;">
          <i class="fas fa-calendar" style="color: #e74c3c; margin-right: 8px;"></i> ${customer.loanStartDate}
        </div>
      </td>
      <td style="padding: 15px;">
        <div style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 5px;">₹${customer.totalLoanAmount.toLocaleString()}</div>
        <div style="color: #666; font-size: 14px;">Daily: ₹${dailyPayment}</div>
        ${isDeactivated ? '<div style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-top: 5px; display: inline-block;">Fully Paid</div>' : ''}
      </td>
      <td style="padding: 15px;">
        <div>
          <div style="height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="height: 100%; background: #27ae60; width: ${Math.min(100, (totalPaid / customer.totalLoanAmount) * 100)}%"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: #27ae60; font-weight: bold;">₹${totalPaid.toLocaleString()} paid</span>
            <span style="color: #e74c3c; font-weight: bold;">₹${remainingAmount.toLocaleString()} left</span>
          </div>
        </div>
      </td>
      <td style="padding: 15px;">
        <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; 
          background: ${customer.calculatedStatus === 'deactivated' ? '#27ae60' : 
                      customer.calculatedStatus === 'pending' ? '#f39c12' : '#3498db'}; 
          color: white;">
          ${customer.calculatedStatus === 'deactivated' ? 'Completed' : 
            customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
        </span>
      </td>
      <td style="padding: 15px;">
        ${daysStatus.status === 'completed' ? 
          '<span style="color: #27ae60; font-weight: bold;"><i class="fas fa-trophy"></i> Completed</span>' :
          daysStatus.status === 'overdue' ? 
          `<span style="color: #e74c3c; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> Overdue: ${daysStatus.days} days</span>` :
          `<span style="color: #3498db; font-weight: bold;"><i class="fas fa-clock"></i> ${daysStatus.days} days left</span>`
        }
      </td>
      <td style="padding: 15px;">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')" style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
          View
        </button>
        <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editCustomer('${customer._id}')" style="padding: 6px 12px; background: #f39c12; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
          Edit
        </button>
        ${isDeactivated ? `
          <button class="btn btn-danger btn-sm" 
                  onclick="event.stopPropagation(); deleteCustomer('${customer._id}', '${customer.name}')"
                  style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
            Delete
          </button>
        ` : `
          <button class="btn btn-outline-danger btn-sm" disabled
                  style="padding: 6px 12px; background: #f8f9fa; color: #6c757d; border: 1px solid #6c757d; border-radius: 4px; margin: 2px; cursor: not-allowed;">
            Delete
          </button>
        `}
      </td>
    </tr>
  `;
}

// ==================== CUSTOMER DETAILS FUNCTIONS ====================

async function viewCustomerDetails(customerId) {
  try {
    console.log("Loading customer details:", customerId);
    currentCustomerId = customerId;
    
    const customerDetailView = document.getElementById("customerDetailView");
    const customerListSection = document.getElementById("customerList");
    
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
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount / 100);
    
    if (customerDetailView) customerDetailView.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");
    
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
    document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
    document.getElementById("custDailyPayment").textContent = `₹${dailyPayment}`;
    
    const statusElement = document.getElementById("custStatus");
    statusElement.innerHTML = `
      <span class="status-${customerWithStatus.calculatedStatus}">
        ${customerWithStatus.calculatedStatus === 'deactivated' ? 'Completed' : 
          customerWithStatus.calculatedStatus === 'pending' ? 'Overdue Pending' : 'Active'}
      </span>
    `;
    
    const daysStatusElement = document.getElementById("custDaysStatus");
    if (daysStatus.status === 'completed') {
      daysStatusElement.innerHTML = '<span class="status-deactivated">Loan Completed</span>';
    } else if (daysStatus.status === 'overdue') {
      daysStatusElement.innerHTML = `<span class="status-pending">Overdue: ${daysStatus.days} days</span>`;
    } else {
      daysStatusElement.innerHTML = `<span class="status-active">${daysStatus.days} days remaining</span>`;
    }
    
    const completionBanner = document.getElementById("completionBanner");
    const pendingWarning = document.getElementById("pendingWarning");
    
    if (completionBanner) {
      completionBanner.classList.toggle("hidden", !isDeactivated);
      if (isDeactivated) {
        const latestPayment = customer.payments?.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const completionDateElem = document.getElementById("completionDate");
        if (completionDateElem) {
          completionDateElem.textContent = latestPayment ? latestPayment.date : new Date().toISOString().split('T')[0];
        }
      }
    }
    
    if (pendingWarning) {
      pendingWarning.classList.toggle("hidden", !isPending);
      if (isPending) {
        document.getElementById("overdueDays").textContent = daysStatus.days;
      }
    }
    
    const progressSection = document.getElementById("progressSection");
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");
    const progressAmount = document.getElementById("progressAmount");
    
    if (isDeactivated) {
      progressSection.style.display = 'none';
    } else {
      progressSection.style.display = 'block';
      progressFill.style.width = `${paymentProgress}%`;
      progressPercent.textContent = `${paymentProgress.toFixed(1)}% Paid`;
      progressAmount.textContent = `(₹${totalPaid.toLocaleString()} of ₹${customer.totalLoanAmount.toLocaleString()})`;
    }
    
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
      <div class="no-payments" style="text-align: center; padding: 40px; color: #888;">
        <i class="fas fa-receipt fa-3x" style="margin-bottom: 15px; opacity: 0.5;"></i>
        <h4>No Payment History</h4>
        <p>No payments have been recorded yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
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
          ${payments.map(payment => `
            <tr>
              <td>${payment.date}</td>
              <td class="payment-amount">₹${payment.amount}</td>
              <td class="payment-principal">₹${payment.principal}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deletePayment('${currentCustomerId}', '${payment.date}')" style="padding: 5px 10px;">
                  Delete
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="payment-summary" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
      <strong>Total Payments: ₹${totalPaid.toLocaleString()}</strong>
    </div>
  `;
}

// ==================== CUSTOMER MANAGEMENT FUNCTIONS ====================

async function editCustomer(customerId) {
  console.log("Edit customer:", customerId);
  // Implementation for editing customer
}

async function addPayment() {
  console.log("Add payment for:", currentCustomerId);
  // Implementation for adding payment
}

async function deletePayment(customerId, paymentDate) {
  console.log("Delete payment:", customerId, paymentDate);
  // Implementation for deleting payment
}

async function deleteCustomer(customerId, customerName) {
  console.log("Delete customer:", customerId, customerName);
  // Implementation for deleting customer
}

// ==================== MAIN DASHBOARD FUNCTION ====================

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
    
    allCustomers = customers.map(calculateCustomerStatus);

    updateAnalytics(allCustomers);
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  console.log("🌐 Final API Base:", window.API_BASE);

  // Setup event listeners
  const backToListBtn = document.getElementById("backToListBtn");
  const addCustomerBtn = document.getElementById("addCustomerBtn");
  const saveCustomerBtn = document.getElementById("saveCustomerBtn");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const ownerLogoutBtn = document.getElementById("ownerLogoutBtn");
  const searchInput = document.getElementById("searchCustomer");

  if (backToListBtn) {
    backToListBtn.addEventListener("click", () => {
      document.getElementById("customerDetailView")?.classList.add("hidden");
      document.getElementById("customerList")?.classList.remove("hidden");
      currentCustomerId = null;
    });
  }

  if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", () => {
      document.getElementById("addCustomerForm")?.classList.remove("hidden");
      document.getElementById("customerList")?.classList.add("hidden");
      const today = new Date().toISOString().split('T')[0];
      document.getElementById("newCustStart")?.setAttribute("value", today);
    });
  }

  if (saveCustomerBtn) {
    saveCustomerBtn.addEventListener("click", async () => {
      const name = document.getElementById("newCustName").value.trim();
      const phone = document.getElementById("newCustPhone").value.trim();
      const address = document.getElementById("newCustAddress").value.trim();
      const startDate = document.getElementById("newCustStart").value;
      const totalLoanAmount = parseFloat(document.getElementById("newCustDue").value) || 0;

      if (!name || !phone || phone.length < 10) {
        alert("Valid name and 10-digit phone are required!");
        return;
      }

      const dailyPayment = Math.round(totalLoanAmount / 100);
      const newCustomer = { name, phone, address, loanStartDate: startDate, totalLoanAmount, dailyPayment, payments: [], status: "active" };

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
  }

  if (cancelAddBtn) {
    cancelAddBtn.addEventListener("click", () => {
      document.getElementById("addCustomerForm")?.classList.add("hidden");
      document.getElementById("customerList")?.classList.remove("hidden");
    });
  }

  if (ownerLogoutBtn) {
    ownerLogoutBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = allCustomers.filter(c =>
        c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.address.toLowerCase().includes(term)
      );
      updateCustomerCount(filtered.length);
      renderCustomerList(filtered);
    });
  }

  // Load dashboard
  loadOwnerDashboard();
});
