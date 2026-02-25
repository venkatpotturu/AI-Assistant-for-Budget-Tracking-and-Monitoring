function getUserSettings(){

    let settings = JSON.parse(localStorage.getItem("userSettings"));

    if(!settings){
        settings = {
            theme: "light"
        };
        localStorage.setItem("userSettings", JSON.stringify(settings));
    }

    return settings;
}

function saveUserSettings(settings){
    localStorage.setItem("userSettings", JSON.stringify(settings));
    applyUserSettings();
}

function applyUserSettings(){

    const settings = getUserSettings();

    if(settings.theme === "dark"){
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
}

function loadCurrentSettings(){

    const settings = getUserSettings();

    const themeSelect = document.getElementById("themeSelect");

    if(themeSelect){
        themeSelect.value = settings.theme;
    }
}

async function updateSettings(){

    const theme = document.getElementById("themeSelect").value;
    const name = document.getElementById("profileName").value;
    const email = document.getElementById("profileEmail").value;

    // Save theme locally
    saveUserSettings({ theme });

    // 🔥 SAVE PROFILE TO BACKEND
    const res = await apiFetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
    });

    if(res && res.ok){

        const updatedUser = { name, email };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update UI instantly
        document.querySelector("#userProfile .name").innerText = name;
        document.querySelector("#userProfile .email").innerText = email;

        showNotification("Profile & Theme Updated", "success");

    } else {
        showNotification("Profile update failed", "error");
    }
}

async function updateProfile(){

    const name = document.getElementById("profileName").value;
    const email = document.getElementById("profileEmail").value;
    const theme = document.getElementById("themeSelect").value;

    const res = await apiFetch("/api/user/update-profile", {
        method:"PUT",
        body: JSON.stringify({ name, email, theme })
    });

    if(!res) return;

    const data = await res.json();

    // 🔥 Update localStorage
    localStorage.setItem("user", JSON.stringify(data.user));

    // 🔥 Refresh UI
    loadUserProfile(data.user);

    // 🔥 Apply theme
    applyTheme(theme);

    showNotification("Profile updated successfully", "success");
}

async function updateProfileSettings(){

    const name = document.getElementById("settingsName").value;
    const email = document.getElementById("settingsEmail").value;
    const theme = document.getElementById("settingsTheme").value;

    // 🔥 Save theme locally
    localStorage.setItem("theme", theme);

    const res = await apiFetch("/api/user/update-profile", {
        method: "PUT",
        body: JSON.stringify({
            name,
            email
        })
    });

    if(res && res.ok){

        const data = await res.json();

        // Update user locally
        localStorage.setItem("user", JSON.stringify(data.user));

        loadUserProfile(data.user);

        // Apply theme immediately
        applyTheme(theme);

        showNotification("Profile updated successfully", "success");
    }
}

function applyTheme(theme){

    document.body.classList.remove("light-theme","dark-theme");

    if(theme === "dark"){
        document.body.classList.add("dark-theme");
    }else{
        document.body.classList.add("light-theme");
    }
}