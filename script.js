// script.js (module)

// ====== Firebase (Firestore) setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Dùng config của bạn (đã có trong HTML cũ)
const firebaseConfig = {
  apiKey: "AIzaSyCAjXNFPDeJsaSy5cwHTG2tUPWlzncuz60",
  authDomain: "ti-company.firebaseapp.com",
  projectId: "ti-company",
  storageBucket: "ti-company.firebasestorage.app",
  messagingSenderId: "582694112976",
  appId: "1:582694112976:web:08588ec38b2e294efe18d5",
  measurementId: "G-5JVYCWF4CS"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const shareDocRef = doc(db, "shares", "shareData"); // single document

// ====== Biến toàn cục ======
let shareholders = ["Người 1", "Người 2", "Người 3"];
let pieChart, barChart, lineChart;

// ====== Utils ======
function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function formatPercentages(values) {
  let total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return values.map(() => "0%");
  let percentages = values.map((v) => (v / total) * 100);
  let rounded = percentages.map((x) => Math.floor(x));
  let diff = 100 - rounded.reduce((a, b) => a + b, 0);
  while (diff > 0) {
    let maxVal = -1;
    let maxIndex = -1;
    for (let i = 0; i < percentages.length; i++) {
      if (
        rounded[i] < 100 &&
        (percentages[i] - rounded[i] > maxVal || maxIndex === -1)
      ) {
        maxVal = percentages[i] - rounded[i];
        maxIndex = i;
      }
    }
    if (maxIndex !== -1) {
      rounded[maxIndex]++;
    }
    diff--;
  }
  return rounded.map((x) => x + "%");
}

function getAllRowsData() {
  return Array.from(document.querySelectorAll("#contributionTable tbody tr")).map((tr) => {
    const mmCell = tr.querySelector(".month-year");
    const month = mmCell ? parseInt(mmCell.dataset.month) : NaN;
    const year = mmCell ? parseInt(mmCell.dataset.year) : NaN;
    const inputs = Array.from(tr.querySelectorAll("input[type='number']"));
    const values = inputs.map((inp) => parseFloat(inp.value) || 0);
    return { month, year, values };
  });
}

function hexToRgba(hex, alpha = 1) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ====== DOM Manipulation ======
function updateHeader() {
  const header = document.getElementById("headerRow");
  header.innerHTML = `<th>Tháng - Năm</th>`;
  shareholders.forEach((name, index) => {
    header.innerHTML += `<th class="shareholder-name" data-index="${index}"><i class="fas fa-user"></i> ${name}</th>`;
  });
  header.innerHTML += `<th><i class="fas fa-coins"></i> Tổng</th>`;
  shareholders.forEach((name) => {
    header.innerHTML += `<th>% ${name}</th>`;
  });
  header.innerHTML += `<th><i class="fas fa-cogs"></i> Hành động</th>`;
}

function updateYearHeader() {
  const header = document.getElementById("yearHeader");
  header.innerHTML = `<th>Năm</th>`;
  shareholders.forEach((name, index) => {
    header.innerHTML += `<th class="shareholder-name" data-index="${index}"><i class="fas fa-user"></i> ${name}</th>`;
  });
  header.innerHTML += `<th><i class="fas fa-wallet"></i> Tổng cả năm</th>`;
  shareholders.forEach((name) => {
    header.innerHTML += `<th>% ${name}</th>`;
  });
}

function createRow(month, year) {
  const tr = document.createElement("tr");
  let html = `<td class="month-year" data-month="${month}" data-year="${year}">Tháng ${month} - ${year}</td>`;
  shareholders.forEach(() => {
    html += `<td><input type="number" value="0" min="0"></td>`;
  });
  html += `<td class="total">0</td>`;
  shareholders.forEach(() => {
    html += `<td class="share">0%</td>`;
  });
  html += `<td>
      <span class="action-btn delete" title="Xóa"><i class="fas fa-trash-alt"></i></span>
    </td>`;
  tr.innerHTML = html;
  return tr;
}

// ====== Core Logic ======
function addRow() {
  const tbody = document.querySelector("#contributionTable tbody");
  const last = tbody.querySelector("tr:last-child");
  let month, year;
  if (last) {
    const cell = last.querySelector(".month-year");
    month = parseInt(cell.dataset.month, 10);
    year = parseInt(cell.dataset.year, 10);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  } else {
    const cur = getCurrentMonthYear();
    month = cur.month;
    year = cur.year;
  }
  tbody.appendChild(createRow(month, year));
  calculateAll();
  saveData();
  tbody.scrollTop = tbody.scrollHeight;
}

function calculateAll() {
  const rows = document.querySelectorAll("#contributionTable tbody tr");
  const summary = {};

  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input[type='number']");
    const values = Array.from(inputs).map((inp) => parseFloat(inp.value) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const totalCell = row.querySelector(".total");
    if (totalCell) totalCell.innerText = total.toLocaleString();
    const percents = formatPercentages(values);
    const shares = row.querySelectorAll(".share");
    shares.forEach((s, i) => (s.innerText = percents[i] || "0%"));
    const year = parseInt(row.querySelector(".month-year").dataset.year);
    if (!summary[year]) {
      summary[year] = { totals: Array(shareholders.length).fill(0), total: 0 };
    }
    values.forEach((v, i) => (summary[year].totals[i] += v));
    summary[year].total += total;
  });

  const tbody = document.querySelector("#yearSummary tbody");
  tbody.innerHTML = "";
  Object.keys(summary)
    .sort()
    .forEach((year) => {
      const s = summary[year];
      const tr = document.createElement("tr");
      let html = `<td>${year}</td>`;
      s.totals.forEach((v) => (html += `<td>${v.toLocaleString()}</td>`));
      html += `<td>${s.total.toLocaleString()}</td>`;
      const percents = formatPercentages(s.totals);
      percents.forEach((p) => (html += `<td>${p}</td>`));
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

  updateCharts(summary);
  // saveData(); // optional: we call saveData after user actions
}

function updateCharts(summary) {
  const years = Object.keys(summary).sort();
  if (years.length === 0) {
    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();
    if (lineChart) lineChart.destroy();
    return;
  }
  const lastYear = years[years.length - 1];
  const s = summary[lastYear];

  const chartColors = [
    "#1db954", "#ff6384", "#36a2eb", "#ffce56", "#9966ff", "#4bc0c0", "#ff9f40", "#c9cbcf"
  ];

  // Pie Chart
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: shareholders,
      datasets: [{ data: s.totals, backgroundColor: chartColors.slice(0, shareholders.length), hoverOffset: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } },
    },
  });

  // Bar Chart
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: shareholders,
      datasets: [{
        label: `Tổng đóng góp năm ${lastYear}`,
        data: s.totals,
        backgroundColor: chartColors.slice(0, shareholders.length),
        borderColor: chartColors.slice(0, shareholders.length),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: "#ccc", callback: (v) => v.toLocaleString() }, grid: { color: "rgba(255, 255, 255, 0.1)" } },
        x: { ticks: { color: "#ccc" }, grid: { display: false } },
      },
    },
  });

  // Line Chart
  if (lineChart) lineChart.destroy();
  const rows = getAllRowsData();
  const allMonths = rows.map(r => `Tháng ${r.month}-${r.year}`);
  const datasets = shareholders.map((name, i) => ({
    label: name,
    data: rows.map(r => r.values[i] || 0),
    borderColor: chartColors[i % chartColors.length],
    backgroundColor: hexToRgba(chartColors[i % chartColors.length], 0.2),
    tension: 0.1,
    fill: false
  }));
  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: { labels: allMonths, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: "#ccc", callback: (v) => v.toLocaleString() }, grid: { color: "rgba(255, 255, 255, 0.1)" } },
        x: { ticks: { color: "#ccc" }, grid: { color: "rgba(255, 255, 255, 0.1)" } },
      },
    },
  });
}

// ====== Data Persistence with Firestore ======
async function saveData() {
  const rows = getAllRowsData().map(r => ({
    month: r.month,
    year: r.year,
    values: r.values.map(v => Number(v))
  }));
  const data = { shareholders, rows, updatedAt: Date.now() };
  try {
    await setDoc(shareDocRef, data);
    showToast("✅ Dữ liệu đã lưu lên Firestore");
  } catch (err) {
    console.error("Lưu Firestore thất bại:", err);
    showToast("❌ Lưu Firestore thất bại");
  }
}

async function loadData() {
  try {
    const snap = await getDoc(shareDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.shareholders) && data.shareholders.length > 0) {
        shareholders = data.shareholders;
      }
      updateHeader();
      updateYearHeader();
      const tbody = document.querySelector("#contributionTable tbody");
      tbody.innerHTML = "";
      if (Array.isArray(data.rows)) {
        data.rows.forEach((r) => {
          const tr = createRow(r.month, r.year);
          const inputs = tr.querySelectorAll("input[type='number']");
          (r.values || []).forEach((v, i) => {
            if (inputs[i]) inputs[i].value = v;
          });
          tbody.appendChild(tr);
        });
      }
      // If no rows stored -> create a current month row
      if (tbody.querySelectorAll("tr").length === 0) {
        const cur = getCurrentMonthYear();
        tbody.appendChild(createRow(cur.month, cur.year));
      }
      calculateAll();
      showToast("📥 Đã tải dữ liệu từ Firestore");
    } else {
      // No document yet -> create default doc from current UI state
      updateHeader();
      updateYearHeader();
      const tbody = document.querySelector("#contributionTable tbody");
      if (tbody.querySelectorAll("tr").length === 0) {
        const cur = getCurrentMonthYear();
        tbody.appendChild(createRow(cur.month, cur.year));
      }
      await saveData();
      showToast("✨ Dữ liệu mặc định đã được tạo trên Firestore");
    }
  } catch (err) {
    console.error("Tải Firestore thất bại:", err);
    showToast("❌ Không thể tải dữ liệu từ Firestore");
  }
}

// ====== Export/Import CSV (DOM-based) ======
function exportCSV() {
  const rows = getAllRowsData();
  let csv = "Tháng-Năm," + shareholders.join(",") + ",Tổng\n";
  rows.forEach(r => {
    const values = r.values.map(v => parseFloat(v) || 0);
    csv += `Tháng ${r.month}-${r.year},${values.join(",")},${values.reduce((a,b)=>a+b,0)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'co-phan.csv'; a.click();
  URL.revokeObjectURL(url);
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    // parse header
    const headerParts = lines[0].split(",").map(h => h.trim());
    // Expect header like: Tháng-Năm,Người1,Người2,...,Tổng
    const importedShareholders = headerParts.slice(1, headerParts.length - 1);
    if (importedShareholders.length > 0) {
      shareholders = importedShareholders;
      updateHeader();
      updateYearHeader();
    }
    // parse rows
    const newRows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      const monthYear = parts[0].split("-");
      const month = parseInt(monthYear[0].replace('Tháng ', '').trim());
      const year = parseInt(monthYear[1]);
      const values = parts.slice(1, 1 + shareholders.length).map(v => parseFloat(v) || 0);
      if (!isNaN(month) && !isNaN(year)) newRows.push({ month, year, values });
    }
    // render
    const tbody = document.querySelector("#contributionTable tbody");
    tbody.innerHTML = "";
    newRows.forEach(r => {
      const tr = createRow(r.month, r.year);
      const inputs = tr.querySelectorAll("input[type='number']");
      r.values.forEach((v, idx) => {
        if (inputs[idx]) inputs[idx].value = v;
      });
      tbody.appendChild(tr);
    });
    calculateAll();
    await saveData();
    document.getElementById("importModal").style.display = "none";
    showToast("✅ Import CSV thành công");
  };
  reader.readAsText(file);
}

// ====== UI helpers ======
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ====== Events ======
document.addEventListener("DOMContentLoaded", async () => {
  // Load theme
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    const t = document.getElementById("themeToggle");
    if (t) t.innerHTML = '<i class="fas fa-sun"></i> Chế Độ';
  }

  updateHeader();
  updateYearHeader();

  // load data from Firestore (or create default)
  await loadData();

  // if no row exist ensure one row
  const tbodyEl = document.querySelector("#contributionTable tbody");
  if (!tbodyEl.querySelector("tr")) {
    const cur = getCurrentMonthYear();
    tbodyEl.appendChild(createRow(cur.month, cur.year));
  }

  // Buttons
  const addMonthBtn = document.getElementById("addMonthBtn");
  if (addMonthBtn) addMonthBtn.addEventListener("click", addRow);

  const calcBtn = document.getElementById("calcBtn");
  if (calcBtn) calcBtn.addEventListener("click", () => { calculateAll(); saveData(); });

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportCSV);

  const importBtn = document.getElementById("importBtn");
  if (importBtn) importBtn.addEventListener("click", () => {
    document.getElementById("importModal").style.display = "flex";
  });

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", async () => {
    if (confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu?")) {
      shareholders = ["Người 1", "Người 2", "Người 3"];
      document.querySelector("#contributionTable tbody").innerHTML = "";
      const cur = getCurrentMonthYear();
      document.querySelector("#contributionTable tbody").appendChild(createRow(cur.month, cur.year));
      document.querySelector("#yearSummary tbody").innerHTML = "";
      updateHeader();
      updateYearHeader();
      await saveData();
      showToast("🗑️ Đã xóa toàn bộ và reset dữ liệu trên Firestore");
    }
  });

  // Import modal actions
  const importOk = document.getElementById("importOk");
  if (importOk) importOk.addEventListener("click", () => {
    const file = document.getElementById("csvFile").files[0];
    if (file) importCSV(file);
  });
  const importCancel = document.getElementById("importCancel");
  if (importCancel) importCancel.addEventListener("click", () => {
    document.getElementById("importModal").style.display = "none";
  });

  // Add shareholder
  const addShareholderBtn = document.getElementById("addShareholderBtn");
  if (addShareholderBtn) addShareholderBtn.addEventListener("click", () => {
    const name = prompt("Tên cổ đông mới:");
    if (name && name.trim() !== "") {
      shareholders.push(name.trim());
      updateHeader();
      updateYearHeader();
      document.querySelectorAll("#contributionTable tbody tr").forEach((tr) => {
        const totalCell = tr.querySelector(".total");
        const newShareInput = document.createElement("td");
        newShareInput.innerHTML = `<input type="number" value="0" min="0">`;
        totalCell.before(newShareInput);
        const newShareDisplay = document.createElement("td");
        newShareDisplay.classList.add("share");
        newShareDisplay.innerText = "0%";
        tr.lastElementChild.before(newShareDisplay);
      });
      calculateAll();
      saveData();
    }
  });

  // Table input change -> recalc & save
  const contributionTable = document.getElementById("contributionTable");
  if (contributionTable) {
    contributionTable.addEventListener("input", (e) => {
      if (e.target && e.target.type === "number") {
        calculateAll();
        // small debounce for saving
        clearTimeout(contributionTable._saveT);
        contributionTable._saveT = setTimeout(() => saveData(), 500);
      }
    });

    // delete row
    contributionTable.addEventListener("click", (e) => {
      if (e.target.closest(".delete")) {
        e.target.closest("tr").remove();
        calculateAll();
        saveData();
      }
    });
  }

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll("#contributionTable tbody tr").forEach(tr => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(term) ? "" : "none";
      });
    });
  }

  // Double-click rename shareholder (delegated)
  let renameIndex = null;
  document.addEventListener("dblclick", (e) => {
    const th = e.target.closest(".shareholder-name");
    if (th) {
      renameIndex = Number(th.dataset.index);
      document.getElementById("renameInput").value = shareholders[renameIndex] || "";
      document.getElementById("renameModal").style.display = "flex";
      document.getElementById("renameInput").focus();
    }
  });

  document.getElementById("renameOk").addEventListener("click", () => {
    const newName = document.getElementById("renameInput").value.trim();
    if (newName && renameIndex !== null) {
      shareholders[renameIndex] = newName;
      updateHeader();
      updateYearHeader();
      calculateAll();
      saveData();
    }
    document.getElementById("renameModal").style.display = "none";
  });

  document.getElementById("renameCancel").addEventListener("click", () => {
    document.getElementById("renameModal").style.display = "none";
  });

  // Close modals on outside click
  window.addEventListener("click", (e) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
      if (e.target === modal) modal.style.display = "none";
    });
  });

  // Theme Toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i> Chế Độ' : '<i class="fas fa-moon"></i> Chế Độ';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (pieChart || barChart || lineChart) calculateAll();
  });

  // Mobile menu toggle
  const menuToggle = document.querySelector(".menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("active");
    });
  }
});
