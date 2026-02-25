/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

// Format currency
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get data from localStorage
function getLocalData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Save data to localStorage
function saveLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #f87171)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #3b82f6, #60a5fa)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Calculate percentage
function calculatePercentage(value, total) {
    return total > 0 ? ((value / total) * 100).toFixed(1) : 0;
}

// Get random color
function getRandomColor() {
    const colors = [
        '#6366f1', '#8b5cf6', '#10b981', '#ef4444', 
        '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        return null; // ⛔ do nothing if not logged in
    }

    options.headers = {
        ...(options.headers || {}),
        "Authorization": token ? `Bearer ${token}` : "",
        "Content-Type": "application/json"
    };

    const response = await fetch(url, options);

    // 🔐 AUTO LOGOUT IF TOKEN EXPIRED
    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        alert("Session expired. Please login again.");
        location.reload();
        return null;
    }

    return response;
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}
