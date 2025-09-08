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
  return Array.from(document.querySelectorAll("#contributionTable tbody tr")).map(tr => ({
    month: parseInt(tr.querySelector(".month-year").dataset.month),
    year: parseInt(tr.querySelector(".month-year").dataset.year),
    values: Array.from(tr.querySelectorAll("input[type='number']")).map(inp => parseFloat(inp.value) || 0)
  }));
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
    row.querySelector(".total").innerText = total.toLocaleString();
    const percents = formatPercentages(values);
    const shares = row.querySelectorAll(".share");
    shares.forEach((s, i) => (s.innerText = percents[i]));
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
  saveData();
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
  const allMonths = getAllRowsData().map(r => `Tháng ${r.month}-${r.year}`);
  const datasets = shareholders.map((name, i) => ({
    label: name,
    data: allMonths.map((_, idx) => getAllRowsData()[idx].values[i]),
    borderColor: chartColors[i],
    backgroundColor: chartColors[i] + '20',
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

// ====== Data Persistence ======
function saveData() {
  const data = { shareholders, rows: getAllRowsData().map(r => ({ month: r.month, year: r.year, values: r.values.map(v => v.toString()) })) };
  localStorage.setItem("shareData", JSON.stringify(data));
}

function loadData() {
  const data = JSON.parse(localStorage.getItem("shareData"));
  if (!data) return;
  shareholders = data.shareholders;
  updateHeader();
  updateYearHeader();
  const tbody = document.querySelector("#contributionTable tbody");
  tbody.innerHTML = "";
  data.rows.forEach((r) => {
    const tr = createRow(r.month, r.year);
    const inputs = tr.querySelectorAll("input[type='number']");
    r.values.forEach((v, i) => (inputs[i].value = v));
    tbody.appendChild(tr);
  });
  calculateAll();
}

// ====== Export/Import CSV ======
function exportCSV() {
  const data = JSON.parse(localStorage.getItem("shareData"));
  let csv = "Tháng-Năm," + shareholders.join(",") + ",Tổng\n";
  data.rows.forEach(r => {
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
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').slice(1); // Bỏ header
    const newRows = lines.map(line => {
      const parts = line.split(',');
      const monthYear = parts[0].split('-');
      const month = parseInt(monthYear[0].replace('Tháng ', ''));
      const year = parseInt(monthYear[1]);
      const values = parts.slice(1, -1).map(v => v.toString());
      return { month, year, values };
    }).filter(r => r.month && r.year);
    // Cập nhật rows
    const tbody = document.querySelector("#contributionTable tbody");
    tbody.innerHTML = "";
    newRows.forEach(r => {
      const tr = createRow(r.month, r.year);
      const inputs = tr.querySelectorAll("input[type='number']");
      r.values.forEach((v, i) => (inputs[i].value = v));
      tbody.appendChild(tr);
    });
    calculateAll();
    document.getElementById("importModal").style.display = "none";
  };
  reader.readAsText(file);
}

// ====== Events ======
document.addEventListener("DOMContentLoaded", () => {
  // Load theme
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById("themeToggle").innerHTML = '<i class="fas fa-sun"></i> Chế Độ';
  }

  updateHeader();
  updateYearHeader();
  loadData();

  if (document.querySelector("#contributionTable tbody tr") == null) {
    const cur = getCurrentMonthYear();
    document
      .querySelector("#contributionTable tbody")
      .appendChild(createRow(cur.month, cur.year));
  }

  document.getElementById("addMonthBtn").addEventListener("click", addRow);
  document.getElementById("calcBtn").addEventListener("click", calculateAll);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importModal").style.display = "flex";
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu?")) {
      localStorage.removeItem("shareData");
      location.reload();
    }
  });

  // Import OK
  document.getElementById("importOk").addEventListener("click", () => {
    const file = document.getElementById("csvFile").files[0];
    if (file) importCSV(file);
  });
  document.getElementById("importCancel").addEventListener("click", () => {
    document.getElementById("importModal").style.display = "none";
  });

  // Theme Toggle
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    document.getElementById("themeToggle").innerHTML = isLight ? '<i class="fas fa-sun"></i> Chế Độ' : '<i class="fas fa-moon"></i> Chế Độ';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    // Cập nhật charts nếu tồn tại
    if (pieChart || barChart || lineChart) calculateAll();
  });

  document.getElementById("addShareholderBtn").addEventListener("click", () => {
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

  document.querySelector("#contributionTable").addEventListener("input", (e) => {
    if (e.target.type === "number") calculateAll();
  });

  document.querySelector("#contributionTable").addEventListener("click", (e) => {
    if (e.target.closest(".delete")) {
      e.target.closest("tr").remove();
      calculateAll();
    }
  });

  // Tìm kiếm
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll("#contributionTable tbody tr").forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = text.includes(term) ? "" : "none";
    });
  });

  // Double-click đổi tên cổ đông
  let renameIndex = null;
  document.addEventListener("dblclick", (e) => {
    if (e.target.classList.contains("shareholder-name")) {
      renameIndex = e.target.dataset.index;
      document.getElementById("renameInput").value = shareholders[renameIndex];
      document.getElementById("renameModal").style.display = "flex";
      document.getElementById("renameInput").focus();
    }
  });

  document.getElementById("renameOk").addEventListener("click", () => {
    const newName = document.getElementById("renameInput").value.trim();
    if (newName) {
      shareholders[renameIndex] = newName;
      saveData();
      updateHeader();
      updateYearHeader();
      calculateAll();
    }
    document.getElementById("renameModal").style.display = "none";
  });

  document.getElementById("renameCancel").addEventListener("click", () => {
    document.getElementById("renameModal").style.display = "none";
  });

  window.addEventListener("click", (e) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  // Toggle sidebar trên mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("active");
  });
});