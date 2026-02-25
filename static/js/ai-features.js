/* ========================================
   AI-LIKE FEATURES
   ======================================== */

   
// Balance Simulator
document.addEventListener('DOMContentLoaded', function() {
    const balanceSlider = document.getElementById('balanceSlider');
    const simulatedBalance = document.getElementById('simulatedBalance');
    const weeklyCapacity = document.getElementById('weeklyCapacity');
    const monthlyProjection = document.getElementById('monthlyProjection');
    const savingsRate = document.getElementById('savingsRate');
    
    if (balanceSlider) {
        balanceSlider.addEventListener('input', function(e) {
            const balance = Number(e.target.value);
            
            if (simulatedBalance) {
                simulatedBalance.textContent = formatCurrency(balance);
            }
            
            // Calculate projections
            const weekly = balance / 4;
            const monthly = balance * 0.8;
            const savings = ((balance / 50000) * 100).toFixed(0);
            
            if (weeklyCapacity) weeklyCapacity.textContent = formatCurrency(weekly);
            if (monthlyProjection) monthlyProjection.textContent = formatCurrency(monthly);
            if (savingsRate) savingsRate.textContent = Math.min(savings, 100) + '%';
        });
    }
});

let selectedLanguage = "en";

function setLanguage(lang, btn) {
    selectedLanguage = lang;

    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.remove("active");
    });

    btn.classList.add("active");
}


// Smart Recommendations
async function generateSmartInsights() {
    const list = document.getElementById("recommendationsList");
    list.innerHTML = "<li>Analyzing your spending...</li>";

    try {
        // 1. Fetch real expenses from DB
        const res = await apiFetch("/api/expenses");
        const transactions = await res.json();

        const expenses = transactions
            .filter(t => t.txn_type === "expense")
            .map(t => ({
                amount: Number(t.amount),
                category: t.category,
                date: t.date
            }));

        if (expenses.length === 0) {
            list.innerHTML = "<li>No expense data found</li>";
            return;
        }

        // 2. Call AI insights backend
        const aiRes = await apiFetch("/generate-insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expenses })
        });

        const data = await aiRes.json();

        list.innerHTML = "";
        if (Array.isArray(data.advice)) {
            data.advice.forEach(msg => {
                const li = document.createElement("li");
                li.innerText = msg;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = `<li>${data.advice}</li>`;
        }

    } catch (err) {
        console.error(err);
        list.innerHTML = "<li>Failed to load insights</li>";
    }
}

async function runWhatIfAnalysis() {
    const output = document.getElementById("whatIfOutput");
    output.innerText = "Calculating...";

    try {
        const res = await apiFetch("/api/expenses");
        const transactions = await res.json();

        const foodExpenses = transactions
            .filter(t => t.txn_type === "expense" && t.category === "Food")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const savings = foodExpenses * 0.10;

        output.innerText =
            `If you reduce Food spending by 10%, you can save ₹${savings.toFixed(0)} this month.`;

    } catch (err) {
        console.error(err);
        output.innerText = "What-if analysis failed";
    }
}

// Category Heatmap
async function generateHeatmap() {
    const heatmapGrid = document.getElementById('heatmapGrid');
    if (!heatmapGrid) return;

    const response = await apiFetch("/api/expenses");
    const transactions = await response.json();

    const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare'];
    const categoryData = {};

    categories.forEach(cat => {
        categoryData[cat] = transactions
            .filter(t => t.txn_type === 'expense' && t.category === cat)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    });

    const maxAmount = Math.max(...Object.values(categoryData), 1);

    heatmapGrid.innerHTML = categories.map(cat => {
        const intensity = categoryData[cat] / maxAmount;
        let heatClass = 'heat-low';
        if (intensity > 0.6) heatClass = 'heat-high';
        else if (intensity > 0.3) heatClass = 'heat-medium';

        return `
            <div class="heatmap-cell ${heatClass}">
                <h4>${cat}</h4>
                <p>${formatCurrency(categoryData[cat])}</p>
            </div>
        `;
    }).join('');
}

async function analyzeAnomaliesFromDB() {
    const anomalyList = document.getElementById("anomalyList");

    if (!anomalyList) {
        console.error("anomalyList div not found");
        return;
    }

    anomalyList.innerHTML = "<p>🧠 Analyzing your spending behavior...</p>";

    try {
        const response = await apiFetch("/api/ai/anomaly-analysis");
        const data = await response.json();

        if (data.anomalies_detected === 0) {
            anomalyList.innerHTML = `
                <div style="color:#10b981;font-weight:600;">
                    ✅ No unusual spending detected. You are managing your finances well.
                </div>
            `;
            return;
        }

        anomalyList.innerHTML = data.anomalies.map(a => `
            <div class="transaction-item anomaly">
                <div class="transaction-info">
                    <h4>${a.category}</h4>
                    <p><strong>Why risky:</strong> ${a.why_risky}</p>
                    <small>Avg ₹${a.avg} | Threshold ₹${a.threshold}</small>
                </div>
                <div class="transaction-amount expense">
                    ₹${a.amount}
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error(err);
        anomalyList.innerHTML =
            "<p style='color:red'>Failed to analyze anomalies</p>";
    }
}


async function loadDisciplineScore() {
    try {
        const res = await apiFetch("/api/ai/discipline-score");
        const data = await res.json();

        showNotification(
            `Discipline Score: ${data.score}/100 (${data.level})`,
            "info"
        );
    } catch (err) {
        console.error(err);
    }
}

async function loadBudgetAlerts() {
    try {
        const res = await apiFetch("/api/ai/budget-alerts");
        const data = await res.json();

        if (data.alerts_detected === 0) {
            showNotification("No budget breaches this month 🎉", "success");
            return;
        }

        data.alerts.forEach(a => {
            showNotification(
                `${a.category}: ₹${a.spent} / ₹${a.limit}`,
                "warning"
            );
        });

    } catch (err) {
        console.error(err);
    }
}

async function analyzeSpendingInsights() {
    const list = document.getElementById("spendingInsights");

    if (!list) {
        console.error("spendingInsights element not found");
        return;
    }

    list.innerHTML = "<li>🧠 AI is analyzing your spending behavior...</li>";

    try {
        const res = await apiFetch("/api/ai/spending-insights");
        const data = await res.json();

        list.innerHTML = "";

        data.insights.forEach(insight => {
            const li = document.createElement("li");
            li.innerText = insight;
            list.appendChild(li);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = "<li>Failed to analyze spending behavior</li>";
    }
}

function appendUserMessage(text) {
    const chat = document.getElementById("chatMessages");

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message user";

    const bubble = document.createElement("div");
    bubble.className = "user-bubble";
    bubble.innerText = text;

    wrapper.appendChild(bubble);
    chat.appendChild(wrapper);

    chat.scrollTop = chat.scrollHeight;
}

function appendBotMessage(text) {
    const chat = document.getElementById("chatMessages");
    scrollChatIfNearBottom();

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message ai";

    const card = document.createElement("div");
    card.className = "ai-card";

    card.innerHTML = `
        <div class="ai-header">🤖 Financial Assistant</div>
        <div class="ai-body">${text}</div>
    `;

    wrapper.appendChild(card);
    chat.appendChild(wrapper);

    chat.scrollTop = chat.scrollHeight;
}



function sendQuick(text) {
    document.getElementById("chatInput").value = text;
    sendChatMessage();
}


function formatAIText(text) {
    return text
        .replace(/Top Spending Category:/gi, "<h4>📊 Top Spending Category</h4>")
        .replace(/Detected Patterns/gi, "<h4>🔍 Detected Patterns</h4>")
        .replace(/AI Advice/gi, "<h4>💡 AI Advice</h4>")
        .replace(/₹(\d+)/g, "<span class='money'>₹$1</span>")
        .replace(/\n/g, "<br>");
}


function renderSpendingTable(text) {
    /*
      Expected text example:
      Category Amount
      Food ₹1300
      Entertainment ₹1000
    */

    const lines = text.split("\n").filter(l => l.trim());
    let rows = [];

    lines.forEach(line => {
        const match = line.match(/([A-Za-z]+)\s+₹?(\d+)/);
        if (match) {
            rows.push({ category: match[1], amount: match[2] });
        }
    });

    if (rows.length === 0) return text;

    let table = `
        <table class="chat-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(r => {
        table += `
            <tr>
                <td>${r.category}</td>
                <td class="highlight">₹${r.amount}</td>
            </tr>
        `;
    });

    table += `
            </tbody>
        </table>
        <p class="table-note">
            This breakdown shows where most of your money is going.
        </p>
    `;

    return table;
}

function detectLanguage(text) {
    if (/[అ-హ]/.test(text)) return "te";   // Telugu
    if (/[ಅ-ಹ]/.test(text)) return "kn";   // Kannada
    if (/[अ-ह]/.test(text)) return "hi";   // Hindi
    return "en";                            // Default English
}


async function sendChatMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    // Auto-detect language if toggle is English
    const detectedLang = detectLanguage(message);

    // Toggle language takes priority over auto-detect
    const finalLanguage = selectedLanguage !== "en"
        ? selectedLanguage
        : detectedLang;

    if (!message) return;

    appendUserMessage(message);
    input.value = "";

    appendBotMessage("Analyzing your finances...");

    try {
        const res = await apiFetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: message,
                language: finalLanguage
             })
        });

        const data = await res.json();

        // remove "thinking"
        document.getElementById("chatMessages").lastChild.remove();

        /* ---------- RESPONSE HANDLING (FIXED) ---------- */

        // TABLE response
        if (data.type === "table" && data.data) {
            if (data.reply) {
                appendBotMessage(data.reply);
            }
            appendTableMessage(data.data);
            return;
        }

        // CHART response
        if (data.type === "chart" && data.data) {
            if (data.reply) {
                appendBotMessage(data.reply);
            }
            appendChartMessage(data.data);
            return;
        }

        // NORMAL TEXT response
        if (data.reply) {
            appendBotMessage(data.reply);
        } else {
            appendBotMessage("I couldn't understand the response.");
        }

        /* ------------------------------------------------ */


    } catch (err) {
        console.error(err);
        appendBotMessage("Something went wrong. Please try again.");
    }
}

function appendTableMessage(tableData) {
    const chat = document.getElementById("chatMessages");

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message ai";

    // ✅ tableData is an ARRAY, not an object
    let rows = tableData.map(row => {
        let amount = row.amount;

        // safety check (in case backend sends object)
        if (typeof amount === "object") {
            amount = amount.$numberDouble || amount.$numberInt || 0;
        }

        return `
            <tr>
                <td>${row.category}</td>
                <td>₹${Number(amount).toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    wrapper.innerHTML = `
        <div class="ai-card">
            <div class="ai-header">📊 Expense Table</div>
            <table class="ai-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;

    chat.appendChild(wrapper);
    scrollChatIfNearBottom();
}

function appendChartMessage(chartData) {
    const chat = document.getElementById("chatMessages");

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message ai";

    // ✅ Size-controlled container
    const chartContainer = document.createElement("div");
    chartContainer.style.width = "280px";
    chartContainer.style.height = "280px";
    chartContainer.style.margin = "10px auto";

    const canvas = document.createElement("canvas");
    chartContainer.appendChild(canvas);
    wrapper.appendChild(chartContainer);
    chat.appendChild(wrapper);

    new Chart(canvas, {
        type: "pie",
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                data: Object.values(chartData),
                backgroundColor: ["#6366f1","#22c55e","#f97316","#ef4444"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // 🔥 VERY IMPORTANT
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });

    scrollChatIfNearBottom();
}


async function loadSpendingBehavior() {
    const output = document.getElementById("behaviorOutput");
    output.innerHTML = "🧠 Analyzing your financial habits...";

    try {
        const res = await apiFetch("/api/ai/spending-behavior");
        const data = await res.json();

        let html = `
            <p><strong>${data.summary}</strong></p>
            <p><strong>Top Spending Category:</strong> ${data.top_category}</p>
            <h4>Detected Patterns</h4>
            <ul>
                ${data.patterns.map(p => `<li>${p}</li>`).join("")}
            </ul>
            <h4>AI Advice</h4>
            <ul>
                ${data.advice.map(a => `<li>${a}</li>`).join("")}
            </ul>
        `;

        output.innerHTML = html;

    } catch (err) {
        console.error(err);
        output.innerHTML = "❌ Failed to analyze spending behavior.";
    }
}

async function loadGeminiSpendingInsights() {
    const output = document.getElementById("geminiBehaviorOutput");
    output.innerHTML = "🤖 GROQ AI is analyzing your spending...";

    try {
        const res = await apiFetch("/api/ai/spending-behavior-ai");
        const data = await res.json();

        output.innerHTML = `
            <div class="ai-insight-box">
                <pre style="white-space: pre-wrap; font-family: inherit;">
${data.insights}
                </pre>
            </div>
        `;
    } catch (err) {
        console.error(err);
        output.innerHTML = "❌ AI analysis failed.";
    }
}

async function explainScore() {
    const output = document.getElementById("scoreExplanation");
    output.innerText = "Analyzing your discipline...";

    try {
        const res = await apiFetch("/api/ai/discipline-explanation");
        const data = await res.json();

        output.innerText = data.explanation;
    } catch (err) {
        console.error(err);
        output.innerText = "Failed to explain score.";
    }
}

function renderTable(data) {
    let rows = Object.entries(data).map(
        ([k, v]) => `<tr><td>${k}</td><td>₹${v}</td></tr>`
    ).join("");

    return `
        <table class="ai-table">
            <tr><th>Category</th><th>Amount</th></tr>
            ${rows}
        </table>
    `;
}

function scrollChatIfNearBottom() {
    const chat = document.getElementById("chatMessages");
    const threshold = 120; // px from bottom

    const isNearBottom =
        chat.scrollHeight - chat.scrollTop - chat.clientHeight < threshold;

    if (isNearBottom) {
        chat.scrollTop = chat.scrollHeight;
    }
}

window.addEventListener("transactionAdded", async () => {
    await generateHeatmap();
});