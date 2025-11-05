// script.js - REMOVE API_BASE DECLARATION FROM HERE
console.log("🌐 Frontend Loaded");

// Global State
let currentPage = "home";

// DOM Elements
const homePage = document.getElementById("homePage");
const customerLoginPage = document.getElementById("customerLoginPage");
const ownerLoginPage = document.getElementById("ownerLoginPage");
const homeStats = document.getElementById("homeStats");

// ✅ Enhanced server connection check
async function checkServerConnection() {
  try {
    console.log("🔍 Checking server connection to:", window.API_BASE);
    const response = await fetch(`${window.API_BASE}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Server:", data.status);
    console.log("📊 Database:", data.database);
    return true;
  } catch (error) {
    console.error("❌ Cannot connect to backend:", error);
    showConnectionError();
    return false;
  }
}

// ✅ Show connection error
function showConnectionError() {
  if (homeStats) {
    homeStats.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Connection Error</h3>
        <p>Unable to connect to the server. Please try again later.</p>
        <button class="btn btn-primary" onclick="checkServerConnection()">Retry Connection</button>
      </div>
    `;
  }
}

// ✅ Initialize event listeners
function initializeEventListeners() {
  document.getElementById("homeLink")?.addEventListener("click", showHomePage);
  document.getElementById("customerLoginLink")?.addEventListener("click", showCustomerLogin);
  document.getElementById("ownerLoginLink")?.addEventListener("click", showOwnerLogin);
  document.getElementById("backFromCustomerLogin")?.addEventListener("click", showHomePage);
  document.getElementById("backFromOwnerLogin")?.addEventListener("click", showHomePage);
  document.getElementById("customerLoginBtn")?.addEventListener("click", loginCustomer);
  document.getElementById("ownerLoginBtn")?.addEventListener("click", loginOwner);
}

// ✅ Page Switch Functions
function hideAllPages() {
  const pages = [homePage, customerLoginPage, ownerLoginPage];
  pages.forEach(page => {
    if (page) page.classList.add("hidden");
  });
}

function showHomePage() {
  hideAllPages();
  if (homePage) homePage.classList.remove("hidden");
  loadHomeStats();
}

function showCustomerLogin() {
  hideAllPages();
  if (customerLoginPage) customerLoginPage.classList.remove("hidden");
}

function showOwnerLogin() {
  hideAllPages();
  if (ownerLoginPage) ownerLoginPage.classList.remove("hidden");
}

// ✅ Enhanced Customer Login with better error handling
async function loginCustomer(e) {
  if (e) e.preventDefault();
  
  const phoneInput = document.getElementById("customerPhone");
  const phone = phoneInput?.value.trim();
  
  if (!phone) {
    alert("Enter your phone number!");
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/customer/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Login failed");
    }

    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("loggedInCustomer", JSON.stringify(data));
      window.location.href = "customer.html";
    } else {
      throw new Error(data.message || "Login failed");
    }
    
  } catch (err) {
    console.error("❌ Login error:", err);
    alert(err.message || "Failed to connect to server. Please try again.");
  }
}

// ✅ Enhanced Owner Login with better error handling
async function loginOwner(e) {
  if (e) e.preventDefault();
  
  const email = document.getElementById("ownerEmail")?.value;
  const password = document.getElementById("ownerPassword")?.value;

  if (!email || !password) {
    alert("Enter email and password!");
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/owner/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Login failed");
    }

    const data = await res.json();
    
    if (data.success) {
      alert("✅ Login successful!");
      window.location.href = "owner.html";
    } else {
      throw new Error(data.message || "Login failed");
    }
    
  } catch (err) {
    console.error("Owner login error:", err);
    alert(err.message || "Failed to connect to server. Please try again.");
  }
}

// ✅ Enhanced Load Home Stats
async function loadHomeStats() {
  try {
    showLoading("homeStats", "Loading statistics...");
    
    const res = await fetch(`${window.API_BASE}/api/analytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors'
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch analytics: ${res.status}`);
    }
    
    const data = await res.json();

    if (!homeStats) return;

    homeStats.innerHTML = `
      <div class="stat-card">
        <i class="fas fa-users fa-2x" style="color: #3498db;"></i>
        <div class="stat-title">Total Customers</div>
        <div class="stat-value">${data.totalCustomers}</div>
      </div>
      <div class="stat-card">
        <i class="fas fa-money-bill-wave fa-2x" style="color: #e74c3c;"></i>
        <div class="stat-title">Total Loan Amount</div>
        <div class="stat-value">₹${data.totalLoanAmount}</div>
      </div>
    `;
  } catch (err) {
    console.error("❌ Error loading home stats:", err);
    showConnectionError();
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

// ✅ On Page Load
window.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Frontend loaded");
  console.log("🌐 API Base:", window.API_BASE);
  initializeEventListeners();
  showHomePage();
  await checkServerConnection();
});
