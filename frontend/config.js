// config.js - FIXED VERSION WITH BETTER ERROR HANDLING
console.log("⚙️ Loading frontend configuration...");

try {
    // Global API configuration
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? "http://localhost:5000" 
        : "https://loanpro-backend-t41k.onrender.com";

    // Set as global variable
    window.API_BASE = API_BASE;

    console.log("✅ Config loaded successfully");
    console.log("🌐 API Base:", window.API_BASE);
    console.log("📍 Current Hostname:", window.location.hostname);
    console.log("🔗 Full URL:", window.location.href);
    
    // Verify the API is accessible
    fetch(`${window.API_BASE}/api/health`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => console.log("✅ Backend health check:", data))
        .catch(error => console.error("❌ Backend health check failed:", error));
        
} catch (error) {
    console.error("❌ Error in config:", error);
    // Fallback API base
    window.API_BASE = "https://loanpro-backend-t41k.onrender.com";
    console.log("🔄 Using fallback API:", window.API_BASE);
}
