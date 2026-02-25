function resetCanvas(canvasId){
    const oldCanvas = document.getElementById(canvasId);
    if(!oldCanvas) return null;

    const parent = oldCanvas.parentNode;
    const newCanvas = document.createElement("canvas");
    newCanvas.id = canvasId;

    parent.replaceChild(newCanvas, oldCanvas);
    return newCanvas;
}
/* ========================================
   CHARTS & VISUALIZATIONS (BACKEND + JWT)
======================================== */


let spendingChart = null;
let categoryChart = null;
let incomeChart = null;


/* ========================================
   DAILY SPENDING TREND (LINE CHART)
======================================== */

async function renderSpendingChart() {
    const canvas = resetCanvas("spendingChart");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const token = localStorage.getItem("token");

    const response = await apiFetch(`/api/analytics/daily`, {
        headers: {
            "Authorization": `Bearer ${token}`
        },
        cache: "no-store"
    });

    const data = await response.json();
    if (!data || !data.length) return;

    const labels = data.map(d => d.date);
    const values = data.map(d => d.amount);


    spendingChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Daily Expenses",
                data: values,
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: "#6366f1",
                pointBorderColor: "#fff",
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `Spent: ${formatCurrency(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: Math.max(...values) * 1.2 || 1000,
                    ticks: {
                        stepSize: Math.max(...values) / 5 || 100,
                        callback: val => "₹" + val
                    }
                }

            }
        }
    });
}
async function renderIncomeChart() {
    const canvas = resetCanvas("incomeChart");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    const response = await apiFetch(`/api/analytics/daily-income`, {
        cache: "no-store"
    });
    const data = await response.json();

    if (!data || !data.length) return;

    const labels = data.map(d => d.date);
    const values = data.map(d => d.amount);

    

    incomeChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Daily Income",
                data: values,
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.1)",
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: val => "₹" + val
                    }
                }
            }
        }
    });
}
/* ========================================
   CATEGORY WISE (DOUGHNUT CHART)
======================================== */

async function renderCategoryChart() {
    const canvas = resetCanvas("categoryChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const token = localStorage.getItem("token");

    const response = await apiFetch(`/api/analytics/category`, {
        headers: {
            "Authorization": `Bearer ${token}`
        },
        cache: "no-store"
    });

    const data = await response.json();
    if (!data.length) return;

    const labels = data.map(d => d.category);
    const values = data.map(d => d.total);

    const colors = [
        "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
        "#f59e0b", "#10b981", "#3b82f6", "#14b8a6"
    ];

    

    categoryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { padding: 15 }
                }
            }
        }
    });
}

let monthlyChart = null;

async function renderMonthlyChart() {
    const canvas = resetCanvas("monthlyChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const response = await apiFetch(`/api/analytics/monthly`, {
        cache: "no-store"
    });
    const data = await response.json();
    if (!data || Object.keys(data).length === 0) return;

    const labels = Object.keys(data); // e.g. ["2026-01"]
    const income = labels.map(m => data[m].income || 0);
    const expense = labels.map(m => data[m].expense || 0);


    monthlyChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: income,
                    backgroundColor: "#10b981",
                    barThickness: 40
                },
                {
                    label: "Expense",
                    data: expense,
                    backgroundColor: "#ef4444",
                    barThickness: 40
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false   // ✅ THIS FIXES OVERLAP
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: Math.max(...income, ...expense) * 1.2 || 1000,
                    ticks: {
                        callback: val => "₹" + val
                    }
                }
            },
            plugins: {
                legend: {
                    position: "top"
                },
                tooltip: {
                    callbacks: {
                        label: ctx =>
                            `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
                    }
                }
            }
        }
    });
}

function renderChart(data) {
    const canvas = document.createElement("canvas");
    document.getElementById("chatMessages").appendChild(canvas);

    new Chart(canvas, {
        type: "pie",
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data)
            }]
        }
    });
}

async function refreshAllCharts(){
    await renderSpendingChart();
    await renderIncomeChart();
    await renderCategoryChart();
    await renderMonthlyChart();
}

document.addEventListener("DOMContentLoaded", async () => {
    await refreshAllCharts();
});