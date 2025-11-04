// customer.js - UPDATED FOR DEPLOYMENT
console.log("👤 Customer Dashboard Loaded");

// Define API_BASE for deployment
// customer.js - UPDATE FIRST LINE ONLY
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:5000" 
    : "https://loanpro-backend.onrender.com";

// REST OF YOUR EXISTING customer.js CODE REMAINS EXACTLY THE SAME
// Check if customer is logged in
const loggedInCustomer = JSON.parse(localStorage.getItem("loggedInCustomer"));
// ... continue with all your existing customer.js code ...

if (!loggedInCustomer) {
  alert("No customer logged in!");
  window.location.href = "index.html";
} else {
  loadCustomerDashboard(loggedInCustomer);
}

// ✅ Calculate Customer Status (same as owner dashboard)
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

// ✅ Calculate Days Status (same as owner dashboard)
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

async function loadCustomerDashboard(customer) {
  document.getElementById("dashboardStatus").textContent = "Loading your dashboard...";

  try {
    const res = await fetch(`${API_BASE}/api/customers/${customer._id}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch customer data: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Calculate customer status (same as owner dashboard)
    const customerWithStatus = calculateCustomerStatus(data);
    const daysStatus = calculateDaysStatus(customerWithStatus);

    // Calculate total paid and remaining amount
    const totalPaid = data.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remainingAmount = Math.max(0, data.totalLoanAmount - totalPaid);
    const paymentProgress = (totalPaid / data.totalLoanAmount) * 100;

    // Update customer info in the dashboard
    document.getElementById("customerInfo").innerHTML = `
      <!-- Owner Contact Card -->
      <div class="owner-contact-card">
        <div class="owner-contact-header">
          <i class="fas fa-headset"></i>
          <h3>Contact Owner</h3>
        </div>
        <div class="owner-phones-container">
          <a href="tel:8056108207" class="owner-phone-card">
            <i class="fas fa-phone"></i>
            <span>8056108207</span>
          </a>
          <a href="tel:9342695097" class="owner-phone-card">
            <i class="fas fa-phone"></i>
            <span>9342695097</span>
          </a>
        </div>
        <p style="margin-top: 15px; opacity: 0.9; font-size: 0.9rem;">
          <i class="fas fa-info-circle"></i> Call for payment queries or support
        </p>
      </div>

      <h2>Welcome, ${data.name}!</h2>
      
      <!-- Pending Warning Banner -->
      ${customerWithStatus.calculatedStatus === 'pending' ? `
        <div class="pending-warning-customer" style="background: #fef5e7; color: #744210; padding: 20px; border-radius: var(--border-radius); margin: 20px 0; text-align: center; border-left: 5px solid #d69e2e; border-right: 5px solid #d69e2e;">
          <i class="fas fa-exclamation-triangle fa-2x" style="color: #d69e2e; margin-bottom: 10px;"></i> 
          <h3 style="color: #744210; margin: 10px 0;">Payment Overdue!</h3>
          <p style="margin: 10px 0; font-size: 16px;">Your loan is <strong>${daysStatus.days} days overdue</strong>.</p>
          <p style="margin: 5px 0; font-size: 14px;">Please contact the loan owner immediately to avoid further issues.</p>
          <div style="margin-top: 15px; padding: 10px; background: rgba(214, 158, 46, 0.1); border-radius: 8px;">
            <strong>Contact Owner:</strong> Use the contact numbers above for payment arrangements.
          </div>
        </div>
      ` : ''}
      
      <div class="customer-details">
        <div class="info-grid-customer">
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-phone"></i> Phone</div>
            <div class="info-value">${data.phone}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-home"></i> Address</div>
            <div class="info-value">${data.address}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-calendar-alt"></i> Loan Start Date</div>
            <div class="info-value">${data.loanStartDate}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-hand-holding-usd"></i> Total Loan Amount</div>
            <div class="info-value">₹${data.totalLoanAmount}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-coins"></i> Daily Payment</div>
            <div class="info-value">₹${data.dailyPayment}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-check-circle"></i> Total Paid</div>
            <div class="info-value" style="color: var(--success);">₹${totalPaid}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-clock"></i> Remaining Amount</div>
            <div class="info-value" style="color: ${remainingAmount > 0 ? 'var(--danger)' : 'var(--success)'};">₹${remainingAmount}</div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-info-circle"></i> Status</div>
            <div class="info-value">
              <span class="status-${customerWithStatus.calculatedStatus}">
                ${customerWithStatus.calculatedStatus === 'deactivated' ? 
                  '<i class="fas fa-check-circle"></i> Completed' : 
                  customerWithStatus.calculatedStatus === 'pending' ? 
                  '<i class="fas fa-exclamation-triangle"></i> Overdue Pending' : 
                  '<i class="fas fa-spinner"></i> Active'}
              </span>
            </div>
          </div>
          <div class="info-item-customer">
            <div class="info-label"><i class="fas fa-calendar-check"></i> Days Status</div>
            <div class="info-value">
              ${daysStatus.status === 'completed' ? 
                '<span class="status-deactivated"><i class="fas fa-trophy"></i> Loan Completed</span>' :
                daysStatus.status === 'overdue' ? 
                `<span class="status-pending"><i class="fas fa-exclamation-circle"></i> Overdue: ${daysStatus.days} days</span>` :
                `<span class="status-active"><i class="fas fa-clock"></i> ${daysStatus.days} days remaining</span>`
              }
            </div>
          </div>
        </div>
      </div>
      
      ${customerWithStatus.calculatedStatus === 'active' ? `
      <div class="progress-section" style="margin: 30px 0;">
        <h3><i class="fas fa-chart-line"></i> Payment Progress</h3>
        <div class="progress-bar-customer">
          <div class="progress-track">
            <div class="progress-fill-customer" style="width: ${paymentProgress}%;"></div>
          </div>
          <div class="progress-text">
            <span>${paymentProgress.toFixed(1)}% Paid</span>
            <span>(₹${totalPaid} of ₹${data.totalLoanAmount})</span>
          </div>
        </div>
      </div>
      ` : ''}
      
      ${customerWithStatus.calculatedStatus === 'deactivated' ? `
      <div class="deactivation-message" style="background: linear-gradient(135deg, var(--success), #2d7d32); color: white; padding: 25px; border-radius: var(--border-radius); text-align: center; margin: 25px 0; box-shadow: var(--shadow-md);">
        <i class="fas fa-check-circle fa-3x" style="margin-bottom: 15px;"></i>
        <h3 style="margin: 15px 0;">Loan Successfully Completed!</h3>
        <p style="font-size: 16px; margin: 10px 0;">Congratulations! You have successfully paid your full loan amount of ₹${data.totalLoanAmount}.</p>
        <p style="margin: 5px 0;"><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</p>
        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.2); border-radius: 8px;">
          <i class="fas fa-star"></i> Thank you for being a valued customer!
        </div>
      </div>
      ` : ''}
      
      <div class="payment-history">
        <h3><i class="fas fa-history"></i> Payment History</h3>
        <div id="paymentHistoryContainer"></div>
      </div>
    `;

    // Render payments
    renderPaymentHistory(data.payments);
    
  } catch (err) {
    console.error("❌ Error loading customer dashboard:", err);
    document.getElementById("dashboardStatus").textContent = "Failed to load dashboard. Please try again.";
  }
}

function renderPaymentHistory(payments) {
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
    <div class="payment-summary" style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: var(--border-radius); text-align: center;">
      <strong>Total Payments: ₹${payments.reduce((sum, payment) => sum + payment.amount, 0)}</strong>
    </div>
  `;
}

// Logout functionality
document.getElementById("customerLogoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("loggedInCustomer");
  window.location.href = "index.html";
});