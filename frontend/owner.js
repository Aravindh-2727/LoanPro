// owner.js - FIX DAILY PAYMENT DISPLAY
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

    // 📊 Update Analytics
    updateAnalytics(allCustomers);
    
    // 🎛️ Setup filters and render initial list
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ✅ Render Customer List as Full Width Table - FIXED DAILY PAYMENT
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

// ✅ Render Customer Row for Full Width - FIXED DAILY PAYMENT DISPLAY
function renderCustomerRowFullWidth(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const isPending = customer.calculatedStatus === 'pending';
  const daysStatus = calculateDaysStatus(customer);
  
  // FIX: Calculate daily payment properly - use the value from database or calculate
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;
  
  // Determine if delete button should be shown (only for deactivated customers)
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
        <div class="daily-payment" style="color: #666; font-size: 14px;">Daily: ₹${dailyPayment.toLocaleString()}</div>
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

// ✅ View Customer Details - FIX DAILY PAYMENT DISPLAY
async function viewCustomerDetails(customerId) {
  try {
    console.log("👀 Loading customer details:", customerId);
    currentCustomerId = customerId;
    
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    const customerWithStatus = calculateCustomerStatus(customer);
    
    // Calculate payment totals
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
    const paymentProgress = (totalPaid / customer.totalLoanAmount) * 100;
    const daysStatus = calculateDaysStatus(customerWithStatus);
    const isDeactivated = customerWithStatus.calculatedStatus === 'deactivated';
    const isPending = customerWithStatus.calculatedStatus === 'pending';
    
    // FIX: Calculate daily payment properly
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;
    
    // Show customer detail view
    if (customerDetailView) customerDetailView.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");
    
    // Populate customer details
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    
    // FIX: Update daily payment display
    document.getElementById("custDailyPayment").textContent = `₹${dailyPayment.toLocaleString()}`;
    
    // Update payment and status information
    document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
    document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
    
    // Update status with badges
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
    
    // Show/hide completion banner
    const completionBanner = document.getElementById("completionBanner");
    if (completionBanner) {
      if (isDeactivated) {
        completionBanner.classList.remove("hidden");
        const latestPayment = customer.payments?.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const completionDateElem = document.getElementById("completionDate");
        if (completionDateElem) {
          completionDateElem.textContent = latestPayment ? latestPayment.date : new Date().toISOString().split('T')[0];
        }
      } else {
        completionBanner.classList.add("hidden");
      }
    }
    
    // Show pending warning if overdue
    const pendingWarning = document.getElementById("pendingWarning");
    if (pendingWarning) {
      if (isPending) {
        pendingWarning.classList.remove("hidden");
        document.getElementById("overdueDays").textContent = daysStatus.days;
      } else {
        pendingWarning.classList.add("hidden");
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
    if (!actionButtons) {
      const customerDetailsSection = document.querySelector(".customer-details-section");
      if (customerDetailsSection) {
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
        customerDetailsSection.insertAdjacentHTML('beforeend', actionButtonsHTML);
      }
    } else {
      actionButtons.innerHTML = `
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
      `;
    }
    
    // Render payment history in the new container
    renderPaymentHistoryNew(customer.payments, totalPaid);
    
  } catch (err) {
    console.error("❌ Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

// ✅ Edit Customer - FIX DAILY PAYMENT IN FORM
async function editCustomer(customerId) {
  try {
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    
    // Create edit form
    const editFormHTML = `
      <div class="form-popup" id="editCustomerForm" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1001; width: 90%; max-width: 500px;">
        <h3 style="margin-bottom: 20px; color: #2c3e50;"><i class="fas fa-edit"></i> Edit Customer</h3>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
          <input type="text" id="editCustName" value="${customer.name}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phone:</label>
          <input type="text" id="editCustPhone" value="${customer.phone}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Address:</label>
          <textarea id="editCustAddress" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; height: 80px;">${customer.address}</textarea>
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Loan Start Date:</label>
          <input type="date" id="editCustStart" value="${customer.loanStartDate}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Total Loan Amount (₹):</label>
          <input type="number" id="editCustDue" value="${customer.totalLoanAmount}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Daily Payment (₹):</label>
          <input type="number" id="editCustDaily" value="${customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        </div>

        <div class="form-actions" style="display: flex; gap: 10px;">
          <button id="updateCustomerBtn" class="btn btn-success" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
            <i class="fas fa-check"></i> Update
          </button>
          <button id="cancelEditBtn" class="btn btn-danger" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      </div>
      <div class="overlay" id="editOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', editFormHTML);
    
    // Add event listeners
    document.getElementById('updateCustomerBtn').addEventListener('click', () => updateCustomer(customerId));
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditForm);
    document.getElementById('editOverlay').addEventListener('click', closeEditForm);
    
  } catch (err) {
    console.error("❌ Error loading customer for edit:", err);
    alert("Failed to load customer details for editing.");
  }
}

// ... REST OF THE FILE REMAINS THE SAME ...

// 🚀 Initialize
window.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  console.log("🌐 Final API Base:", window.API_BASE);
  loadOwnerDashboard();
});
