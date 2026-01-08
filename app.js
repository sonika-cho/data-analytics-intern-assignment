let chartInstance = null;

function getTimeKeyFromExcelDate(excelDate, granularity) {
  const d = XLSX.SSF.parse_date_code(excelDate);
  const jsDate = new Date(d.y, d.m - 1, d.d);

  if (granularity === "daily") {
    return jsDate.toISOString().slice(0, 10);
  }

  if (granularity === "monthly") {
    return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}`;
  }

  const oneJan = new Date(jsDate.getFullYear(), 0, 1);
  const week = Math.ceil((((jsDate - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${jsDate.getFullYear()}-W${week}`;
}

document.getElementById("fileInput").addEventListener("change", function (e) {
  const reader = new FileReader();

  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const granularity = document.getElementById("granularity").value;

    // ---------- TASK 1: ORDERS AGGREGATION ----------
    const orders = XLSX.utils.sheet_to_json(workbook.Sheets["Orders_Raw"]);
    const ordersMap = {};

    orders.forEach(row => {
      const phone = row["Phone"];
      const excelDate = row["Order Date"];
      if (!phone || !excelDate) return;

      const timeKey = getTimeKeyFromExcelDate(excelDate, granularity);
      ordersMap[timeKey + "_" + phone] = timeKey;
    });

    const ordersCountByTime = {};
    Object.values(ordersMap).forEach(t => {
      ordersCountByTime[t] = (ordersCountByTime[t] || 0) + 1;
    });

    // ---------- TASK 2: CHART ----------
    drawChart(ordersCountByTime, granularity);

    // ---------- TASK 3: CALLS MATCHING ----------
    const calls = XLSX.utils.sheet_to_json(workbook.Sheets["Calls_Raw"]);
    const callsMap = {};

    calls.forEach(row => {
      const phone = row["Phone"];
      const excelDate = row["Call Date"];
      if (!phone || !excelDate) return;

      const timeKey = getTimeKeyFromExcelDate(excelDate, granularity);
      callsMap[timeKey + "_" + phone] = timeKey;
    });

    const callsCountByTime = {};
    Object.values(callsMap).forEach(t => {
      callsCountByTime[t] = (callsCountByTime[t] || 0) + 1;
    });

    // ---------- DERIVED METRIC ----------
    const ordersPerCall = {};
    Object.keys(ordersCountByTime).forEach(time => {
      const ordersCnt = ordersCountByTime[time];
      const callsCnt = callsCountByTime[time] || 0;
      ordersPerCall[time] =
        callsCnt === 0 ? 0 : (ordersCnt / callsCnt).toFixed(2);
    });

    console.log("Orders per Call (Derived Metric):", ordersPerCall);

    document.getElementById("status").innerText =
      "Task 1, 2 & 3 completed ✅";
  };

  reader.readAsArrayBuffer(e.target.files[0]);
});

function drawChart(dataObj, granularity) {
  const ctx = document.getElementById("myChart").getContext("2d");

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        label: `Unique Customers (${granularity})`,
        data: Object.values(dataObj)
      }]
    }
  });
}
