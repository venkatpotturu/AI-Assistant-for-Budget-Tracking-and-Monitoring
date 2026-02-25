/* ========================================
   NAVIGATION SYSTEM
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    
    // Get all navigation items and pages
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('page-title');
    
    // Page titles mapping
    const pageTitles = {
        'dashboard': 'Dashboard',
        'transactions': 'Transactions',
        'balance-simulator': 'Balance Simulator',
        'anomaly-detection': 'Anomaly Detection',
        'smart-recommendations': 'Smart Recommendations',
        'voice-input': 'Voice Input',
        'receipt-upload': 'Receipt OCR',
        'category-heatmap': 'Category Heatmap'
    };
    
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Update active page
            pages.forEach(page => page.classList.remove('active'));
            const activePage = document.getElementById(targetPage);
            if (activePage) {
                activePage.classList.add('active');
            }
            
            // Update page title
            if (pageTitle && pageTitles[targetPage]) {
                pageTitle.textContent = pageTitles[targetPage];
            }
            
            // Trigger page-specific actions
            handlePageSwitch(targetPage);
        });
    });
    
    // Handle page-specific actions
    function handlePageSwitch(pageName) {
        switch(pageName) {
            case 'dashboard':
                fetchTransactions();

                if (typeof renderSpendingChart === "function")
                    renderSpendingChart();

                if (typeof renderIncomeChart === "function")
                    renderIncomeChart();

                if (typeof renderCategoryChart === "function")
                    renderCategoryChart();

                if (typeof renderMonthlyChart === "function")
                    renderMonthlyChart();

                break;
            case 'transactions':
                displayAllTransactions();
                break;
            case 'anomaly-detection':
                detectAnomalies();
                break;
            case 'smart-recommendations':
                generateRecommendations();
                break;
            case 'receipt-upload':
                setTimeout(() => {
                    if (typeof initOCRUpload === "function") {
                        initOCRUpload();
                    }
                }, 100);
                break;
            case 'category-heatmap':
                generateHeatmap();
                renderCategoryChart();
                break;
        }
    }
    
    // Modal functionality
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Notification button
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async function() {

            const res = await apiFetch("/api/analytics/notifications");
            if(!res) return;

            const data = await res.json();

            if(!data.length){
                showModal("Notifications", `
                    <div class="notification-item">
                        <i class="fas fa-check-circle" style="color:#10b981"></i>
                        <div>
                            <h4>All Good 🎉</h4>
                            <p>No alerts today</p>
                        </div>
                    </div>
                `);
                return;
            }

            let html = `<div class="notification-list">`;

            data.forEach(n => {

                let icon = "fa-check-circle";
                let color = "#10b981";

                if(n.type === "warning"){
                    icon = "fa-exclamation-triangle";
                    color = "#ef4444";
                }
                else if(n.type === "tip"){
                    icon = "fa-lightbulb";
                    color = "#f59e0b";
                }

                html += `
                    <div class="notification-item">
                        <i class="fas ${icon}" style="color:${color}"></i>
                        <div>
                            <h4>${n.title}</h4>
                            <p>${n.message}</p>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;

            showModal("Notifications", html);
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {

            const user = JSON.parse(localStorage.getItem("user")) || {};

            showModal('Settings', `
                <div class="settings-content">

                    <div class="setting-item">
                        <label>Name</label>
                        <input 
                            id="settingsName"
                            class="form-control"
                            value="${user.name || ""}"
                        >
                    </div>

                    <div class="setting-item">
                        <label>Email</label>
                        <input 
                            id="settingsEmail"
                            class="form-control"
                            value="${user.email || ""}"
                        >
                    </div>

                    <div class="setting-item">
                        <label>Theme</label>
                        <select id="settingsTheme" class="form-control">
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                        </select>
                    </div>

                    <br>

                    <button class="btn btn-primary"
                        onclick="updateProfileSettings()">
                        Save Changes
                    </button>

                </div>
            `);

            setTimeout(() => {
                const settings = getUserSettings();
                document.getElementById("settingsTheme").value = settings.theme;
            }, 100);
        });
    }
    
    function showModal(title, content) {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = content;
        modal.style.display = 'block';
    }

        /* ========================================
       PROFILE DROPDOWN (ADD THIS)
    ======================================== */

    const userProfile = document.getElementById("userProfile");
    const profileDropdown = document.getElementById("profileDropdown");

    if (userProfile && profileDropdown) {
        userProfile.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("show");
        });

        document.addEventListener("click", () => {
            profileDropdown.classList.remove("show");
        });
    }

});

setTimeout(() => {
    if (document.getElementById("receipt-upload")?.classList.contains("active")) {
        initOCRUpload();
    }
}, 300);

window.addEventListener("transactionAdded", async () => {

    const res = await apiFetch("/api/analytics/notifications");
    if (!res) return;

    const data = await res.json();

    // Optional: badge update logic later
});
