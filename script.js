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
        alert("Please select a CSV file.");
        return;
    }

    let reader = new FileReader();
    reader.onload = function (event) {
        parseCSV(event.target.result);
    };
    reader.readAsText(file);
}

function parseCSV(csvData) {
    let rows = csvData.trim().split("\n").map(row => row.split(",").map(cell => cell.trim()));

    if (rows.length < 2) {
        alert("Error: CSV file is missing data.");
        return;
    }

    let headers = rows[0].map(header => header.toLowerCase());
    let orderIndex = headers.indexOf("order");
    let imeiIndex = headers.indexOf("esn");
    let modelIndex = headers.indexOf("model");
    let storageIndex = headers.indexOf("capacity");
    let colorIndex = headers.indexOf("color");
    let locationIndex = headers.indexOf("location");

    if (imeiIndex === -1 || orderIndex === -1) {
        alert("Error: The CSV file is missing required headers (Order, ESN).");
        return;
    }

    orders = [];
    skippedOrders = [];

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (row.length < headers.length) continue; 

        let order = row[orderIndex]?.trim() || "Unknown Order";
        let imei = row[imeiIndex]?.trim() || "";
        let model = row[modelIndex]?.trim() || "Unknown Model";
        let storage = row[storageIndex]?.trim() || "Unknown Storage";
        let color = row[colorIndex]?.trim() || "Unknown Color";
        let location = row[locationIndex]?.trim() || "Unknown Location";

        if (imei) {
            orders.push({ order, imei, model, storage, color, location });
        }
    }

    if (orders.length === 0) {
        alert("Error: No valid IMEIs found in the CSV file.");
        return;
    }

    displayOrders();
}

function displayOrders() {
    let ordersTable = document.getElementById("orders");
    ordersTable.innerHTML = ""; 

    if (orders.length === 0) {
        ordersTable.innerHTML = "<tr><td colspan='6'>No IMEIs loaded.</td></tr>";
        return;
    }

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

    // ✅ Ensure the next pending IMEI is highlighted yellow
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

        // ✅ Apply green and prevent undoing
        resultRow.classList.remove("next", "red", "orange");
        resultRow.classList.add("green");
        resultRow.removeAttribute("onclick");

        // ✅ Remove this IMEI from skipped list if it was skipped before
        skippedOrders = skippedOrders.filter(entry => entry.index !== currentIndex);
        updateSkippedList();

        // ✅ Move to the next pending IMEI
        moveToNextUnscannedIMEI();
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
    moveToNextUnscannedIMEI();
}

function updateSkippedList() {
    let skippedTable = document.getElementById("skipped-orders");
    skippedTable.innerHTML = "";

    skippedOrders.forEach((entry) => {
        let row = document.getElementById(`row-${entry.index}`);

        // ✅ Ensure skipped IMEIs stay orange
        if (row) {
            row.classList.add("orange");
            row.setAttribute("onclick", `undoSpecificSkip(${entry.index})`);
        }
    });
}

function undoSpecificSkip(index) {
    let row = document.getElementById(`row-${index}`);

    console.log(`🔄 Undo Skipped IMEI: ${orders[index].imei}`);

    // ✅ If it was already skipped but not scanned, keep it orange
    if (!row.classList.contains("green")) {
        row.classList.remove("next");
        row.classList.add("orange");
    }

    // ✅ Remove undo option so it doesn't stay clickable unless skipped again
    row.removeAttribute("onclick");

    // ✅ Ensure it stays in the skipped list if not scanned
    if (!skippedOrders.some(entry => entry.index === index)) {
        skippedOrders.push({ index, order: orders[index] });
    }
    updateSkippedList();

    // ✅ Set the current index to move forward properly
    currentIndex = index;
    highlightNextIMEI();
}

function moveToNextUnscannedIMEI() {
    while (currentIndex < orders.length) {
        let row = document.getElementById(`row-${currentIndex}`);

        // ✅ If the row is already green (scanned), move forward
        if (row.classList.contains("green")) {
            currentIndex++;
            continue;
        }

        // ✅ If the row is skipped (orange), check the next one
        if (row.classList.contains("orange")) {
            currentIndex++;
            continue;
        }

        // ✅ If we find a pending IMEI (not scanned or skipped), stop
        break;
    }

    highlightNextIMEI();
}
