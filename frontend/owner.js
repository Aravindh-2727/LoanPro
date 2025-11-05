// owner.js - UPDATED WITH BETTER ERROR HANDLING
console.log("📊 Owner Dashboard Loaded");

// Use the global API_BASE variable with fallback
const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE; // Ensure it's set

console.log("🌐 Using API Base:", window.API_BASE);

let allCustomers = [];
let currentCustomerId = null;

// 🧭 DOM Elements
const customersContainer = document.getElementById("customersContainer");
const searchInput = document.getElementById("searchCustomer");
const addCustomerBtn = document.getElementById("addCustomerBtn");
const addCustomerForm = document.getElementById("addCustomerForm");
const customerDetailView = document.getElementById("customerDetailView");
const customerListSection = document.getElementById("customerList");
const backToListBtn = document.getElementById("backToListBtn");

// ✅ Load Dashboard + Customers with Loading Animation
async function loadOwnerDashboard() {
  try {
    showLoading("customersContainer", "Loading customers...");
    
    console.log("🔄 Loading customers from:", `${window.API_BASE}/api/customers`);
    
    const response = await fetch(`${window.API_BASE}/api/customers`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors'
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);
    
    if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
            const errorData = await response.text();
            console.error("❌ Error response:", errorData);
            if (errorData.includes('<!DOCTYPE')) {
                errorMessage = "Server returned HTML instead of JSON. Check if backend is running correctly.";
            } else {
                errorMessage = errorData;
            }
        } catch (e) {
            // Ignore if we can't parse error response
        }
        throw new Error(`Failed to fetch customers: ${errorMessage}`);
    }
    
    const customers = await response.json();
    console.log("✅ Successfully loaded customers:", customers.length);
    
    // Calculate pending status for each customer
    allCustomers = customers.map(customer => calculateCustomerStatus(customer));

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
  if (!customersContainer) {
    console.error("❌ customersContainer not found");
    return;
  }
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div class="empty-state-full" style="text-align: center; padding: 40px; color: #666;">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters or add a new customer</p>
        <button class="btn btn-success" onclick="clearAllFilters(); document.getElementById('addCustomerBtn').click()">
          <i class="fas fa-plus"></i> Add New Customer
        </button>
        <button class="btn btn-secondary" onclick="clearAllFilters()" style="margin-left: 10px;">
          <i class="fas fa-times"></i> Clear Filters
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
  const isPending = customer.calculatedStatus === 'pending';
  const daysStatus = calculateDaysStatus(customer);
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01);
  const showDeleteButton = isDeactivated;
  
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
        ${isDeactivated ? '<div class="fully-paid-badge" style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-top: 5px; display: inline-block;">Fully Paid</div>' : ''}
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
        ${totalPaid >= customer.totalLoanAmount ? 
          '<div class="payment-complete-indicator" style="color: #27ae60; font-size: 12px; margin-top: 5px;"><i class="fas fa-check-circle"></i> Payment Complete</div>' : 
          ''}
      </td>
      <td class="status-cell-full" style="padding: 15px;">
        <span class="status-badge" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; 
          background: ${customer.calculatedStatus === 'deactivated' ? '#27ae60' : 
                      customer.calculatedStatus === 'pending' ? '#f39c12' : '#3498db'}; 
          color: white;">
          ${customer.calculatedStatus === 'deactivated' ? 'Completed' : 
            customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
          ${isDeactivated ? ' <i class="fas fa-check"></i>' : ''}
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
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editCustomer('${customer._id}')" style="padding: 6px 12px; background: #f39c12; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
          <i class="fas fa-edit"></i> Edit
        </button>
        ${showDeleteButton ? `
          <button class="btn btn-danger btn-sm delete-customer-btn" 
                  onclick="event.stopPropagation(); deleteCustomer('${customer._id}', '${customer.name}')"
                  title="Delete customer record (Loan completed)"
                  style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; margin: 2px; cursor: pointer;">
            <i class="fas fa-trash"></i> Delete
          </button>
        ` : `
          <button class="btn btn-outline-danger btn-sm" disabled title="Delete option available only after loan completion"
                  style="padding: 6px 12px; background: #f8f9fa; color: #6c757d; border: 1px solid #6c757d; border-radius: 4px; margin: 2px; cursor: not-allowed;">
            <i class="fas fa-trash"></i> Delete
          </button>
        `}
      </td>
    </tr>
  `;
}

// ==================== CUSTOMER DETAILS FUNCTIONS ====================

async function viewCustomerDetails(customerId) {
  try {
    console.log("👀 Loading customer details:", customerId);
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
    
    // Show customer detail view immediately
    if (customerDetailView) customerDetailView.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");
    
    // Populate customer details
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
    document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
    document.getElementById("custDailyPayment").textContent = `₹${customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01)}`;
    
    // Update status
    const statusElement = document.getElementById("custStatus");
    statusElement.innerHTML = `
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
    
    // Show/hide banners
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
    
    // Update progress section
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
    
    // Update action buttons
    let actionButtons = document.getElementById("customerActionButtons");
    const actionButtonsHTML = `
      <div style="margin-top: 25px; display: flex; gap: 15px; flex-wrap: wrap;" id="customerActionButtons">
        <button class="btn btn-warning" onclick="editCustomer('${customerId}')" style="padding: 10px 15px;">
          <i class="fas fa-edit"></i> Edit Customer Details
        </button>
        <button class="btn btn-success" onclick="addPayment()" style="padding: 10px 15px;">
          <i class="fas fa-plus"></i> Add Payment
        </button>
        ${isDeactivated ? `
          <button class="btn btn-danger delete-customer-btn" onclick="deleteCustomer('${customerId}', '${customer.name}')" style="padding: 10px 15px;">
            <i class="fas fa-trash"></i> Delete Customer Record
          </button>
        ` : `
          <button class="btn btn-outline-danger" disabled title="Delete option available only after loan completion" style="padding: 10px 15px;">
            <i class="fas fa-trash"></i> Delete Customer Record
          </button>
        `}
      </div>
    `;
    
    if (!actionButtons) {
      const customerDetailsSection = document.querySelector(".customer-details-section");
      if (customerDetailsSection) {
        customerDetailsSection.insertAdjacentHTML('beforeend', actionButtonsHTML);
      }
    } else {
      actionButtons.innerHTML = actionButtonsHTML;
    }
    
    // Render payment history
    renderPaymentHistoryNew(customer.payments, totalPaid);
    
  } catch (err) {
    console.error("❌ Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

function renderPaymentHistoryNew(payments, totalPaid) {
  const container = document.getElementById("paymentHistoryContainer");
  
  if (!payments || payments.length === 0) {
    container.innerHTML = `
      <div class="no-payments" style="text-align: center; padding: 40px; color: var(--gray-medium);">
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
            <th><i class="fas fa-calendar"></i> Date</th>
            <th><i class="fas fa-money-bill-wave"></i> Amount</th>
            <th><i class="fas fa-chart-bar"></i> Principal</th>
            <th><i class="fas fa-cog"></i> Actions</th>
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
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="payment-summary" style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: var(--border-radius); text-align: center;">
      <strong>Total Payments: ₹${totalPaid.toLocaleString()}</strong>
    </div>
  `;
}

// ==================== MAIN DASHBOARD FUNCTION ====================

async function loadOwnerDashboard() {
  try {
    // Remove loading animation - just show empty container
    if (customersContainer) {
      customersContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading customers...</div>';
    }
    
    console.log("🔄 Loading customers from:", `${window.API_BASE}/api/customers`);
    
    const response = await fetch(`${window.API_BASE}/api/customers`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors'
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch customers: HTTP ${response.status}`);
    }
    
    const customers = await response.json();
    console.log("✅ Successfully loaded customers:", customers.length);
    
    // Calculate status for each customer
    allCustomers = customers.map(customer => calculateCustomerStatus(customer));

    // Update Analytics
    updateAnalytics(allCustomers);
    
    // Setup filters and render initial list
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    if (customersContainer) {
      customersContainer.innerHTML = `
        <div class="error-container" style="text-align: center; padding: 40px; color: #e74c3c;">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <h3>Failed to load customers</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="loadOwnerDashboard()">Retry</button>
        </div>
      `;
    }
  }
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  console.log("🌐 Final API Base:", window.API_BASE);
  loadOwnerDashboard();
});

// Logout functionality
document.getElementById("ownerLogoutBtn")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

// ==================== MISSING FUNCTION DECLARATIONS ====================

function editCustomer(customerId) {
  console.log("Edit customer:", customerId);
  alert("Edit customer functionality would go here");
}

function addPayment() {
  console.log("Add payment for:", currentCustomerId);
  alert("Add payment functionality would go here");
}

function deleteCustomer(customerId, customerName) {
  if (confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
    console.log("Delete customer:", customerId);
    alert("Delete customer functionality would go here");
  }
}

function deletePayment(customerId, paymentDate) {
  if (confirm(`Are you sure you want to delete payment from ${paymentDate}?`)) {
    console.log("Delete payment:", customerId, paymentDate);
    alert("Delete payment functionality would go here");
  }
}

// Back to list functionality
document.getElementById("backToListBtn")?.addEventListener("click", () => {
  if (customerDetailView) customerDetailView.classList.add("hidden");
  if (customerListSection) customerListSection.classList.remove("hidden");
});
