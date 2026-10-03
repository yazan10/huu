const loginSection = document.querySelector("#login");
const dashboard = document.querySelector("#dashboard");
const message = document.querySelector("#message");
const serialsBody = document.querySelector("#serials");
let currentPage = 0;

function showMessage(text, isError) {
  message.textContent = text;
  message.classList.toggle("error", Boolean(isError));
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

function renderSerials(items) {
  serialsBody.replaceChildren();
  for (const item of items) {
    const row = document.createElement("tr");
    const serialCell = document.createElement("td");
    serialCell.className = "serial";
    serialCell.textContent = item.serial;
    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(item.created_at).toLocaleString();
    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "danger";
    removeButton.type = "button";
    removeButton.textContent = "حذف";
    removeButton.addEventListener("click", async () => {
      if (!window.confirm(`حذف السيريال ${item.serial}؟`)) return;
      try {
        await request("/api/admin/serials", {
          method: "DELETE",
          body: JSON.stringify({ serial: item.serial })
        });
        showMessage("تم حذف السيريال.", false);
        await loadSerials(0);
      } catch (error) {
        showMessage(error.message, true);
      }
    });
    actionCell.append(removeButton);
    row.append(serialCell, dateCell, actionCell);
    serialsBody.append(row);
  }
}

async function loadSerials(page = currentPage) {
  const result = await request(`/api/admin/serials?page=${page}`);
  currentPage = result.page;
  renderSerials(result.serials);
  document.querySelector("#page-label").textContent = `صفحة ${currentPage + 1}`;
  document.querySelector("#previous-page").disabled = currentPage === 0;
  document.querySelector("#next-page").disabled = !result.hasMore;
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("", false);
  try {
    await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value })
    });
    document.querySelector("#password").value = "";
    showDashboard(true);
    await loadSerials(0);
  } catch (error) {
    const text = error.message === "invalid_credentials"
      ? "بيانات الدخول غير صحيحة."
      : error.message === "admin_auth_unavailable"
        ? "إعدادات دخول المسؤول غير مكتملة على الخادم."
        : "تعذّر تسجيل الدخول.";
    showMessage(text, true);
  }
});

document.querySelector("#add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/serials/register", {
      method: "POST",
      body: JSON.stringify({ serial: document.querySelector("#serial").value })
    });
    document.querySelector("#serial").value = "";
    showMessage("تم تسجيل السيريال وتفعيله مباشرة.", false);
    await loadSerials(0);
  } catch (error) {
    const text = error.message === "invalid_serial"
      ? "صيغة السيريال غير صالحة."
      : error.message === "registration_unavailable"
        ? "خدمة التسجيل غير جاهزة حالياً."
        : "تعذّر تسجيل السيريال.";
    showMessage(text, true);
  }
});

document.querySelector("#refresh").addEventListener("click", async () => {
  try {
    await loadSerials();
    showMessage("", false);
  } catch {
    showMessage("تعذّر تحميل السيريالات.", true);
  }
});

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
    showMessage("", false);
  } catch {
    showMessage("تعذّر تسجيل الخروج.", true);
  }
});

request("/api/admin/serials?page=0")
  .then((result) => {
    showDashboard(true);
    renderSerials(result.serials);
    currentPage = result.page;
    document.querySelector("#page-label").textContent = `صفحة ${currentPage + 1}`;
    document.querySelector("#previous-page").disabled = true;
    document.querySelector("#next-page").disabled = !result.hasMore;
  })
  .catch(() => showDashboard(false));
