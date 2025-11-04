// script.js - UPDATED FOR DEPLOYMENT WITH GLOBAL VARIABLES
console.log("🔧 Script.js loaded");

// Define API_BASE for deployment - UPDATED TO PREVENT CONFLICT
const MAIN_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:5000" 
    : "https://loanpro-backend-t41k.onrender.com";

console.log("🌐 API Base URL:", MAIN_API_BASE);

// 🧭 Navigation Elements - MADE GLOBAL TO PREVENT CONFLICTS
window.loginSection = document.getElementById("loginSection");
window.roleSelection = document.getElementById("roleSelection");
window.ownerLoginSection = document.getElementById("ownerLoginSection");
window.customerLoginSection = document.getElementById("customerLoginSection");
window.ownerDashboard = document.getElementById("ownerDashboard");
window.customerDashboard = document.getElementById("customerDashboard");

// 🔐 Owner Login Elements - MADE GLOBAL
window.ownerLoginBtn = document.getElementById("ownerLoginBtn");
window.ownerUsernameInput = document.getElementById("ownerUsername");
window.ownerPasswordInput = document.getElementById("ownerPassword");
window.ownerLogoutBtn = document.getElementById("ownerLogoutBtn");

// 👤 Customer Login Elements - MADE GLOBAL
window.customerLoginBtn = document.getElementById("customerLoginBtn");
window.customerPhoneInput = document.getElementById("customerPhone");
window.customerLogoutBtn = document.getElementById("customerLogoutBtn");

// Role Selection Buttons - MADE GLOBAL
window.ownerRoleBtn = document.getElementById("ownerRoleBtn");
window.customerRoleBtn = document.getElementById("customerRoleBtn");
window.backToRoleBtn = document.getElementById("backToRoleBtn");

// ✅ Role Selection
if (window.ownerRoleBtn) {
    window.ownerRoleBtn.addEventListener("click", () => {
        window.loginSection.classList.add("hidden");
        window.roleSelection.classList.add("hidden");
        window.ownerLoginSection.classList.remove("hidden");
    });
}

if (window.customerRoleBtn) {
    window.customerRoleBtn.addEventListener("click", () => {
        window.loginSection.classList.add("hidden");
        window.roleSelection.classList.add("hidden");
        window.customerLoginSection.classList.remove("hidden");
    });
}

if (window.backToRoleBtn) {
    window.backToRoleBtn.addEventListener("click", () => {
        window.ownerLoginSection.classList.add("hidden");
        window.customerLoginSection.classList.add("hidden");
        window.roleSelection.classList.remove("hidden");
    });
}

// ✅ Owner Login Functionality
if (window.ownerLoginBtn) {
    window.ownerLoginBtn.addEventListener("click", async () => {
        const username = window.ownerUsernameInput.value.trim();
        const password = window.ownerPasswordInput.value.trim();

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
                window.ownerLoginSection.classList.add("hidden");
                window.ownerDashboard.classList.remove("hidden");
                
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
}

// ✅ Customer Login Functionality
if (window.customerLoginBtn) {
    window.customerLoginBtn.addEventListener("click", async () => {
        const phone = window.customerPhoneInput.value.trim();
        
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
            window.customerLoginSection.classList.add("hidden");
            window.customerDashboard.classList.remove("hidden");
            
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
}

// ✅ Logout Functionality
if (window.ownerLogoutBtn) {
    window.ownerLogoutBtn.addEventListener("click", () => {
        window.ownerDashboard.classList.add("hidden");
        window.loginSection.classList.remove("hidden");
        window.roleSelection.classList.remove("hidden");
        
        // Clear inputs
        window.ownerUsernameInput.value = "";
        window.ownerPasswordInput.value = "";
    });
}

// Customer logout is handled in customer.js

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

// ✅ Enter Key Support
if (window.ownerUsernameInput && window.ownerPasswordInput) {
    [window.ownerUsernameInput, window.ownerPasswordInput].forEach(input => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                window.ownerLoginBtn.click();
            }
        });
    });
}

if (window.customerPhoneInput) {
    window.customerPhoneInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            window.customerLoginBtn.click();
        }
    });
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

// 🚀 Initialize Application
window.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Frontend loaded");
    
    // Check backend connection
    const isBackendConnected = await checkBackendConnection();
    
    if (!isBackendConnected) {
        console.warn("⚠️ Backend may be unavailable - some features may not work");
    }
    
    // Show login section by default
    if (window.loginSection) {
        window.loginSection.classList.remove("hidden");
    }
    if (window.roleSelection) {
        window.roleSelection.classList.remove("hidden");
    }
    
    // Hide all other sections
    [window.ownerLoginSection, window.customerLoginSection, window.ownerDashboard, window.customerDashboard].forEach(section => {
        if (section) section.classList.add("hidden");
    });
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Make MAIN_API_BASE available globally for other scripts if needed
window.MAIN_API_BASE = MAIN_API_BASE;

// Make utility functions global so they can be used by other scripts
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showError = showError;
