// config.js - FRONTEND CONFIGURATION
console.log("⚙️ Loading frontend configuration...");

// Global API configuration - FIXED VERSION
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:5000" 
    : "https://loanpro-backend-t41k.onrender.com";

// Set as global variable
window.API_BASE = API_BASE;

console.log("🌐 API Base:", window.API_BASE);
console.log("📍 Current Hostname:", window.location.hostname);
