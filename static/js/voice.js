const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.lang = 'en-US';
let silenceTimer;
const SILENCE_LIMIT = 2000; // 4 seconds
recognition.continuous = true;
recognition.interimResults = true;

const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const voiceTranscript = document.getElementById("voiceTranscript");

let isListening = false;

voiceBtn.addEventListener("click", () => {

    if(isListening){
        recognition.stop();
        isListening = false;
        return;
    }

    recognition.start();
    isListening = true;
});

recognition.onresult = function(event){

    clearTimeout(silenceTimer);

    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
    }

    transcript = transcript.toLowerCase();

    if(transcript.includes("ok add") && pendingDraft){
        recognition.stop();
        confirmAdd();
        return;
    }

    silenceTimer = setTimeout(() => {
        recognition.stop();
        voiceStatus.innerText = "Processing...";
        sendVoiceTextToBackend(transcript);
    }, SILENCE_LIMIT);
};

recognition.onend = function() {
    voiceStatus.innerText = "Click to start voice input";
};

recognition.onend = function() {
    isListening = false;
};

async function sendVoiceTextToBackend(text){

    const res = await fetch("/voice-text", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({text})
    });

    const data = await res.json();

    if(data.review){
        showVoiceReview(data.review);
        voiceStatus.innerText = "";
    }
}

function showVoiceReview(data){

    const table = document.getElementById("extractedTransactionsTableBody");

    const typeClass = data.type === "income" ? "income" : "expense";

    table.innerHTML = `
    <tr>
        <td><input value="${data.description}" /></td>

        <td><input type="number" value="${data.amount}" /></td>

        <td>
            <select>
                <option ${data.category==="Food"?"selected":""}>Food</option>
                <option ${data.category==="Transportation"?"selected":""}>Transportation</option>
                <option ${data.category==="Shopping"?"selected":""}>Shopping</option>
                <option ${data.category==="Bills"?"selected":""}>Bills</option>
                <option ${data.category==="Entertainment"?"selected":""}>Entertainment</option>
                <option ${data.category==="Healthcare"?"selected":""}>Healthcare</option>
                <option ${data.category==="Salary"?"selected":""}>Salary</option>
                <option ${data.category==="Other"?"selected":""}>Other</option>
            </select>
        </td>

        <td>
            <select>
                <option ${data.type==="expense"?"selected":""}>expense</option>
                <option ${data.type==="income"?"selected":""}>income</option>
            </select>
        </td>

        <td><input type="date" value="${formatDateForInput()}" /></td>

        <td style="color:#f59e0b;font-weight:600;">⚠ Review</td>

        <td><button onclick="confirmVoiceAdd()">Add</button></td>
    </tr>
    `;
}

function formatDateForInput(){
    const d = new Date();
    return d.toISOString().split("T")[0];
}

async function confirmVoiceAdd(){

    const row = document.querySelector("#extractedTransactionsTableBody tr");
    if(!row) return;

    const description = row.children[0].querySelector("input").value;
    const amount = row.children[1].querySelector("input").value;
    const category = row.children[2].querySelector("select").value;
    const type = row.children[3].querySelector("select").value;
    const date = row.children[4].querySelector("input").value;

    const res = await apiFetch("/api/expenses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: description,
            amount: Number(amount),
            category: category,
            date: date,
            type: type,
            description: description
        })
    });

    if(res && res.ok){

        // 🔥 Wait for backend commit
        await new Promise(r => setTimeout(r, 200));

        // ✅ Trigger global refresh
        notifyTransactionAdded();

        // ✅ Clean UI
        document.getElementById("extractedTransactionsTableBody").innerHTML = "";

        // ✅ Notification
        showNotification("Transaction added successfully", "success");
    }
}



let pendingDraft = null;

function showDraft(draft){

    pendingDraft = draft;

    document.getElementById("voiceDraft").classList.remove("hidden");

    document.getElementById("draftTitle").innerText = draft.title;
    document.getElementById("draftAmount").innerText = draft.amount;
    document.getElementById("draftCategory").innerText = draft.category;
    document.getElementById("draftType").innerText = draft.type;
    document.getElementById("draftDate").innerText = draft.date;
    document.getElementById("draftDesc").innerText = draft.description;
}

async function confirmAdd(){

    const token = localStorage.getItem("token");

    const today = new Date().toISOString().split('T')[0];

    await fetch("/api/expenses/",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`
        },
        body: JSON.stringify({
            title: pendingDraft.title,
            amount: pendingDraft.amount,
            category: pendingDraft.category,
            date: today,
            type: pendingDraft.type,
            description: pendingDraft.description
        })
    });

    voiceStatus.innerText = "Transaction Added!";
    pendingDraft = null;
    document.getElementById("voiceDraft").classList.add("hidden");
}