// script.js - UPDATED WITH PROPER INITIALIZATION
console.log("🔧 Script.js loaded");

// Define API_BASE for deployment
const MAIN_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:5000" 
    : "https://loanpro-backend-t41k.onrender.com";

console.log("🌐 API Base URL:", MAIN_API_BASE);

// Global variables for DOM elements
let loginSection, roleSelection, ownerLoginSection, customerLoginSection;
let ownerDashboard, customerDashboard;
let ownerLoginBtn, ownerUsernameInput, ownerPasswordInput, ownerLogoutBtn;
let customerLoginBtn, customerPhoneInput, customerLogoutBtn;
let ownerRoleBtn, customerRoleBtn, backToRoleBtn;

// ✅ Initialize DOM Elements
function initializeDOMElements() {
    console.log("🔄 Initializing DOM elements...");
    
    // 🧭 Navigation Elements
    loginSection = document.getElementById("loginSection");
    roleSelection = document.getElementById("roleSelection");
    ownerLoginSection = document.getElementById("ownerLoginSection");
    customerLoginSection = document.getElementById("customerLoginSection");
    ownerDashboard = document.getElementById("ownerDashboard");
    customerDashboard = document.getElementById("customerDashboard");

    // 🔐 Owner Login Elements
    ownerLoginBtn = document.getElementById("ownerLoginBtn");
    ownerUsernameInput = document.getElementById("ownerUsername");
    ownerPasswordInput = document.getElementById("ownerPassword");
    ownerLogoutBtn = document.getElementById("ownerLogoutBtn");

    // 👤 Customer Login Elements
    customerLoginBtn = document.getElementById("customerLoginBtn");
    customerPhoneInput = document.getElementById("customerPhone");
    customerLogoutBtn = document.getElementById("customerLogoutBtn");

    // Role Selection Buttons
    ownerRoleBtn = document.getElementById("ownerRoleBtn");
    customerRoleBtn = document.getElementById("customerRoleBtn");
    backToRoleBtn = document.getElementById("backToRoleBtn");

    // Make them globally available
    window.loginSection = loginSection;
    window.roleSelection = roleSelection;
    window.ownerLoginSection = ownerLoginSection;
    window.customerLoginSection = customerLoginSection;
    window.ownerDashboard = ownerDashboard;
    window.customerDashboard = customerDashboard;
    window.ownerLoginBtn = ownerLoginBtn;
    window.ownerUsernameInput = ownerUsernameInput;
    window.ownerPasswordInput = ownerPasswordInput;
    window.ownerLogoutBtn = ownerLogoutBtn;
    window.customerLoginBtn = customerLoginBtn;
    window.customerPhoneInput = customerPhoneInput;
    window.customerLogoutBtn = customerLogoutBtn;
    window.ownerRoleBtn = ownerRoleBtn;
    window.customerRoleBtn = customerRoleBtn;
    window.backToRoleBtn = backToRoleBtn;

    console.log("✅ DOM elements initialized");
    console.log("📊 Elements found:", {
        ownerRoleBtn: !!ownerRoleBtn,
        customerRoleBtn: !!customerRoleBtn,
        backToRoleBtn: !!backToRoleBtn,
        ownerLoginBtn: !!ownerLoginBtn,
        customerLoginBtn: !!customerLoginBtn
    });
}

// ✅ Setup Event Listeners
function setupEventListeners() {
    console.log("🔄 Setting up event listeners...");

    // ✅ Role Selection
    if (ownerRoleBtn) {
        console.log("✅ Adding listener to owner role button");
        ownerRoleBtn.addEventListener("click", () => {
            console.log("👑 Owner role selected");
            loginSection.classList.add("hidden");
            roleSelection.classList.add("hidden");
            ownerLoginSection.classList.remove("hidden");
        });
    } else {
        console.error("❌ ownerRoleBtn not found");
    }

    if (customerRoleBtn) {
        console.log("✅ Adding listener to customer role button");
        customerRoleBtn.addEventListener("click", () => {
            console.log("👤 Customer role selected");
            loginSection.classList.add("hidden");
            roleSelection.classList.add("hidden");
            customerLoginSection.classList.remove("hidden");
        });
    } else {
        console.error("❌ customerRoleBtn not found");
    }

    if (backToRoleBtn) {
        console.log("✅ Adding listener to back to role button");
        backToRoleBtn.addEventListener("click", () => {
            console.log("🔙 Back to role selection");
            ownerLoginSection.classList.add("hidden");
            customerLoginSection.classList.add("hidden");
            roleSelection.classList.remove("hidden");
        });
    } else {
        console.error("❌ backToRoleBtn not found");
    }

    // ✅ Owner Login Functionality
    if (ownerLoginBtn) {
        console.log("✅ Adding listener to owner login button");
        ownerLoginBtn.addEventListener("click", async () => {
            console.log("🔐 Owner login attempt");
            const username = ownerUsernameInput.value.trim();
            const password = ownerPasswordInput.value.trim();

            if (!username || !password) {
                alert("Please enter both username and password");
                return;
            }

            try {
                showLoading("ownerLoginSection", "Logging in...");
                
                const res = await fetch(`${MAIN_API_BASE}/api/owner/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log("✅ Owner login successful:", data);
                    
                    // Hide login, show owner dashboard
                    ownerLoginSection.classList.add("hidden");
                    ownerDashboard.classList.remove("hidden");
                    
                    // Load owner dashboard
                    if (typeof loadOwnerDashboard === 'function') {
                        loadOwnerDashboard();
                    }
                    
                } else {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "Login failed");
                }
            } catch (err) {
                console.error("❌ Owner login error:", err);
                alert(err.message || "Login failed. Please try again.");
            } finally {
                hideLoading("ownerLoginSection");
            }
        });
    } else {
        console.error("❌ ownerLoginBtn not found");
    }

    // ✅ Customer Login Functionality
    if (customerLoginBtn) {
        console.log("✅ Adding listener to customer login button");
        customerLoginBtn.addEventListener("click", async () => {
            console.log("📱 Customer login attempt");
            const phone = customerPhoneInput.value.trim();
            
            if (!phone || phone.length < 10) {
                alert("Please enter a valid phone number (at least 10 digits)");
                return;
            }

            try {
                showLoading("customerLoginSection", "Logging in...");
                
                const res = await fetch(`${MAIN_API_BASE}/api/customers/phone/${phone}`);
                
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error("Customer not found. Please check your phone number.");
                    }
                    throw new Error(`Login failed: ${res.status}`);
                }
                
                const customer = await res.json();
                console.log("✅ Customer login successful:", customer);
                
                // Hide login, show customer dashboard
                customerLoginSection.classList.add("hidden");
                customerDashboard.classList.remove("hidden");
                
                // Load customer data if function exists
                if (typeof loadCustomerData === 'function') {
                    // Set current customer and load data
                    window.currentCustomer = customer;
                    loadCustomerData();
                }
                
            } catch (err) {
                console.error("❌ Customer login error:", err);
                alert(err.message || "Login failed. Please try again.");
            } finally {
                hideLoading("customerLoginSection");
            }
        });
    } else {
        console.error("❌ customerLoginBtn not found");
    }

    // ✅ Logout Functionality
    if (ownerLogoutBtn) {
        console.log("✅ Adding listener to owner logout button");
        ownerLogoutBtn.addEventListener("click", () => {
            console.log("🚪 Owner logout");
            ownerDashboard.classList.add("hidden");
            loginSection.classList.remove("hidden");
            roleSelection.classList.remove("hidden");
            
            // Clear inputs
            ownerUsernameInput.value = "";
            ownerPasswordInput.value = "";
        });
    } else {
        console.error("❌ ownerLogoutBtn not found");
    }

    // ✅ Enter Key Support
    if (ownerUsernameInput && ownerPasswordInput) {
        [ownerUsernameInput, ownerPasswordInput].forEach(input => {
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    ownerLoginBtn.click();
                }
            });
        });
    }

    if (customerPhoneInput) {
        customerPhoneInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                customerLoginBtn.click();
            }
        });
    }

    console.log("✅ Event listeners setup complete");
}

// ✅ Loading Functions
function showLoading(containerId, message = "Loading...") {
    const container = document.getElementById(containerId);
    if (container) {
        // Remove existing loading indicator if any
        const existingLoader = container.querySelector('.loading-container');
        if (existingLoader) {
            existingLoader.remove();
        }
        
        const loaderHTML = `
            <div class="loading-container" style="text-align: center; padding: 20px;">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', loaderHTML);
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const loader = container.querySelector('.loading-container');
        if (loader) {
            loader.remove();
        }
    }
}

// ✅ Utility Functions for Error Handling
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// ✅ Check Backend Connection on Load
async function checkBackendConnection() {
    try {
        console.log("🔌 Checking backend connection...");
        const res = await fetch(`${MAIN_API_BASE}/api/health`);
        if (res.ok) {
            console.log("✅ Backend connection successful");
            return true;
        } else {
            console.warn("⚠️ Backend responded with non-OK status:", res.status);
            return false;
        }
    } catch (err) {
        console.error("❌ Backend connection failed:", err);
        return false;
    }
}

// ✅ Initialize Page State
function initializePageState() {
    console.log("🔄 Initializing page state...");
    
    // Show login section by default
    if (loginSection) {
        loginSection.classList.remove("hidden");
    }
    if (roleSelection) {
        roleSelection.classList.remove("hidden");
    }
    
    // Hide all other sections
    [ownerLoginSection, customerLoginSection, ownerDashboard, customerDashboard].forEach(section => {
        if (section) section.classList.add("hidden");
    });
    
    console.log("✅ Page state initialized");
}

// 🚀 Initialize Application
window.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Frontend loaded - Starting initialization");
    
    // Step 1: Initialize DOM elements
    initializeDOMElements();
    
    // Step 2: Setup event listeners
    setupEventListeners();
    
    // Step 3: Initialize page state
    initializePageState();
    
    // Step 4: Check backend connection
    const isBackendConnected = await checkBackendConnection();
    
    if (!isBackendConnected) {
        console.warn("⚠️ Backend may be unavailable - some features may not work");
    }
    
    console.log("🎉 Application initialization complete");
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Make functions and variables globally available
window.MAIN_API_BASE = MAIN_API_BASE;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showError = showError;
