// owner.js - IIFE VERSION (NO HOISTING ISSUES)
(function() {
    'use strict';
    
    console.log("📊 Owner Dashboard Loaded");

    // Use the global API_BASE variable with fallback
    const API_BASE = window.API_BASE || "https://loanpro-backend-t41k.onrender.com";
    window.API_BASE = API_BASE;

    console.log("🌐 Using API Base:", window.API_BASE);

    let allCustomers = [];
    let currentCustomerId = null;

    // ==================== ALL FUNCTIONS DEFINED INSIDE IIFE ====================

    const calculateCustomerStatus = function(customer) {
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
    };

    const calculateDaysStatus = function(customer) {
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
    };

    const showLoading = function(containerId, message = "Loading...") {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    };

    const showError = function(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="padding: 25px; background: #f8d7da; color: #721c24; border-radius: 8px; text-align: center; margin: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p style="margin: 10px 0; font-weight: bold;">${message}</p>
                    <button class="btn btn-primary" onclick="window.loadOwnerDashboard()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    };

    const updateAnalytics = function(customers) {
        try {
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
        } catch (error) {
            console.error("Error in updateAnalytics:", error);
        }
    };

    const setupFilters = function() {
        try {
            const filters = ['filterStatus', 'filterAmount', 'filterDate', 'sortBy'];
            filters.forEach(filterId => {
                const filter = document.getElementById(filterId);
                if (filter) {
                    filter.addEventListener('change', applyFilters);
                }
            });
        } catch (error) {
            console.error("Error in setupFilters:", error);
        }
    };

    const applyFilters = function() {
        try {
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
        } catch (error) {
            console.error("Error in applyFilters:", error);
        }
    };

    const sortCustomers = function(customers, sortBy) {
        try {
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
        } catch (error) {
            console.error("Error in sortCustomers:", error);
            return customers;
        }
    };

    const updateCustomerCount = function(count) {
        try {
            const customerCountElem = document.getElementById('customerCount');
            if (customerCountElem) {
                customerCountElem.textContent = `${count} customer${count !== 1 ? 's' : ''}`;
            }
        } catch (error) {
            console.error("Error in updateCustomerCount:", error);
        }
    };

    const clearAllFilters = function() {
        try {
            document.getElementById('filterStatus').value = 'all';
            document.getElementById('filterAmount').value = 'all';
            document.getElementById('filterDate').value = 'all';
            document.getElementById('sortBy').value = 'name';
            document.getElementById('searchCustomer').value = '';
            applyFilters();
        } catch (error) {
            console.error("Error in clearAllFilters:", error);
        }
    };

    const renderCustomerList = function(customers) {
        try {
            const customersContainer = document.getElementById("customersContainer");
            if (!customersContainer) return;
            
            if (customers.length === 0) {
                customersContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users fa-3x"></i>
                        <h3>No customers found</h3>
                        <p>Try adjusting your filters or add a new customer</p>
                        <button class="btn btn-success" onclick="window.clearAllFilters(); document.getElementById('addCustomerBtn').click()">
                            Add New Customer
                        </button>
                        <button class="btn btn-secondary" onclick="window.clearAllFilters()" style="margin-left: 10px;">
                            Clear Filters
                        </button>
                    </div>
                `;
                return;
            }

            let tableHTML = `
                <div style="width: 100%; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <thead>
                            <tr style="background: #2c3e50; color: white;">
                                <th style="padding: 15px; text-align: left;">Customer</th>
                                <th style="padding: 15px; text-align: left;">Contact</th>
                                <th style="padding: 15px; text-align: left;">Loan Amount</th>
                                <th style="padding: 15px; text-align: left;">Status</th>
                                <th style="padding: 15px; text-align: left;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            customers.forEach(customer => {
                const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                const isDeactivated = customer.calculatedStatus === 'deactivated';
                const daysStatus = calculateDaysStatus(customer);
                
                tableHTML += `
                    <tr style="border-bottom: 1px solid #eee; cursor: pointer;" onclick="window.viewCustomerDetails('${customer._id}')">
                        <td style="padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <div style="font-weight: bold; font-size: 16px; color: #2c3e50;">${customer.name}</div>
                                    <div style="color: #666; font-size: 14px;">${customer.phone}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 15px;">
                            <div style="color: #666;">
                                <i class="fas fa-home"></i> ${customer.address.substring(0, 30)}...
                            </div>
                        </td>
                        <td style="padding: 15px;">
                            <div style="font-weight: bold; color: #2c3e50;">₹${customer.totalLoanAmount.toLocaleString()}</div>
                            <div style="color: #666; font-size: 12px;">Paid: ₹${totalPaid.toLocaleString()}</div>
                        </td>
                        <td style="padding: 15px;">
                            <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${customer.calculatedStatus === 'deactivated' ? '#27ae60' : customer.calculatedStatus === 'pending' ? '#f39c12' : '#3498db'}; color: white;">
                                ${customer.calculatedStatus === 'deactivated' ? 'Completed' : customer.calculatedStatus === 'pending' ? 'Pending' : 'Active'}
                            </span>
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                ${daysStatus.status === 'completed' ? 'Loan Completed' : daysStatus.status === 'overdue' ? `${daysStatus.days} days overdue` : `${daysStatus.days} days left`}
                            </div>
                        </td>
                        <td style="padding: 15px;">
                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.viewCustomerDetails('${customer._id}')" style="padding: 6px 12px; margin: 2px;">View</button>
                            ${isDeactivated ? `
                                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.deleteCustomer('${customer._id}', '${customer.name}')" style="padding: 6px 12px; margin: 2px;">Delete</button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            customersContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error("Error in renderCustomerList:", error);
            showError("customersContainer", "Error displaying customers");
        }
    };

    const viewCustomerDetails = async function(customerId) {
        try {
            console.log("Loading customer details:", customerId);
            currentCustomerId = customerId;
            
            const res = await fetch(`${window.API_BASE}/api/customers/${customerId}`);
            if (!res.ok) throw new Error("Failed to fetch customer details");
            
            const customer = await res.json();
            const customerWithStatus = calculateCustomerStatus(customer);
            
            const totalPaid = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
            const remainingAmount = Math.max(0, customer.totalLoanAmount - totalPaid);
            
            // Show detail view
            document.getElementById("customerDetailView").classList.remove("hidden");
            document.getElementById("customerList").classList.add("hidden");
            
            // Update basic info
            document.getElementById("custName").textContent = customer.name;
            document.getElementById("custPhone").textContent = customer.phone;
            document.getElementById("custAddress").textContent = customer.address;
            document.getElementById("custDue").textContent = customer.totalLoanAmount.toLocaleString();
            document.getElementById("custPaid").textContent = totalPaid.toLocaleString();
            document.getElementById("custRemaining").textContent = remainingAmount.toLocaleString();
            
            console.log("✅ Customer details loaded successfully");
            
        } catch (err) {
            console.error("Error loading customer details:", err);
            alert("Failed to load customer details.");
        }
    };

    const renderPaymentHistory = function(payments, totalPaid) {
        try {
            const container = document.getElementById("paymentHistoryContainer");
            if (!container) return;
            
            if (!payments || payments.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #888;">
                        <i class="fas fa-receipt fa-3x"></i>
                        <h4>No Payment History</h4>
                        <p>No payments have been recorded yet.</p>
                    </div>
                `;
                return;
            }

            let tableHTML = `
                <div style="background: white; border-radius: 8px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #2c3e50; color: white;">
                                <th style="padding: 12px; text-align: left;">Date</th>
                                <th style="padding: 12px; text-align: left;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            payments.forEach(payment => {
                tableHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${payment.date}</td>
                        <td style="padding: 12px; color: #27ae60; font-weight: bold;">₹${payment.amount}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                    <strong>Total Payments: ₹${totalPaid.toLocaleString()}</strong>
                </div>
            `;

            container.innerHTML = tableHTML;
        } catch (error) {
            console.error("Error in renderPaymentHistory:", error);
        }
    };

    // Stub functions
    const editCustomer = function(customerId) {
        console.log("Edit customer:", customerId);
        alert("Edit feature coming soon");
    };

    const addPayment = function() {
        console.log("Add payment for:", currentCustomerId);
        alert("Add payment feature coming soon");
    };

    const deletePayment = function(customerId, paymentDate) {
        console.log("Delete payment:", customerId, paymentDate);
        alert("Delete payment feature coming soon");
    };

    const deleteCustomer = function(customerId, customerName) {
        if (confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
            console.log("Delete customer:", customerId, customerName);
            alert("Delete customer feature coming soon");
        }
    };

    // ==================== MAIN DASHBOARD FUNCTION ====================

    const loadOwnerDashboard = async function() {
        try {
            showLoading("customersContainer", "Loading customers...");
            
            console.log("🔄 Loading customers from:", `${window.API_BASE}/api/customers`);
            
            const response = await fetch(`${window.API_BASE}/api/customers`);
            console.log("📡 Response status:", response.status);
            
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
    };

    // ==================== EXPOSE FUNCTIONS TO GLOBAL SCOPE ====================

    window.calculateCustomerStatus = calculateCustomerStatus;
    window.calculateDaysStatus = calculateDaysStatus;
    window.showLoading = showLoading;
    window.showError = showError;
    window.updateAnalytics = updateAnalytics;
    window.setupFilters = setupFilters;
    window.applyFilters = applyFilters;
    window.sortCustomers = sortCustomers;
    window.updateCustomerCount = updateCustomerCount;
    window.clearAllFilters = clearAllFilters;
    window.renderCustomerList = renderCustomerList;
    window.viewCustomerDetails = viewCustomerDetails;
    window.renderPaymentHistory = renderPaymentHistory;
    window.editCustomer = editCustomer;
    window.addPayment = addPayment;
    window.deletePayment = deletePayment;
    window.deleteCustomer = deleteCustomer;
    window.loadOwnerDashboard = loadOwnerDashboard;

    // ==================== INITIALIZATION ====================

    const initializeOwnerDashboard = function() {
        console.log("🏁 Owner Dashboard Initialized");
        console.log("🌐 Final API Base:", window.API_BASE);

        // Basic event listeners
        const backToListBtn = document.getElementById("backToListBtn");
        const addCustomerBtn = document.getElementById("addCustomerBtn");
        const saveCustomerBtn = document.getElementById("saveCustomerBtn");
        const cancelAddBtn = document.getElementById("cancelAddBtn");
        const ownerLogoutBtn = document.getElementById("ownerLogoutBtn");
        const searchInput = document.getElementById("searchCustomer");

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
            });
        }

        if (saveCustomerBtn) {
            saveCustomerBtn.addEventListener("click", async () => {
                const name = document.getElementById("newCustName").value.trim();
                const phone = document.getElementById("newCustPhone").value.trim();
                const address = document.getElementById("newCustAddress").value.trim();
                const startDate = document.getElementById("newCustStart").value;
                const totalLoanAmount = parseFloat(document.getElementById("newCustDue").value) || 0;

                if (!name || !phone) {
                    alert("Name and phone are required!");
                    return;
                }

                const newCustomer = { 
                    name, 
                    phone, 
                    address, 
                    loanStartDate: startDate, 
                    totalLoanAmount, 
                    dailyPayment: Math.round(totalLoanAmount / 100), 
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
                        alert("✅ Customer added successfully!");
                        document.getElementById("addCustomerForm").classList.add("hidden");
                        document.getElementById("customerList").classList.remove("hidden");
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
                document.getElementById("addCustomerForm").classList.add("hidden");
                document.getElementById("customerList").classList.remove("hidden");
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
                    c.name.toLowerCase().includes(term) || 
                    c.phone.includes(term) || 
                    c.address.toLowerCase().includes(term)
                );
                updateCustomerCount(filtered.length);
                renderCustomerList(filtered);
            });
        }

        // Load dashboard
        loadOwnerDashboard();
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOwnerDashboard);
    } else {
        initializeOwnerDashboard();
    }

})(); // End of IIFE
