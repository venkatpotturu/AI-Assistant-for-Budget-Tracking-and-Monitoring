/* ========================================
   MAIN APPLICATION (JWT + BACKEND)
======================================== */

console.log("🚀 Smart Expense Tracker Initialized");

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // ❌ Not logged in → show auth screen
    if (!token || !user) {
        showAuthScreen();
        return;
    }

    // ✅ Logged in → show app
    showApp();
    applyUserSettings();
    loadUserProfile(user);

    // Load backend-powered data
    fetchTransactions();        // from transactions.js
    fetchNotifications();     // from analytics.js
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
});

/* ========================================
   BALANCE SIMULATOR
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("balanceSlider");
    const simulatedBalance = document.getElementById("simulatedBalance");
    const weeklyCapacity = document.getElementById("weeklyCapacity");
    const monthlyProjection = document.getElementById("monthlyProjection");
    const potentialSavings = document.getElementById("potentialSavings");

    if (!slider) return;

    function updateSimulator(value) {
        const balance = Number(value);

        // Simple assumptions
        const weekly = balance * 0.25;   // 25% weekly
        const monthly = balance * 0.8;   // 80% monthly usage
        const savings = balance * 0.2;   // 20% savings

        simulatedBalance.innerText = formatCurrency(balance);
        weeklyCapacity.innerText = formatCurrency(weekly);
        monthlyProjection.innerText = formatCurrency(monthly);
        potentialSavings.innerText = formatCurrency(savings);
    }

    // Initial load
    updateSimulator(slider.value);

    // On slider change
    slider.addEventListener("input", (e) => {
        updateSimulator(e.target.value);
    });
});

async function loadFinancialHealth() {
    try {
        const res = await apiFetch("/api/ai/financial-health");
        const data = await res.json();

        document.getElementById("savingsRate").innerText =
            data.score + "%";

        showNotification(
            `Financial Health: ${data.level} (${data.score}/100)`,
            "info"
        );

    } catch (err) {
        console.error(err);
    }
}

loadFinancialHealth();

window.addEventListener("transactionAdded", async () => {

    await fetchTransactions();
    await fetchNotifications();

    // Ensure charts exist before calling
    if (typeof renderSpendingChart === "function")
        await renderSpendingChart();

    if (typeof renderIncomeChart === "function")
        await renderIncomeChart();

    if (typeof renderCategoryChart === "function")
        await renderCategoryChart();

    if (typeof renderMonthlyChart === "function")
        await renderMonthlyChart();

});

async function fetchNotifications(){

    const res = await apiFetch("/api/analytics/notifications");
    if(!res) return;

    const notifications = await res.json();
    if(!notifications.length) return;

    showNotificationsModal(notifications);
}

function showNotificationsModal(list){

    const icons = {
        warning: "#ef4444",
        tip: "#f59e0b",
        success: "#10b981"
    };

    let html = `<div class="notification-list">`;

    list.forEach(n => {
        html += `
        <div class="notification-item">
            <i class="fas fa-circle" style="color:${icons[n.type]};"></i>
            <div>
                <h4>${n.title}</h4>
                <p>${n.message}</p>
            </div>
        </div>`;
    });

    html += `</div>`;

    showModal("Notifications", html);
}

window.addEventListener("settingsChanged", async () => {

    await fetchTransactions();
    await refreshAllCharts();

});