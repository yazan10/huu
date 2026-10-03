const loginSection = document.querySelector("#login");
const dashboard = document.querySelector("#dashboard");
const message = document.querySelector("#message");
const loginMessage = document.querySelector("#login-message");
const serialsBody = document.querySelector("#serials");
const searchInput = document.querySelector("#search");
const statsTotal = document.querySelector("#stats-total");
const statsToday = document.querySelector("#stats-today");
const statsDate = document.querySelector("#stats-date");
const statsPage = document.querySelector("#stats-page");

let currentPage = 0;
let currentItems = [];
let hasMoreGlobal = false;

function showMessage(text, type) {
  // type: "", "ok", "error", "loading"
  message.textContent = text;
  message.className = type || "";
}

function showLoginMessage(text, isError) {
  loginMessage.textContent = text;
  loginMessage.style.color = isError ? "#b91c1c" : "#047857";
}

function setLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>' + label;
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

async function request(path, options) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "تعذّر إكمال الطلب.");
  return body;
}

function showDashboard(isLoggedIn) {
  loginSection.hidden = isLoggedIn;
  dashboard.hidden = !isLoggedIn;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function filteredItems() {
  const q = (searchInput?.value || "").trim().toUpperCase();
  if (!q) return currentItems;
  return currentItems.filter((i) => i.serial.includes(q));
}

function renderSerials(items) {
  const list = filteredItems();
  serialsBody.replaceChildren();

  if (!list.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty";
    td.textContent = (searchInput?.value || "").trim()
      ? "لا توجد نتائج مطابقة للبحث في هذه الصفحة."
      : "لا توجد سيريالات في هذه الصفحة بعد — أضف أول سيريال وسيُفعَّل فوراً.";
    tr.append(td);
    serialsBody.append(tr);
    return;
  }

  for (const item of list) {
    const row = document.createElement("tr");

    const serialCell = document.createElement("td");
    serialCell.className = "serial";
    serialCell.textContent = item.serial;

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "✓ مفعّل تلقائياً";
    statusCell.append(badge);

    const dateCell = document.createElement("td");
    dateCell.className = "date";
    dateCell.textContent = formatDate(item.created_at);

    const actionCell = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "row-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn secondary small";
    copyBtn.type = "button";
    copyBtn.textContent = "نسخ";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.serial);
        copyBtn.textContent = "تم ✓";
        setTimeout(() => (copyBtn.textContent = "نسخ"), 1200);
      } catch {
        showMessage("تعذّر النسخ.", "error");
      }
    });

    const removeButton = document.createElement("button");
    removeButton.className = "btn danger";
    removeButton.type = "button";
    removeButton.textContent = "حذف";
    removeButton.addEventListener("click", async () => {
      if (!window.confirm(`حذف السيريال ${item.serial}؟`)) return;
      removeButton.disabled = true;
      try {
        await request("/api/admin/serials", {
          method: "DELETE",
          body: JSON.stringify({ serial: item.serial })
        });
        showMessage("تم حذف السيريال.", "ok");
        await loadSerials(0);
        refreshStats();
      } catch (error) {
        showMessage(error.message, "error");
        removeButton.disabled = false;
      }
    });

    wrap.append(copyBtn, removeButton);
    actionCell.append(wrap);
    row.append(serialCell, statusCell, dateCell, actionCell);
    serialsBody.append(row);
  }
}

async function loadSerials(page = currentPage) {
  showMessage("جارٍ تحميل السيريالات...", "loading");
  const result = await request(`/api/admin/serials?page=${page}`);
  currentPage = result.page;
  currentItems = result.serials || [];
  hasMoreGlobal = result.hasMore;
  renderSerials(currentItems);
  document.querySelector("#page-label").textContent = `صفحة ${currentPage + 1}`;
  if (statsPage) statsPage.textContent = String(currentPage + 1);
  document.querySelector("#previous-page").disabled = currentPage === 0;
  document.querySelector("#next-page").disabled = !result.hasMore;
  if (!currentItems.length && currentPage === 0) showMessage("", "");
  else if ((searchInput?.value || "").trim()) showMessage(`عرض ${filteredItems().length} من ${currentItems.length} في هذه الصفحة.`, "");
  else showMessage("", "");
}

// إحصائيات خفيفة: نجمع أول 10 صفحات كحد أقصى لتفادي الضغط على GitHub API
async function refreshStats() {
  if (statsDate) {
    statsDate.textContent = new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  try {
    let total = 0;
    let today = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    let page = 0;
    for (; page < 10; page += 1) {
      const r = await request(`/api/admin/serials?page=${page}`);
      total += r.serials.length;
      today += r.serials.filter((s) => (s.created_at || "").slice(0, 10) === todayStr).length;
      if (!r.hasMore) break;
    }
    if (statsTotal) statsTotal.textContent = total + (page === 10 ? "+" : "");
    if (statsToday) statsToday.textContent = String(today);
  } catch {
    if (statsTotal) statsTotal.textContent = "—";
    if (statsToday) statsToday.textContent = "—";
  }
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = document.querySelector("#login-btn");
  showLoginMessage("", false);
  setLoading(btn, true, "جارٍ الدخول...");
  try {
    await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value })
    });
    document.querySelector("#password").value = "";
    showDashboard(true);
    await loadSerials(0);
    refreshStats();
  } catch (error) {
    const text = error.message === "invalid_credentials"
      ? "بيانات الدخول غير صحيحة."
      : error.message === "admin_auth_unavailable"
        ? "إعدادات دخول المسؤول غير مكتملة على الخادم (ADMIN_PASSWORD / SESSION_SECRET). أعد النشر بعد ضبط المتغيرات."
        : error.message === "forbidden"
          ? "تم رفض الطلب لأسباب أمنية (Origin). حدّث الصفحة وحاول من نفس دومين الموقع."
          : error.message === "unauthorized"
            ? "انتهت الجلسة. سجّل الدخول مجدداً."
            : "تعذّر تسجيل الدخول: " + error.message;
    showLoginMessage(text, true);
  } finally {
    setLoading(btn, false);
  }
});

document.querySelector("#add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = document.querySelector("#add-btn");
  const input = document.querySelector("#serial");
  setLoading(btn, true, "جارٍ التفعيل...");
  try {
    // التسجيل الفوري بدون أي موافقة — نفس endpoint المستخدم في Blogger
    const res = await request("/api/serials/register", {
      method: "POST",
      body: JSON.stringify({ serial: input.value })
    });
    input.value = "";
    showMessage(
      res.created
        ? "تم تسجيل السيريال وتفعيله فوراً بدون موافقة ✓"
        : "هذا السيريال مسجل ومفعّل مسبقاً ✓",
      "ok"
    );
    await loadSerials(0);
    refreshStats();
  } catch (error) {
    const text = error.message === "invalid_serial"
      ? "صيغة السيريال غير صالحة."
      : error.message === "registration_unavailable"
        ? "خدمة التسجيل غير جاهزة حالياً."
        : "تعذّر تسجيل السيريال.";
    showMessage(text, "error");
  } finally {
    setLoading(btn, false);
  }
});

document.querySelector("#refresh").addEventListener("click", async () => {
  try {
    await loadSerials();
    refreshStats();
    showMessage("", "");
  } catch {
    showMessage("تعذّر تحميل السيريالات.", "error");
  }
});

searchInput?.addEventListener("input", () => renderSerials(currentItems));

document.querySelector("#previous-page").addEventListener("click", async () => {
  if (currentPage > 0) await loadSerials(currentPage - 1);
});

document.querySelector("#next-page").addEventListener("click", async () => {
  await loadSerials(currentPage + 1);
});

document.querySelector("#logout").addEventListener("click", async () => {
  try {
    await request("/api/admin/logout", { method: "POST", body: "{}" });
    showDashboard(false);
    serialsBody.replaceChildren();
    currentItems = [];
    showMessage("", "");
    showLoginMessage("", false);
  } catch {
    showMessage("تعذّر تسجيل الخروج.", "error");
  }
});

request("/api/admin/serials?page=0")
  .then((result) => {
    showDashboard(true);
    currentItems = result.serials || [];
    currentPage = result.page;
    renderSerials(currentItems);
    document.querySelector("#page-label").textContent = `صفحة ${currentPage + 1}`;
    if (statsPage) statsPage.textContent = String(currentPage + 1);
    document.querySelector("#previous-page").disabled = true;
    document.querySelector("#next-page").disabled = !result.hasMore;
    refreshStats();
  })
  .catch(() => showDashboard(false));
