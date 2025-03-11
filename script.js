let orders = [];
let skippedOrders = [];
let currentIndex = 0;

function handleKeyPress(event) {
    if (event.key === "Enter") {
        checkIMEI();
    }
}

function uploadPicklist() {
    let fileInput = document.getElementById("picklistUpload");
    let file = fileInput.files[0];

    if (!file) {
        alert("Please select a CSV file");
        return;
    }

    let reader = new FileReader();
    reader.onload = function (event) {
        parseCSV(event.target.result);
    };
    reader.readAsText(file);
}

function parseCSV(csvData) {
    let rows = csvData.split("\n").map(row => row.split(","));
    let headers = rows[0].map(header => header.trim().toLowerCase());
    let orderIndex = headers.indexOf("order");
    let imeiIndex = headers.indexOf("esn");
    let modelIndex = headers.indexOf("model");
    let storageIndex = headers.indexOf("capacity");
    let colorIndex = headers.indexOf("color");
    let locationIndex = headers.indexOf("location");

    if (imeiIndex === -1 || orderIndex === -1) {
        alert("Invalid CSV format: 'Order' and 'ESN' columns not found.");
        return;
    }

    orders = [];
    skippedOrders = [];

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (row.length < headers.length) continue;

        let order = row[orderIndex].trim();
        let imei = row[imeiIndex].trim();
        let model = row[modelIndex]?.trim() || "Unknown Model";
        let storage = row[storageIndex]?.trim() || "Unknown Storage";
        let color = row[colorIndex]?.trim() || "Unknown Color";
        let location = row[locationIndex]?.trim() || "Unknown Location";

        if (imei) {
            orders.push({ order, imei, model, storage, color, location });
        }
    }

    displayOrders();
}

function displayOrders() {
    let ordersTable = document.getElementById("orders");
    ordersTable.innerHTML = "";

    orders.forEach((order, index) => {
        let row = document.createElement("tr");
        row.setAttribute("id", `row-${index}`);
        row.innerHTML = `
            <td>${order.order}</td>
            <td>${order.imei}</td>
            <td>${order.model}</td>
            <td>${order.storage}</td>
            <td>${order.color}</td>
            <td>${order.location}</td>
        `;
        ordersTable.appendChild(row);
    });

    highlightNextIMEI();
}

function highlightNextIMEI() {
    orders.forEach((_, index) => {
        let row = document.getElementById(`row-${index}`);

        // ✅ Keep green (scanned) and orange (skipped) rows unchanged
        if (!row.classList.contains("green") && !row.classList.contains("orange")) {
            row.classList.remove("next", "red");
        }
    });

    // ✅ Set the next IMEI to be yellow (active)
    if (currentIndex < orders.length) {
        let activeRow = document.getElementById(`row-${currentIndex}`);
        activeRow.classList.add("next");
    }
}

function checkIMEI() {
    let scannerInput = document.getElementById("scanner").value.trim();
    let resultRow = document.getElementById(`row-${currentIndex}`);

    if (!resultRow) {
        alert("No more IMEIs left to scan.");
        return;
    }

    if (scannerInput === orders[currentIndex].imei) {
        console.log(`✅ Correct IMEI Scanned: ${scannerInput}`);

        // ✅ Forcefully apply green and prevent undoing
        resultRow.classList.remove("next", "red");
        resultRow.classList.add("green");

        // ✅ Prevent clicking this row again
        resultRow.removeAttribute("onclick");

        // ✅ Move to next IMEI
        currentIndex++;
        highlightNextIMEI();
    } else {
        console.log(`❌ Incorrect IMEI Scanned: ${scannerInput}`);

        // ❌ Flash red for incorrect scan
        resultRow.classList.add("red");
        setTimeout(() => {
            resultRow.classList.remove("red");
        }, 2000);
    }

    document.getElementById("scanner").value = "";
}

function skipIMEI() {
    let resultRow = document.getElementById(`row-${currentIndex}`);

    if (!resultRow) return;

    console.log(`⚠️ IMEI Skipped: ${orders[currentIndex].imei}`);

    // ✅ Set row color to orange (permanent)
    resultRow.classList.remove("next");
    resultRow.classList.add("orange");

    // ✅ Allow clicking to undo
    resultRow.setAttribute("onclick", `undoSpecificSkip(${currentIndex})`);

    // ✅ Store skipped IMEI in the skipped list
    skippedOrders.push({ index: currentIndex, order: orders[currentIndex] });
    updateSkippedList();

    // ✅ Move to next IMEI
    currentIndex++;
    highlightNextIMEI();
}

function updateSkippedList() {
    let skippedTable = document.getElementById("skipped-orders");
    skippedTable.innerHTML = "";

    skippedOrders.forEach((entry) => {
        let row = document.createElement("tr");
        row.setAttribute("data-index", entry.index);
        row.setAttribute("onclick", `undoSpecificSkip(${entry.index})`);

        row.innerHTML = `
            <td>${entry.order.order}</td>
            <td>${entry.order.imei}</td>
            <td>${entry.order.model}</td>
            <td>${entry.order.storage}</td>
            <td>${entry.order.color}</td>
            <td>${entry.order.location}</td>
        `;

        skippedTable.appendChild(row);
    });
}

function undoSpecificSkip(index) {
    let row = document.getElementById(`row-${index}`);
    row.classList.remove("orange");
    row.classList.add("next");
    row.removeAttribute("onclick");

    skippedOrders = skippedOrders.filter(entry => entry.index !== index);
    currentIndex = index;
    highlightNextIMEI();
    updateSkippedList();
}
