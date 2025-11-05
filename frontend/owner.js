// owner.js - COMPLETELY FIXED VERSION
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
          ${customers.map(customer => renderCustomerRowFullWidth(customer)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustomerRowFullWidth(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const daysStatus = calculateDaysStatus(customer);
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount / 100);
  
  return `
    <tr class="customer-row" style="border-bottom: 1px solid #eee; transition: background-color 0.2s; cursor: pointer;" onclick="viewCustomerDetails('${customer._id}')">
      <td class="customer-info-cell-full" style="padding: 15px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="customer-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white;">
            <i class="fas fa-user"></i>
          </div>
          <div class="customer-details-full" style="min-width: 0;">
            <div class="customer-name" style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 4px;">${customer.name}</div>
            <div class="customer-address" style="color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${customer.address}</div>
          </div>
        </div>
      </td>
      <td class="contact-info-full" style="padding: 15px;">
        <div class="phone-number" style="margin-bottom: 5px;">
          <i class="fas fa-phone" style="color: #27ae60; margin-right: 8px;"></i> ${customer.phone}
        </div>
        <div class="start-date" style="color: #666;">
          <i class="fas fa-calendar" style="color: #e74c3c; margin-right: 8px;"></i> ${customer.loanStartDate}
        </div>
      </td>
      <td class="loan-amount-cell-full" style="padding: 15px;">
        <div class="loan-amount" style="font-weight: bold; font-size: 16px; color: #2c3e50; margin-bottom: 5px;">₹${customer.totalLoanAmount.toLocaleString()}</div>
        <div class="daily-payment" style="color: #666; font-size: 14px;">Daily: ₹${dailyPayment}</div>
      </td>
      <td class="payment-info-full" style="padding: 15px;">
        <div class="payment-progress">
          <div class="progress-bar" style="height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div class="progress-fill" style="height: 100%; background: #27ae60; width: ${Math.min(100, (totalPaid / customer.totalLoanAmount) * 100)}%"></div>
          </div>
          <div class="payment-stats" style="display: flex; justify-content: space-between; font-size: 14px;">
            <span class="paid" style="color: #27ae60; font-weight: bold;">₹${totalPaid.toLocaleString()} paid</span>
            <span class="remaining" style="color: #e74c3c; font-weight: bold;">₹${remainingAmount.toLocaleString()} left</span>
          </div>
        </div>
      </td>
      <td class="status-cell-full" style="padding: 15px;">
        <span class="status-badge" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; 
          background: ${customer.calculatedStatus === 'deactivated' ? '#27ae60' : 
                      customer.calculatedStatus === 'pending' ? '#f39c12' : '#3498db'}; 
          color: white;">
          ${customer.calculatedStatus === 'deactivated' ? 'Completed' : 
            customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
        </span>
      </td>
      <td class="days-status-cell-full" style="padding: 15px;">
        ${daysStatus.status === 'completed' ? 
          '<span class="days-completed" style="color: #27ae60; font-weight: bold;"><i class="fas fa-trophy"></i> Completed</span>' :
          daysStatus.status === 'overdue' ? 
          `<span class="days-overdue" style="color: #e74c3c; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> Overdue: ${daysStatus.days} days</span>` :
          `<span class="days-remaining" style="color: #3498db; font-weight: bold;"><i class="fas fa-clock"></i> ${daysStatus.days} days left</span>`
        }
      </td>
      <td class="actions-cell-full" style="padding: 15px;">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')" style="padding: 6px 12px; background: #3498db; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
          View
        </button>
        <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editCustomer('${customer._id}')" style="padding: 6px 12px; background: #f39c12; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
          Edit
        </button>
      </td>
    </tr>
  `;
}

// ==================== CUSTOMER DETAILS FUNCTIONS ====================
async function viewCustomerDetails(customerId) {
  try {
    console.log("🔍 Loading customer details:", customerId);
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
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount / 100);
    
    // Update UI elements
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
        ${customerWithStatus.calculatedStatus === 'deactivated' ? 
          'Completed' : 
          customerWithStatus.calculatedStatus === 'pending' ? 
          'Overdue Pending' : 
          'Active'}
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
    
    // Show/hide banners
    const completionBanner = document.getElementById("completionBanner");
    const pendingWarning = document.getElementById("pendingWarning");
    
    if (completionBanner) {
      completionBanner.classList.toggle("hidden", !isDeactivated);
    }
    
    if (pendingWarning) {
      pendingWarning.classList.toggle("hidden", !isPending);
      if (isPending) {
        document.getElementById("overdueDays").textContent = daysStatus.days;
      }
    }
    
    // Update progress bar
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");
    const progressAmount = document.getElementById("progressAmount");
    
    if (progressFill) progressFill.style.width = `${paymentProgress}%`;
    if (progressPercent) progressPercent.textContent = `${paymentProgress.toFixed(1)}% Paid`;
    if (progressAmount) progressAmount.textContent = `(₹${totalPaid.toLocaleString()} of ₹${customer.totalLoanAmount.toLocaleString()})`;
    
    // Render payment history
    renderPaymentHistoryNew(customer.payments, totalPaid);
    
    // Show detail view
    document.getElementById("customerDetailView").classList.remove("hidden");
    document.getElementById("customerList").classList.add("hidden");
    
  } catch (err) {
    console.error("❌ Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

function renderPaymentHistoryNew(payments, totalPaid) {
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
          </tr>
        </thead>
        <tbody>
          ${payments.map(payment => `
            <tr>
              <td>${payment.date}</td>
              <td class="payment-amount">₹${payment.amount}</td>
              <td class="payment-principal">₹${payment.principal}</td>
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

// ==================== MAIN DASHBOARD FUNCTION ====================
async function loadOwnerDashboard() {
  try {
    console.log("🔄 Starting owner dashboard load...");
    console.log("🌐 API Base URL:", window.API_BASE);
    
    showLoading("customersContainer", "Loading customers...");
    
    console.log("📡 Loading customers from:", `${window.API_BASE}/api/customers`);
    
    const response = await fetch(`${window.API_BASE}/api/customers`);
    
    console.log("📊 Response status:", response.status);
    console.log("📊 Response ok:", response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch customers: HTTP ${response.status}`);
    }
    
    const customers = await response.json();
    console.log("✅ Successfully loaded customers:", customers.length);
    
    // Process customers with status calculation
    allCustomers = customers.map(customer => calculateCustomerStatus(customer));
    
    console.log("📈 Updating analytics...");
    updateAnalytics(allCustomers);
    
    console.log("🎨 Rendering customer list...");
    renderCustomerList(allCustomers);
    
    console.log("🏁 Owner dashboard loaded successfully!");
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ==================== PLACEHOLDER FUNCTIONS ====================
function editCustomer(customerId) {
  alert("Edit feature coming soon for customer: " + customerId);
}

function addPayment() {
  alert("Add payment feature coming soon");
}

function deletePayment(customerId, paymentDate) {
  alert("Delete payment feature coming soon");
}

function deleteCustomer(customerId, customerName) {
  alert("Delete customer feature coming soon");
}

function clearAllFilters() {
  alert("Clear filters feature coming soon");
  loadOwnerDashboard();
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

  if (backToListBtn) {
    backToListBtn.addEventListener("click", () => {
      document.getElementById("customerDetailView").classList.add("hidden");
      document.getElementById("customerList").classList.remove("hidden");
      currentCustomerId = null;
    });
  }

  if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", () => {
      document.getElementById("addCustomerForm").classList.remove("hidden");
      document.getElementById("customerList").classList.add("hidden");
      const today = new Date().toISOString().split('T')[0];
      document.getElementById("newCustStart").value = today;
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
      const newCustomer = { 
        name, 
        phone, 
        address, 
        loanStartDate: startDate, 
        totalLoanAmount, 
        dailyPayment, 
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
  }

  if (cancelAddBtn) {
    cancelAddBtn.addEventListener("click", () => {
      document.getElementById("addCustomerForm").classList.add("hidden");
      document.getElementById("customerList").classList.remove("hidden");
    });
  }

  if (ownerLogoutBtn) {
    ownerLogoutBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Load dashboard
  console.log("🚀 Starting dashboard load...");
  loadOwnerDashboard();
});
