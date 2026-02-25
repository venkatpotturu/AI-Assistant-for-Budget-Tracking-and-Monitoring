/* ========================================
   AUTHENTICATION SYSTEM (BACKEND + JWT)
   ======================================== */


// On page load
document.addEventListener("DOMContentLoaded", function () {
    applySavedTheme();

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (token && user) {
        showApp();
        loadUserProfile(user);
    } else {
        showAuthScreen();
    }

    setupAuthHandlers();
    setupProfileHandlers();
});

/* ========================================
   AUTH HANDLERS
======================================== */

function setupAuthHandlers() {
    const showSignupBtn = document.getElementById("showSignup");
    const showLoginBtn = document.getElementById("showLogin");
    const loginForm = document.getElementById("loginFormSubmit");
    const signupForm = document.getElementById("signupFormSubmit");

    // Toggle forms
    showSignupBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginForm").classList.remove("active");
        document.getElementById("signupForm").classList.add("active");
    });

    showLoginBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("signupForm").classList.remove("active");
        document.getElementById("loginForm").classList.add("active");
    });

    /* ---------- SIGNUP (BACKEND) ---------- */
    signupForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;

        if (name.length < 2 || password.length < 6) {
            showNotification("Invalid signup details", "error");
            return;
        }

        const response = await fetch(`/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification("Account created! Please login.", "success");
            signupForm.reset();
            document.getElementById("signupForm").classList.remove("active");
            document.getElementById("loginForm").classList.add("active");
        } else {
            showNotification(data.error || "Signup failed", "error");
        }
    });

    /* ---------- LOGIN (BACKEND + JWT) ---------- */
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const response = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showNotification(`Welcome back, ${data.user.name}!`, "success");
        showApp();
        loadUserProfile(data.user);
        loginForm.reset();
    } else {
        showNotification(data.error || "Login failed", "error");
    }
});

}

/* ========================================
   PROFILE / LOGOUT
======================================== */

function setupProfileHandlers() {
    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn?.addEventListener("click", logout);
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showNotification("Logged out successfully", "success");

    setTimeout(() => location.reload(), 800);
}

/* ========================================
   UI HELPERS (UNCHANGED)
======================================== */

function showApp() {
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appContainer").style.display = "flex";

    initProfileDropdown();
}

function showAuthScreen() {
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
}

function loadUserProfile(user) {
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
}

/* ========================================
   THEME (UNCHANGED)
======================================== */

function applyTheme(theme) {
    document.body.classList.toggle("dark-theme", theme === "dark");
    localStorage.setItem("theme", theme);
}

function applySavedTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-theme");
    }
}
function initProfileDropdown() {
    const userProfile = document.getElementById("userProfile");
    const profileDropdown = document.getElementById("profileDropdown");

    if (!userProfile || !profileDropdown) return;

    userProfile.onclick = (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle("active"); // ✅ THIS LINE FIXES IT
    };

    document.onclick = () => {
        profileDropdown.classList.remove("active");
    };
}
