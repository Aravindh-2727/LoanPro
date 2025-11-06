// owner.js - CORRECTED VERSION
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

    // 📊 Update Analytics
    updateAnalytics(allCustomers);
    
    // 🎛 Setup filters and render initial list
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

// ✅ Calculate Customer Status (Active, Pending, or Deactivated)
function calculateCustomerStatus(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  // If fully paid, status is deactivated
  if (totalPaid >= customer.totalLoanAmount) {
    return { ...customer, calculatedStatus: 'deactivated' };
  }
  
  // Calculate days since loan start
  const loanStartDate = new Date(customer.loanStartDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today - loanStartDate) / (1000 * 60 * 60 * 24));
  
  // If more than 100 days and not fully paid, status is pending
  if (daysSinceStart > 100) {
    return { ...customer, calculatedStatus: 'pending' };
  }
  
  // Otherwise, status is active
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

// ✅ Show Loading Animation
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

// ✅ Show Error Message
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

// ✅ Update Analytics - ENHANCED VERSION
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
    
    // Calculate amount received only from active loans
    if (c.calculatedStatus === 'active') {
      activeLoansReceived += customerPaid;
    }
  });

  if (totalLoanAmountElem) totalLoanAmountElem.textContent = "₹" + totalLoan.toLocaleString();
  if (amountReceivedElem) amountReceivedElem.textContent = "₹" + amountReceived.toLocaleString();
  if (activeLoansReceivedElem) activeLoansReceivedElem.textContent = "₹" + activeLoansReceived.toLocaleString();
}

// ✅ Filter and Sort Functionality
function setupFilters() {
    const filterStatus = document.getElementById('filterStatus');
    const filterAmount = document.getElementById('filterAmount');
    const filterDate = document.getElementById('filterDate');
    const sortBy = document.getElementById('sortBy');
    
    // Add event listeners to all filters
    [filterStatus, filterAmount, filterDate, sortBy].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
        }
    });
}

// ✅ Apply All Filters
function applyFilters() {
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const amountFilter = document.getElementById('filterAmount')?.value || 'all';
    const dateFilter = document.getElementById('filterDate')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'name';
    
    let filteredCustomers = [...allCustomers];
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filteredCustomers = filteredCustomers.filter(customer => 
            customer.calculatedStatus === statusFilter
        );
    }
    
    // Apply amount filter
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
    
    // Apply date filter
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
    
    // Apply sorting
    filteredCustomers = sortCustomers(filteredCustomers, sortBy);
    
    // Update customer count
    updateCustomerCount(filteredCustomers.length);
    
    // Render filtered list
    renderCustomerList(filteredCustomers);
}

// ✅ Sort Customers
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

// ✅ Update Customer Count
function updateCustomerCount(count) {
    const customerCountElem = document.getElementById('customerCount');
    if (customerCountElem) {
        customerCountElem.textContent = `${count} customer${count !== 1 ? 's' : ''}`;
    }
}

// ✅ Clear All Filters
function clearAllFilters() {
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterAmount').value = 'all';
    document.getElementById('filterDate').value = 'all';
    document.getElementById('sortBy').value = 'name';
    document.getElementById('searchCustomer').value = '';
    
    applyFilters();
}

// ✅ Render Customer List as Full Width Table
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

// ✅ Render Customer Row for Full Width
function renderCustomerRowFullWidth(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const isPending = customer.calculatedStatus === 'pending';
  const daysStatus = calculateDaysStatus(customer);
  
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
        <div class="daily-payment" style="color: #666; font-size: 14px;">Daily: ₹${customer.dailyPayment}</div>
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

// ✅ Enhanced Search Box Functionality with Filters
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    if (term === '') {
      applyFilters(); // Show filtered results when search is cleared
    } else {
      // Search within currently filtered results
      const statusFilter = document.getElementById('filterStatus')?.value || 'all';
      const amountFilter = document.getElementById('filterAmount')?.value || 'all';
      const dateFilter = document.getElementById('filterDate')?.value || 'all';
      
      let filtered = allCustomers.filter(c =>
        c.name.toLowerCase().includes(term) || 
        c.phone.includes(term) ||
        c.address.toLowerCase().includes(term)
      );
      
      // Apply current filters to search results
      if (statusFilter !== 'all') {
        filtered = filtered.filter(customer => 
          customer.calculatedStatus === statusFilter
        );
      }
      
      if (amountFilter !== 'all') {
        filtered = filtered.filter(customer => {
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
        filtered = filtered.filter(customer => {
          const startDate = new Date(customer.loanStartDate);
          const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
          
          switch (dateFilter) {
            case 'recent': return daysSinceStart <= 30;
            case 'old': return daysSinceStart > 30;
            default: return true;
          }
        });
      }
      
      updateCustomerCount(filtered.length);
      renderCustomerList(filtered);
    }
  });
}

// ✅ Edit Customer Function
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
          <input type="number" id="editCustDaily" value="${customer.dailyPayment}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
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

// ✅ Update Customer
async function updateCustomer(customerId) {
  const name = document.getElementById("editCustName").value.trim();
  const phone = document.getElementById("editCustPhone").value.trim();
  const address = document.getElementById("editCustAddress").value.trim();
  const loanStartDate = document.getElementById("editCustStart").value;
  const totalLoanAmount = parseFloat(document.getElementById("editCustDue").value) || 0;
  const dailyPayment = parseFloat(document.getElementById("editCustDaily").value) || 0;

  // Validation
  if (!name || !phone) {
    alert("Name and phone are required!");
    return;
  }

  if (phone.length < 10) {
    alert("Please enter a valid phone number (at least 10 digits)");
    return;
  }

  const updatedCustomer = {
    name: name,
    phone: phone,
    address: address,
    loanStartDate: loanStartDate,
    totalLoanAmount: totalLoanAmount,
    dailyPayment: dailyPayment
  };

  try {
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedCustomer),
    });

    if (res.ok) {
      alert("✅ Customer updated successfully!");
      closeEditForm();
      loadOwnerDashboard();
    } else {
      const errorData = await res.json();
      alert("❌ Failed to update customer: " + (errorData.message || "Unknown error"));
    }
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    alert("❌ Failed to update customer. Check console for details.");
  }
}

// ✅ Close Edit Form
function closeEditForm() {
  const editForm = document.getElementById('editCustomerForm');
  const overlay = document.getElementById('editOverlay');
  
  if (editForm) editForm.remove();
  if (overlay) overlay.remove();
}

// ✅ Add New Customer - Show Form
if (addCustomerBtn) {
  addCustomerBtn.addEventListener("click", () => {
    console.log("➕ Add Customer button clicked");
    addCustomerForm.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");
    
    // Set today's date as default for start date
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById("newCustStart");
    if (startDateInput) startDateInput.value = today;
  });
}

// ✅ Save New Customer
document.getElementById("saveCustomerBtn")?.addEventListener("click", async () => {
  console.log("💾 Save Customer button clicked");
  
  const name = document.getElementById("newCustName").value.trim();
  const phone = document.getElementById("newCustPhone").value.trim();
  const address = document.getElementById("newCustAddress").value.trim();
  const startDate = document.getElementById("newCustStart").value;
  const totalLoanAmount = parseFloat(document.getElementById("newCustDue").value) || 0;

  // Validation
  if (!name || !phone) {
    alert("Name and phone are required!");
    return;
  }

  if (phone.length < 10) {
    alert("Please enter a valid phone number (at least 10 digits)");
    return;
  }

  const newCustomer = {
    name: name,
    phone: phone,
    address: address,
    loanStartDate: startDate,
    totalLoanAmount: totalLoanAmount,
    dailyPayment: Math.round(totalLoanAmount * 0.01) || 100,
    payments: [],
    status: "active"
  };

  try {
    const res = await fetch(`${window.API_BASE}/api/owner/add-customer`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(newCustomer),
    });

    const responseData = await res.json();
    
    if (res.ok) {
      alert("✅ Customer added successfully!");
      
      // Hide form and show customer list
      addCustomerForm.classList.add("hidden");
      if (customerListSection) customerListSection.classList.remove("hidden");
      
      // Clear form
      document.getElementById("newCustName").value = "";
      document.getElementById("newCustPhone").value = "";
      document.getElementById("newCustAddress").value = "";
      document.getElementById("newCustStart").value = "";
      document.getElementById("newCustDue").value = "";
      
      // Reload the customer list
      loadOwnerDashboard();
    } else {
      alert("❌ Failed to add customer: " + (responseData.message || "Unknown error"));
    }
  } catch (err) {
    console.error("❌ Error adding customer:", err);
    alert("❌ Failed to add customer. Check console for details.");
  }
});

// ✅ Cancel Add Customer
document.getElementById("cancelAddBtn")?.addEventListener("click", () => {
  console.log("❌ Cancel button clicked");
  addCustomerForm.classList.add("hidden");
  if (customerListSection) customerListSection.classList.remove("hidden");
  
  // Clear form
  document.getElementById("newCustName").value = "";
  document.getElementById("newCustPhone").value = "";
  document.getElementById("newCustAddress").value = "";
  document.getElementById("newCustStart").value = "";
  document.getElementById("newCustDue").value = "";
});

// ✅ View Customer Details - UPDATED with Customer Dashboard Format
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
    
    // Show customer detail view
    if (customerDetailView) customerDetailView.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");
    
    // Populate customer details
    document.getElementById("custName").textContent = customer.name;
    document.getElementById("custPhone").textContent = customer.phone;
    document.getElementById("custAddress").textContent = customer.address;
    document.getElementById("custStart").textContent = customer.loanStartDate;
    document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
    
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

// ✅ New Payment History Renderer for Single Column Layout
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

// ✅ Add Payment - ENHANCED (prevents overpayment)
async function addPayment() {
  try {
    // Check if loan is deactivated
    const customerRes = await fetch(`${window.API_BASE}/api/customers/${currentCustomerId}`);
    const customer = await customerRes.json();
    const customerWithStatus = calculateCustomerStatus(customer);
    
    if (customerWithStatus.calculatedStatus === 'deactivated') {
      alert("This loan has already been deactivated. No further payments can be added.");
      return;
    }
    
    const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
    
    const amount = parseFloat(prompt(`Enter payment amount (Remaining: ₹${remainingAmount}):`));
    
    if (!amount || amount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }
    
    // Prevent overpayment
    if (amount > remainingAmount) {
      alert(`Payment amount (₹${amount}) exceeds remaining amount (₹${remainingAmount}). Please enter a smaller amount.`);
      return;
    }
    
    // Simple payment without interest calculation
    const principal = amount;
    const today = new Date().toISOString().split('T')[0];
    
    const paymentData = {
      date: today,
      amount: amount,
      principal: principal
    };
    
    const res = await fetch(`${window.API_BASE}/api/customers/${currentCustomerId}/payments`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(paymentData),
    });
    
    if (res.ok) {
      alert("✅ Payment added successfully!");
      // Reload customer details to show updated payment history and status
      viewCustomerDetails(currentCustomerId);
    } else {
      const errorData = await res.json();
      alert("❌ Failed to add payment: " + (errorData.message || "Unknown error"));
    }
  } catch (err) {
    console.error("❌ Error adding payment:", err);
    alert("❌ Failed to add payment. Check console for details.");
  }
}

// ✅ Delete Payment
async function deletePayment(customerId, paymentDate) {
  if (!confirm(`Are you sure you want to delete payment from ${paymentDate}?`)) {
    return;
  }
  
  try {
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}/payments/${encodeURIComponent(paymentDate)}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      alert("✅ Payment deleted successfully!");
      viewCustomerDetails(currentCustomerId);
    } else {
      alert("❌ Failed to delete payment");
    }
  } catch (err) {
    console.error("❌ Error deleting payment:", err);
    alert("❌ Failed to delete payment.");
  }
}

// ✅ Delete Customer - ONLY ALLOWED FOR DEACTIVATED CUSTOMERS
async function deleteCustomer(customerId, customerName) {
  // Get customer details to check status
  try {
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    const customerWithStatus = calculateCustomerStatus(customer);
    
    // Only allow deletion for deactivated customers
    if (customerWithStatus.calculatedStatus !== 'deactivated') {
      alert(`❌ Cannot delete customer "${customerName}". Only completed/deactivated loans can be removed.`);
      return;
    }
    
    if (!confirm(`Are you sure you want to permanently delete customer "${customerName}"? This action cannot be undone.`)) {
      return;
    }
    
    showLoading("customersContainer", "Deleting customer...");
    
    const deleteRes = await fetch(`${window.API_BASE}/api/customers/${customerId}`, {
      method: "DELETE",
    });
    
    if (deleteRes.ok) {
      alert("✅ Customer deleted successfully!");
      loadOwnerDashboard();
    } else {
      throw new Error("Failed to delete customer");
    }
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    alert("❌ Failed to delete customer.");
    loadOwnerDashboard(); // Reload to refresh the list
  }
}

// ✅ Back to List
if (backToListBtn) {
  backToListBtn.addEventListener("click", () => {
    if (customerDetailView) customerDetailView.classList.add("hidden");
    if (customerListSection) customerListSection.classList.remove("hidden");
    currentCustomerId = null;
  });
}

// 🚀 Initialize
window.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  console.log("🌐 Final API Base:", window.API_BASE);
  loadOwnerDashboard();
});

// Logout functionality
document.getElementById("ownerLogoutBtn")?.addEventListener("click", () => {
  window.location.href = "index.html";
});
