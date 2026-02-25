/* ========================================
   TRANSACTION MANAGEMENT (BACKEND + JWT)
======================================== */

/* ========================================
   FETCH & ADD TRANSACTIONS
======================================== */

// Load transactions on page load

// Fetch all transactions from backend
async function fetchTransactions() {
    const response = await apiFetch(`/api/expenses/`);
    if (!response) return;
    
    const data = await response.json();

    const transactions = data.expenses || data; 

    displayRecentTransactions(transactions);
    displayAllTransactions(transactions);
    updateDashboard(transactions);
}

// Add transaction (expense)
async function addTransaction(transaction) {
    const response = await apiFetch(`/api/expenses/`, {
        method: "POST",
        body: JSON.stringify({
            description: transaction.description || transaction.category,
            title: transaction.description || transaction.category,
            amount: Number(transaction.amount),
            category: transaction.category,
            date: toISODate(transaction.date),
            type: transaction.type   // 🔥 THIS IS THE FIX
        })


    });

    if (response && response.ok) {
        showNotification("Transaction added successfully!", "success");

        const refreshed = await apiFetch(`/api/expenses/`);
        if (!refreshed) return;

        
        const refreshedData = await refreshed.json();
        const transactions = refreshedData.expenses || refreshedData;

        displayRecentTransactions(transactions);
        displayAllTransactions(transactions);
        updateDashboard(transactions);
    } else {
        showNotification("Failed to add transaction", "error");
    }
}


// Delete transaction
async function deleteTransaction(id) {
    const response = await apiFetch(`/api/expenses/${id}`, {
        method: "DELETE"
    });

    if (response && response.ok) {
        showNotification("Transaction deleted", "success");
        fetchTransactions();
    }
}

/* ========================================
   DASHBOARD CALCULATIONS
======================================== */

function updateDashboard(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;
    
    if (!transactions || !Array.isArray(transactions)) return;

    transactions.forEach(t => {
        const txnType = t.txn_type || t.type;

        if (txnType === "income") {
            totalIncome += Number(t.amount);
        } else {
            totalExpenses += Number(t.amount);
        }
    });


    const balance = totalIncome - totalExpenses;

    document.getElementById("totalIncome").innerText = formatCurrency(totalIncome);
    document.getElementById("totalExpenses").innerText = formatCurrency(totalExpenses);
    document.getElementById("currentBalance").innerText = formatCurrency(balance);

    const savingsRate =
        totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(0) : 0;

    document.getElementById("savingsRate").innerText = `${savingsRate}%`;
}



/* ========================================
   RECENT TRANSACTIONS
======================================== */

function displayRecentTransactions(transactions) {
    const recentList = document.getElementById("recentTransactionsList");
    if (!recentList) return;

    if (!transactions || !Array.isArray(transactions)) return;

    const recent = transactions.slice(-5).reverse();

    if (recent.length === 0) {
        recentList.innerHTML =
            '<p style="text-align:center;color:#6b7280;">No transactions yet</p>';
        return;
    }

    recentList.innerHTML = recent.map(t => `
        <div class="transaction-item ${t.txn_type || t.type}">
            <div class="transaction-info">
                <h4>${t.title || t.description}</h4>
                <p>${formatDate(t.date)} • ${t.category}</p>
            </div>
            <div class="transaction-amount ${t.txn_type || t.type}">
                ${(t.txn_type || t.type) === "income" ? "+" : "-"}${formatCurrency(t.amount)}
            </div>
        </div>
    `).join("");
}

/* ========================================
   ALL TRANSACTIONS
======================================== */

function displayAllTransactions(transactions) {

    const allList = document.getElementById("allTransactionsList");
    if (!allList) return;

    if (!transactions || !Array.isArray(transactions)) {
        console.warn("Invalid transactions data", transactions);
        return;
    }

    if (transactions.length === 0) {
        allList.innerHTML =
            '<p style="text-align:center;color:#6b7280;padding:20px;">No transactions found</p>';
        return;
    }

    allList.innerHTML = transactions.slice().reverse().map(t => `
        <div class="transaction-item ${t.txn_type || t.type} ${t.isUpdated ? "updated" : ""}"
            data-id="${t._id}"
            data-category="${t.category}"
            data-type="${t.txn_type || t.type}"
            data-amount="${t.amount}"
            data-title="${t.title || t.description}">
            <div class="transaction-info">
                <h4>${t.title || t.description}</h4>
                <p>${formatDate(t.date)} • ${t.category}</p>
            </div>
            <div style="display:flex;align-items:center;gap:15px;">
                <div class="transaction-amount ${t.txn_type || t.type}">
                    ${(t.txn_type || t.type) === "income" ? "+" : "-"}${formatCurrency(t.amount)}
                </div>
                <button class="btn-icon"
                        onclick="editTransaction('${t._id}')"
                        style="background:#e0f2fe;color:#0284c7;">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-icon"
                        onclick="deleteTransaction('${t._id}')"
                        style="background:#fee2e2;color:#ef4444;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join("");
}

window.editTransaction = function(id) {

    const item = document.querySelector(`[data-id='${id}']`);
    if (!item) return;

    const title = item.dataset.title;
    const category = item.dataset.category;
    const amount = item.dataset.amount;
    const txnType = item.dataset.type;

    item.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">

            <input type="text" id="edit-desc-${id}" 
                value="${title}" class="form-control">

            <input type="number" id="edit-amt-${id}" 
                value="${amount}" class="form-control">

            <select id="edit-type-${id}" class="form-control">
                <option value="expense" ${txnType==="expense"?"selected":""}>Expense</option>
                <option value="income" ${txnType==="income"?"selected":""}>Income</option>
            </select>

            <select id="edit-cat-${id}" class="form-control">
                <option ${category=="Food"?"selected":""}>Food</option>
                <option ${category=="Transport"?"selected":""}>Transport</option>
                <option ${category=="Shopping"?"selected":""}>Shopping</option>
                <option ${category=="Bills"?"selected":""}>Bills</option>
                <option ${category=="Entertainment"?"selected":""}>Entertainment</option>
                <option ${category=="Healthcare"?"selected":""}>Healthcare</option>
                <option ${category=="Salary"?"selected":""}>Salary</option>
                <option ${category=="Other"?"selected":""}>Other</option>
            </select>

            <button class="btn btn-primary"
                onclick="saveEditedTransaction('${id}')">
                Save
            </button>
        </div>
    `;
};


window.saveEditedTransaction = async function(id) {

    const desc = document.getElementById(`edit-desc-${id}`).value;
    const amount = document.getElementById(`edit-amt-${id}`).value;
    const category = document.getElementById(`edit-cat-${id}`).value;
    const type = document.getElementById(`edit-type-${id}`).value;

    try {

        await apiFetch(`/api/expenses/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description: desc,
                amount: Number(amount),
                category: category,
                type: type   // 🔥 IMPORTANT
            })
        });

        showNotification("Transaction updated", "success");
        notifyTransactionAdded();
        fetchTransactions();

    } catch(err) {
        console.error(err);
        showNotification("Update failed", "error");
    }
};

function notifyTransactionAdded(){
    window.dispatchEvent(new Event("transactionAdded"));
}

/* ========================================
   FORM HANDLER
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const transactionForm = document.getElementById("transactionForm");
    const transactionDate = document.getElementById("transactionDate");

    if (transactionDate) transactionDate.value = getTodayDate();

    transactionForm?.addEventListener("submit", e => {
        e.preventDefault();

        const transaction = {
            type: document.getElementById("transactionType").value, // ✅ HERE
            amount: Number(document.getElementById("transactionAmount").value),
            category: document.getElementById("transactionCategory").value,
            date: toISODate(document.getElementById("transactionDate").value),
            description: document.getElementById("transactionDescription").value
        };
        if (!transaction.type) {
            showNotification("Please select transaction type", "error");
            return;
        }


        if (transaction.amount <= 0) {
            showNotification("Please enter a valid amount", "error");
            return;
        }

        addTransaction(transaction);
        transactionForm.reset();
        transactionDate.value = getTodayDate();
    });
});

function toISODate(dateStr) {
    if (!dateStr) return null;

    // If already ISO
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 4)
        return dateStr;

    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

async function predictCategoryFromDescription() {

    const descInput = document.getElementById("transactionDescription");
    const categoryDropdown = document.getElementById("transactionCategory");
    const resultText = document.getElementById("aiCategoryResult");

    const desc = descInput.value.trim();

    if (!desc) {
        resultText.innerText = "⚠️ Enter description first";
        return;
    }

    resultText.innerText = "🤖 Predicting...";

    try {

        const res = await apiFetch("/api/ai/predict-category", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: desc })
        });

        const data = await res.json();

        if (data.category) {

            categoryDropdown.value = data.category;
            resultText.innerText = "AI Suggested: " + data.category;
        } else {
            resultText.innerText = "AI could not decide";
        }

    } catch (err) {
        console.error(err);
        resultText.innerText = "Prediction failed";
    }
}

document.getElementById("filterCategory")
?.addEventListener("change", filterTransactionsByCategory);

function filterTransactionsByCategory() {

    const selectedCategory = document.getElementById("filterCategory").value;

    const allTransactions = document.querySelectorAll(".transaction-item");

    allTransactions.forEach(txn => {

        const txnCategory = txn.getAttribute("data-category");

        if (!selectedCategory || txnCategory === selectedCategory) {
            txn.style.display = "flex";
        } else {
            txn.style.display = "none";
        }

    });
}

function applyTransactionFilters() {

    const selectedCategory = document.getElementById("filterCategory").value;
    const searchText = document.getElementById("searchTransactions").value.toLowerCase();

    const transactions = document.querySelectorAll("#allTransactionsList .transaction-item");

    transactions.forEach(txn => {

        const category = txn.getAttribute("data-category");
        const text = txn.innerText.toLowerCase();

        let show = true;

        if (selectedCategory && category !== selectedCategory) {
            show = false;
        }

        if (searchText && !text.includes(searchText)) {
            show = false;
        }

        txn.style.display = show ? "flex" : "none";
    });
}

let aiTimer = null;

function autoParseTransaction() {

    const desc = document.getElementById("transactionDescription").value;
    if (!desc || desc.length < 3) return;

    clearTimeout(aiTimer);

    aiTimer = setTimeout(async () => {

        try {

            const res = await apiFetch("/api/ai/parse-transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: desc })
            });

            const data = await res.json();

            if (data.category)
                document.getElementById("transactionCategory").value = data.category;

            if (data.type)
                document.getElementById("transactionType").value = data.type;

            if (data.amount)
                document.getElementById("transactionAmount").value = data.amount;

            // 👉 SHOW SUGGESTION INSTEAD OF OVERWRITING
            if (data.description) {

                document.getElementById("aiSuggestionBox").style.display = "block";

                document.getElementById("aiSuggestedDescription").value =
                    data.description;

                window.aiParsedData = data;
            }

            document.getElementById("aiCategoryResult").innerHTML =
                `🤖 AI Parsed: ${data.type || ""} • ${data.category || ""} • ${formatCurrency(data.amount || 0)}`;

        } catch (err) {
            console.error("AI parse failed", err);
        }

    }, 1000);
}


function applyAISuggestion() {

    if (!window.aiParsedData) return;

    document.getElementById("transactionCategory").value = window.aiParsedData.category;
    document.getElementById("transactionType").value = window.aiParsedData.type;
    document.getElementById("transactionAmount").value = window.aiParsedData.amount;

    document.getElementById("transactionDescription").value =
        document.getElementById("aiSuggestedDescription").value;

    document.getElementById("aiSuggestionBox").style.display = "none";
}

function rejectAISuggestion() {
    document.getElementById("aiSuggestionBox").style.display = "none";
} 

/* ========================================
   GLOBAL CURRENCY FORMATTER
======================================== */

function formatCurrency(value){

    const currency = window.selectedCurrency || "₹";

    return `${currency}${Number(value).toLocaleString()}`;
}

