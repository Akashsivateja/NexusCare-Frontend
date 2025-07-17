const backendURL = "https://nexuscare-backend.onrender.com"; // 🔁 Ensure this matches your live backend URL

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  if (!container) {
    alert(message); // Fallback if container not found
    return;
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    notification.addEventListener("transitionend", () => notification.remove());
  }, 3000);
}

function setButtonLoading(button, isLoading) {
  const spinner = button.querySelector(".spinner");
  const textSpan = button.querySelector("span");
  if (spinner && textSpan) {
    if (isLoading) {
      spinner.classList.remove("hidden");
      textSpan.style.visibility = "hidden";
      button.disabled = true;
    } else {
      spinner.classList.add("hidden");
      textSpan.style.visibility = "visible";
      button.disabled = false;
    }
  }
}

// --- Register ---
const regForm = document.getElementById("regForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    // ✅ NEW: Get the specialty value
    const specialty = document.getElementById("specialty").value; // This will be empty for patients, which is fine
    const submitBtn = regForm.querySelector(".btn-submit");

    setButtonLoading(submitBtn, true);
    try {
      const res = await fetch(`${backendURL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ NEW: Include specialty in the body
        body: JSON.stringify({ name, email, password, role, specialty }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        showNotification(data.error || "Registration failed.", "error");
      }
    } catch (err) {
      console.error("Registration error:", err);
      showNotification(
        "Registration failed. Please check your network.",
        "error"
      );
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// --- Login ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const submitBtn = loginForm.querySelector(".btn-submit");

    setButtonLoading(submitBtn, true);
    try {
      const res = await fetch(`${backendURL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userName", data.name);
        // Ensure specialty is also stored for doctors during login if needed on frontend (optional for now)
        // localStorage.setItem("userSpecialty", data.specialty || '');
        showNotification("Login successful!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        showNotification(
          data.error || "Login failed. Invalid credentials.",
          "error"
        );
      }
    } catch (err) {
      console.error("Login error:", err);
      showNotification("Error logging in. Please check your network.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}
/* END OF FILE auth.js */
