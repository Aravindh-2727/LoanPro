// owner.js - COMPLETE FIXED VERSION
console.log("📊 Owner Dashboard Loaded");

const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
window.API_BASE = API_BASE;

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

// ✅ Initialize Dashboard
async function loadOwnerDashboard() {
  try {
    showLoading("customersContainer", "Loading customers...");
    
    const response = await fetch(`${window.API_BASE}/api/customers`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
        mode: 'cors'
    });
    
    if (!response.ok) throw new Error(`Failed to fetch customers: ${response.status}`);
    
    const customers = await response.json();
    allCustomers = customers.map(customer => calculateCustomerStatus(customer));

    updateAnalytics(allCustomers);
    setupFilters();
    applyFilters();
    
  } catch (err) {
    console.error("❌ Error loading owner dashboard:", err);
    showError("customersContainer", `Failed to load customers: ${err.message}`);
  }
}

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

// ✅ Update Analytics
function updateAnalytics(customers) {
  const totalCustomers = customers.length;
  const activeLoans = customers.filter(c => c.calculatedStatus === 'active').length;
  const totalLoanAmount = customers.reduce((sum, c) => sum + c.totalLoanAmount, 0);
  
  const amountReceived = customers.reduce((sum, c) =>
    sum + c.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0), 0
  );
  
  const activeLoansReceived = customers
    .filter(c => c.calculatedStatus === 'active')
    .reduce((sum, c) => sum + c.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0), 0);

  document.getElementById("analyticsTotalCustomers").textContent = totalCustomers;
  document.getElementById("analyticsActiveLoans").textContent = activeLoans;
  document.getElementById("analyticsTotalLoanAmount").textContent = `₹${totalLoanAmount.toLocaleString()}`;
  document.getElementById("analyticsAmountReceived").textContent = `₹${amountReceived.toLocaleString()}`;
  document.getElementById("analyticsActiveLoansReceived").textContent = `₹${activeLoansReceived.toLocaleString()}`;
}

// ✅ Setup Filters
function setupFilters() {
  const searchInput = document.getElementById("searchCustomer");
  const filterStatus = document.getElementById("filterStatus");
  const filterAmount = document.getElementById("filterAmount");
  const filterDate = document.getElementById("filterDate");
  const sortBy = document.getElementById("sortBy");

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (filterStatus) filterStatus.addEventListener("change", applyFilters);
  if (filterAmount) filterAmount.addEventListener("change", applyFilters);
  if (filterDate) filterDate.addEventListener("change", applyFilters);
  if (sortBy) sortBy.addEventListener("change", applyFilters);
}

// ✅ Apply Filters
function applyFilters() {
  const searchTerm = document.getElementById("searchCustomer")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const amountFilter = document.getElementById("filterAmount")?.value || "all";
  const dateFilter = document.getElementById("filterDate")?.value || "all";
  const sortBy = document.getElementById("sortBy")?.value || "name";

  let filtered = allCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm) || 
                         customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || customer.calculatedStatus === statusFilter;
    
    let matchesAmount = true;
    if (amountFilter === "high") matchesAmount = customer.totalLoanAmount >= 50000;
    if (amountFilter === "medium") matchesAmount = customer.totalLoanAmount >= 25000 && customer.totalLoanAmount < 50000;
    if (amountFilter === "low") matchesAmount = customer.totalLoanAmount < 25000;
    
    let matchesDate = true;
    if (dateFilter === "recent") {
      const loanDate = new Date(customer.loanStartDate);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = loanDate >= thirtyDaysAgo;
    } else if (dateFilter === "old") {
      const loanDate = new Date(customer.loanStartDate);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = loanDate < thirtyDaysAgo;
    }

    return matchesSearch && matchesStatus && matchesAmount && matchesDate;
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
      case "days": 
        const daysA = calculateDaysStatus(a).days;
        const daysB = calculateDaysStatus(b).days;
        return daysA - daysB;
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
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = `
      <div class="empty-state-full">
        <i class="fas fa-users fa-3x"></i>
        <h3>No customers found</h3>
        <p>Try adjusting your filters or add a new customer</p>
        <button class="btn btn-success" onclick="clearAllFilters(); showAddCustomerForm()">
          <i class="fas fa-plus"></i> Add New Customer
        </button>
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
          ${customers.map(customer => renderCustomerRowFullWidth(customer)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ✅ Render Customer Row
function renderCustomerRowFullWidth(customer) {
  const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
  const isDeactivated = customer.calculatedStatus === 'deactivated';
  const daysStatus = calculateDaysStatus(customer);
  const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;
  const showDeleteButton = isDeactivated;
  
  return `
    <tr class="customer-row" onclick="viewCustomerDetails('${customer._id}')">
      <td class="customer-info-cell-full">
        <div style="display: flex; align-items: center; gap: 12px;">
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
        <div class="daily-payment">Daily: ₹${dailyPayment.toLocaleString()}</div>
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
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); viewCustomerDetails('${customer._id}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); editCustomer('${customer._id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        ${showDeleteButton ? `
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteCustomer('${customer._id}', '${customer.name}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        ` : ''}
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
    const isPending = customerWithStatus.calculatedStatus === 'pending';
    const dailyPayment = customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01) || 100;

    // Show detail view
    if (customerDetailView) customerDetailView.classList.remove("hidden");
    if (customerListSection) customerListSection.classList.add("hidden");

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

    // Show/hide banners
    document.getElementById("completionBanner").classList.toggle("hidden", !isDeactivated);
    document.getElementById("pendingWarning").classList.toggle("hidden", !isPending);
    
    if (isPending) {
      document.getElementById("overdueDays").textContent = daysStatus.days;
    }

    // Update progress
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

    // Render payment history
    renderPaymentHistoryNew(customer.payments, totalPaid);
    
  } catch (err) {
    console.error("❌ Error loading customer details:", err);
    alert("Failed to load customer details.");
  }
}

// ✅ Show Add Customer Form
function showAddCustomerForm() {
  const formHTML = `
    <div class="form-popup" id="addCustomerFormPopup">
      <h3><i class="fas fa-user-plus"></i> Add New Customer</h3>
      
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="newCustName" placeholder="Customer name" required>
      </div>
      
      <div class="form-group">
        <label>Phone:</label>
        <input type="text" id="newCustPhone" placeholder="Phone number" required>
      </div>
      
      <div class="form-group">
        <label>Address:</label>
        <textarea id="newCustAddress" placeholder="Address" required></textarea>
      </div>
      
      <div class="form-group">
        <label>Start Date:</label>
        <input type="date" id="newCustStart" required>
      </div>
      
      <div class="form-group">
        <label>Total Loan Amount (₹):</label>
        <input type="number" id="newCustDue" placeholder="Amount" required>
      </div>

      <div class="form-actions">
        <button id="saveCustomerBtn" class="btn btn-success">
          <i class="fas fa-check"></i> Save
        </button>
        <button id="cancelAddBtn" class="btn btn-danger">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    </div>
    <div class="overlay" id="addOverlay"></div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', formHTML);
  
  document.getElementById('saveCustomerBtn').addEventListener('click', saveNewCustomer);
  document.getElementById('cancelAddBtn').addEventListener('click', closeAddForm);
  document.getElementById('addOverlay').addEventListener('click', closeAddForm);
}

// ✅ Save New Customer
async function saveNewCustomer() {
  try {
    const name = document.getElementById("newCustName").value;
    const phone = document.getElementById("newCustPhone").value;
    const address = document.getElementById("newCustAddress").value;
    const loanStartDate = document.getElementById("newCustStart").value;
    const totalLoanAmount = parseFloat(document.getElementById("newCustDue").value);

    if (!name || !phone || !address || !loanStartDate || !totalLoanAmount) {
      alert("All fields are required!");
      return;
    }

    const dailyPayment = Math.round(totalLoanAmount * 0.01);

    const response = await fetch(`${window.API_BASE}/api/owner/add-customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        address,
        loanStartDate,
        totalLoanAmount,
        dailyPayment
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add customer");
    }

    alert("Customer added successfully!");
    closeAddForm();
    loadOwnerDashboard(); // Refresh the list
    
  } catch (err) {
    console.error("❌ Error adding customer:", err);
    alert(err.message || "Failed to add customer");
  }
}

// ✅ Close Add Form
function closeAddForm() {
  const form = document.getElementById("addCustomerFormPopup");
  const overlay = document.getElementById("addOverlay");
  if (form) form.remove();
  if (overlay) overlay.remove();
}

// ✅ Edit Customer
async function editCustomer(customerId) {
  try {
    const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer details");
    
    const customer = await res.json();
    
    const editFormHTML = `
      <div class="form-popup" id="editCustomerForm">
        <h3><i class="fas fa-edit"></i> Edit Customer</h3>
        
        <div class="form-group">
          <label>Name:</label>
          <input type="text" id="editCustName" value="${customer.name}" required>
        </div>
        
        <div class="form-group">
          <label>Phone:</label>
          <input type="text" id="editCustPhone" value="${customer.phone}" required>
        </div>
        
        <div class="form-group">
          <label>Address:</label>
          <textarea id="editCustAddress" required>${customer.address}</textarea>
        </div>
        
        <div class="form-group">
          <label>Loan Start Date:</label>
          <input type="date" id="editCustStart" value="${customer.loanStartDate}" required>
        </div>
        
        <div class="form-group">
          <label>Total Loan Amount (₹):</label>
          <input type="number" id="editCustDue" value="${customer.totalLoanAmount}" required>
        </div>
        
        <div class="form-group">
          <label>Daily Payment (₹):</label>
          <input type="number" id="editCustDaily" value="${customer.dailyPayment || Math.round(customer.totalLoanAmount * 0.01)}" required>
        </div>

        <div class="form-actions">
          <button id="updateCustomerBtn" class="btn btn-success">
            <i class="fas fa-check"></i> Update
          </button>
          <button id="cancelEditBtn" class="btn btn-danger">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      </div>
      <div class="overlay" id="editOverlay"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', editFormHTML);
    
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
  try {
    const name = document.getElementById("editCustName").value;
    const phone = document.getElementById("editCustPhone").value;
    const address = document.getElementById("editCustAddress").value;
    const loanStartDate = document.getElementById("editCustStart").value;
    const totalLoanAmount = parseFloat(document.getElementById("editCustDue").value);
    const dailyPayment = parseFloat(document.getElementById("editCustDaily").value);

    const response = await fetch(`${window.API_BASE}/api/customers/${customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        address,
        loanStartDate,
        totalLoanAmount,
        dailyPayment
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update customer");
    }

    alert("Customer updated successfully!");
    closeEditForm();
    viewCustomerDetails(customerId); // Refresh the details view
    
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    alert(err.message || "Failed to update customer");
  }
}

// ✅ Close Edit Form
function closeEditForm() {
  const form = document.getElementById("editCustomerForm");
  const overlay = document.getElementById("editOverlay");
  if (form) form.remove();
  if (overlay) overlay.remove();
}

// ✅ Delete Customer
async function deleteCustomer(customerId, customerName) {
  if (!confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE}/api/customers/${customerId}`, {
      method: "DELETE"
    });

    if (!response.ok) throw new Error("Failed to delete customer");

    alert("Customer deleted successfully!");
    
    // Go back to list and refresh
    backToList();
    loadOwnerDashboard();
    
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    alert("Failed to delete customer.");
  }
}

// ✅ Add Payment
function addPayment() {
  const paymentFormHTML = `
    <div class="form-popup" id="addPaymentForm">
      <h3><i class="fas fa-plus"></i> Add Payment</h3>
      
      <div class="form-group">
        <label>Date:</label>
        <input type="date" id="paymentDate" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      
      <div class="form-group">
        <label>Amount (₹):</label>
        <input type="number" id="paymentAmount" placeholder="Enter amount" required>
      </div>
      
      <div class="form-group">
        <label>Principal (₹):</label>
        <input type="number" id="paymentPrincipal" placeholder="Enter principal amount" required>
      </div>

      <div class="form-actions">
        <button id="savePaymentBtn" class="btn btn-success">
          <i class="fas fa-check"></i> Save Payment
        </button>
        <button id="cancelPaymentBtn" class="btn btn-danger">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    </div>
    <div class="overlay" id="paymentOverlay"></div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', paymentFormHTML);
  
  document.getElementById('savePaymentBtn').addEventListener('click', savePayment);
  document.getElementById('cancelPaymentBtn').addEventListener('click', closePaymentForm);
  document.getElementById('paymentOverlay').addEventListener('click', closePaymentForm);
}

// ✅ Save Payment
async function savePayment() {
  try {
    const date = document.getElementById("paymentDate").value;
    const amount = parseFloat(document.getElementById("paymentAmount").value);
    const principal = parseFloat(document.getElementById("paymentPrincipal").value);

    if (!date || !amount || !principal) {
      alert("All fields are required!");
      return;
    }

    const response = await fetch(`${window.API_BASE}/api/customers/${currentCustomerId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount, principal })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add payment");
    }

    alert("Payment added successfully!");
    closePaymentForm();
    viewCustomerDetails(currentCustomerId); // Refresh details
    
  } catch (err) {
    console.error("❌ Error adding payment:", err);
    alert(err.message || "Failed to add payment");
  }
}

// ✅ Close Payment Form
function closePaymentForm() {
  const form = document.getElementById("addPaymentForm");
  const overlay = document.getElementById("paymentOverlay");
  if (form) form.remove();
  if (overlay) overlay.remove();
}

// ✅ Render Payment History
function renderPaymentHistoryNew(payments, totalPaid) {
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

  // Sort payments by date (newest first)
  const sortedPayments = payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div class="payment-table-container">
      <table class="payment-table-customer">
        <thead>
          <tr>
            <th><i class="fas fa-calendar"></i> Date</th>
            <th><i class="fas fa-money-bill-wave"></i> Amount</th>
            <th><i class="fas fa-chart-bar"></i> Principal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPayments.map(payment => `
            <tr>
              <td>${payment.date}</td>
              <td class="payment-amount">₹${payment.amount}</td>
              <td class="payment-principal">₹${payment.principal}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deletePayment('${currentCustomerId}', '${payment.date}')">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </td>
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

// ✅ Delete Payment
async function deletePayment(customerId, paymentDate) {
  if (!confirm("Are you sure you want to delete this payment?")) {
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE}/api/customers/${customerId}/payments/${encodeURIComponent(paymentDate)}`, {
      method: "DELETE"
    });

    if (!response.ok) throw new Error("Failed to delete payment");

    alert("Payment deleted successfully!");
    viewCustomerDetails(customerId); // Refresh details
    
  } catch (err) {
    console.error("❌ Error deleting payment:", err);
    alert("Failed to delete payment.");
  }
}

// ✅ Back to List
function backToList() {
  if (customerDetailView) customerDetailView.classList.add("hidden");
  if (customerListSection) customerListSection.classList.remove("hidden");
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

// 🚀 Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 Owner Dashboard Initialized");
  
  // Add Customer Button
  document.getElementById("addCustomerBtn")?.addEventListener("click", showAddCustomerForm);
  
  // Back to List Button
  document.getElementById("backToListBtn")?.addEventListener("click", backToList);
  
  // Logout Button
  document.getElementById("ownerLogoutBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
  
  loadOwnerDashboard();
});
