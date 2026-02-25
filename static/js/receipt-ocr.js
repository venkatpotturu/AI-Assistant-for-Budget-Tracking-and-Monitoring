let receiptPreview;
let uploadZone;
let fileInput;
let previewBox;

let currentFileType = null;
let loadedImage = null;
let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;

let isPanning = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;


function initOCRUpload() {

    uploadZone = document.getElementById("uploadZone");
    fileInput = document.getElementById("receiptInput");
    previewBox = document.getElementById("ocrPreview");

    const previewBoxArea = document.querySelector(".pdf-preview-box");
    const canvas = document.getElementById("pdfCanvas");

    if (!uploadZone || !fileInput || !previewBoxArea || !canvas) return;

    // ---------------- CLICK UPLOAD ----------------
    uploadZone.onclick = () => fileInput.click();

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        uploadFile(file);
    };

    // ---------------- DRAG UPLOAD ----------------
    uploadZone.ondragover = (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragging");
    };

    uploadZone.ondragleave = () => {
        uploadZone.classList.remove("dragging");
    };

    uploadZone.ondrop = (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragging");
        const file = e.dataTransfer.files[0];
        uploadFile(file);
    };

    // ---------------- PAN (DRAG TO MOVE) ----------------
    previewBoxArea.addEventListener("mousedown", (e) => {
        isPanning = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        previewBoxArea.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", () => {
        isPanning = false;
        previewBoxArea.style.cursor = "grab";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;

        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;

        applyZoom();
    });

    // ---------------- SCROLL ZOOM ----------------
    previewBoxArea.addEventListener("wheel", (e) => {

        e.preventDefault();

        const zoomIntensity = 0.1;

        if (e.deltaY < 0) {
            scale += zoomIntensity;
        } else {
            scale = Math.max(0.5, scale - zoomIntensity);
        }

        applyZoom();
    });

}



async function uploadFile(file) {
    offsetX = 0;
    offsetY = 0;
    scale = 1.5;
    currentPage = 1;

    const fileURL = URL.createObjectURL(file);
    const canvas = document.getElementById("pdfCanvas");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // IMAGE PREVIEW
    if (file.type.includes("image")) {

        currentFileType = "image";
        loadedImage = new Image();

        loadedImage.onload = () => {
            drawImageOnCanvas();
        };

        loadedImage.src = fileURL;
    }

    // PDF PREVIEW
    else if (file.type.includes("pdf")) {
        currentFileType = "pdf";
        renderPDF(fileURL);
    }



    // OCR Loader
    previewBox.innerHTML = "⏳ Extracting receipt data...";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/ocr/extract", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: formData
        });

        const data = await res.json();

        if (data.transactions) {
            renderPreview(data.transactions);
        } else {
            previewBox.innerHTML = "❌ Could not extract data.";
        }

    } catch (err) {
        previewBox.innerHTML = "⚠️ Upload failed.";
        console.error(err);
    }
}

function drawImageOnCanvas() {

    const canvas = document.getElementById("pdfCanvas");
    if (!canvas || !loadedImage) return;

    const ctx = canvas.getContext("2d");

    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImage, 0, 0);

    applyZoom();
}

function applyZoom() {

    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;

    canvas.style.transformOrigin = "top left";
    canvas.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}



function renderPreview(transactions) {

    let html = `
        <div class="ocr-preview-card">

            <div class="ocr-header">
                📄 Extracted Transactions
                <span class="ocr-sub">Review before adding</span>
            </div>

            <table class="ocr-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount (₹)</th>
                        <th>Category</th>
                        <th>Type</th>   <!-- ADD THIS -->
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    transactions.forEach((txn, index) => {

        let needsReview = txn.confidence < 0.75;

        html += `
            <tr id="row-${index}" class="${needsReview ? 'review-row' : ''}">
                <td>
                    <input class="ocr-input"
                        value="${txn.description}"
                        id="desc-${index}">
                </td>

                <td>
                    <input class="ocr-input"
                        value="${txn.amount}"
                        id="amt-${index}">
                </td>

                <td>
                    <select class="ocr-select" id="cat-${index}">
                        ${renderCategoryOptions(txn.category)}
                    </select>
                </td>

                <td>
                    <select class="ocr-select" id="type-${index}">
                        <option value="expense" selected>Expense</option>
                        <option value="income">Income</option>
                    </select>
                </td>
                
                <td>
                    <input type="date"
                        class="ocr-input"
                        value="${txn.date}"
                        id="date-${index}">
                </td>

                <td>
                    ${
                        needsReview
                        ? `<span class="status review">⚠ Review</span>`
                        : `<span class="status ok">✔ Ready</span>`
                    }
                </td>

                <td>
                    <button class="ocr-remove-btn"
                        onclick="removeOCRRow(${index})">
                        🗑
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>

            <div class="ocr-actions">
                <button class="ocr-add-btn"
                    onclick="saveTransactions()">
                    ✔ Add to Transactions
                </button>
                 <button class="ocr-add-manual"
                    onclick="addManualRow()">
                    ➕ Add New Item
                </button>
            </div>
        </div>
    `;

    previewBox.innerHTML = html;
}

function renderCategoryOptions(selected) {

    const categories = [
        "Food & Dining",
        "Transportation",
        "Shopping",
        "Bills & Utilities",
        "Entertainment",
        "Healthcare",
        "Salary",
        "Other"
    ];

    return categories.map(cat =>
        `<option ${cat===selected?"selected":""}>${cat}</option>`
    ).join("");
}

async function saveTransactions() {

    const rows = document.querySelectorAll(".ocr-table tbody tr");

    let added = 0;

    for (const row of rows) {

        const desc = row.querySelector('[id^="desc-"]');
        const amt  = row.querySelector('[id^="amt-"]');
        const cat  = row.querySelector('[id^="cat-"]');
        const date = row.querySelector('[id^="date-"]');
        const type = row.querySelector('[id^="type-"]');

        if (!desc || !amt || !cat || !date || !type) continue;

        const description = desc.value;
        const amount = Number(amt.value);
        const category = cat.value;
        const txnType = type.value;
        const txnDate = date.value;

        if (!description || !amount || !txnDate) continue;

        await addTransaction({
            description,
            amount,
            category,
            date: txnDate,
            type: txnType
        });

        added++;
    }

    showNotification(`${added} transactions added`, "success");
    await new Promise(r => setTimeout(r, 400)); // wait aggregation
    notifyTransactionAdded();
}

window.removeOCRRow = function(index){
    const row = document.getElementById(`row-${index}`);
    if(row) {
        row.remove();
    }
}

window.addManualRow = function(){

    const table = document.querySelector(".ocr-table tbody");

    const index = table.children.length;

    const newRow = `
    <tr id="row-${index}">
        <td><input class="ocr-input" id="desc-${index}" value=""></td>

        <td><input class="ocr-input" id="amt-${index}" value=""></td>

        <td>
            <select class="ocr-select" id="cat-${index}">
                ${renderCategoryOptions("Other")}
            </select>
        </td>

        <td>
            <select class="ocr-select" id="type-${index}">
                <option value="expense" selected>Expense</option>
                <option value="income">Income</option>
            </select>
        </td>

        <td>
            <input type="date"
            class="ocr-input"
            value="${getTodayDate()}"
            id="date-${index}">
        </td>

        <td>
            <span class="status review">Manual</span>
        </td>

        <td>
            <button class="ocr-remove-btn"
                onclick="removeOCRRow(${index})">🗑</button>
        </td>
    </tr>
    `;


    table.insertAdjacentHTML("beforeend", newRow);
}




function applyTransform() {
    const media = document.getElementById("previewMedia");
    if (!media) return;

    media.style.transform = `
        scale(${zoomLevel})
        rotate(${rotation}deg)
    `;
}

function openFullscreen() {
    const media = document.getElementById("previewMedia");
    if (!media) return;

    if (media.requestFullscreen) {
        media.requestFullscreen();
    } else if (media.webkitRequestFullscreen) {
        media.webkitRequestFullscreen();
    } else if (media.msRequestFullscreen) {
        media.msRequestFullscreen();
    }
}

async function renderPDF(fileURL) {

    const loadingTask = pdfjsLib.getDocument(fileURL);
    pdfDoc = await loadingTask.promise;

    currentPage = 1;
    renderPage(currentPage);
}

async function renderPage(num) {

    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(num);

    const baseScale = 1.5;   // fixed render scale
    const viewport = page.getViewport({ scale: baseScale });

    const canvas = document.getElementById("pdfCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // FIXED CANVAS SIZE
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;

    // 🔥 ADD THESE 2 LINES
    canvas.style.transformOrigin = "top left";
    applyZoom();

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) {
        pageInfo.innerText = `Page ${currentPage} / ${pdfDoc.numPages}`;
    }
}


function nextPage() {

    if (currentFileType !== "pdf") return;
    if (!pdfDoc) return;

    if (currentPage < pdfDoc.numPages) {
        currentPage++;
        renderPage(currentPage);
    }
}


function prevPage() {

    if (currentFileType !== "pdf") return;
    if (!pdfDoc) return;

    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    }
}

function zoomIn() {
    scale += 0.2;
    applyZoom();
}

function zoomOut() {
    if (scale > 0.5) scale -= 0.2;
    applyZoom();
}


