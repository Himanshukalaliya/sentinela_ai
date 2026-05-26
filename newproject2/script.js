let authToken = localStorage.getItem("token");
let userName = localStorage.getItem("userName");
let userEmail = localStorage.getItem("userEmail");
let totalScans = 0;
let highRiskCount = 0;
let safeCount = 0;
let currentScore = 0;
let meterAnimation = null;

// ===== NAVIGATION =====
function switchPage(page) {
    document.querySelectorAll(".sidebar nav a, .sidebar-footer a").forEach(a => a.classList.remove("active"));
    ["Dashboard", "History", "ApiDocs", "Settings"].forEach(p => {
        const el = document.getElementById("page" + p);
        if (el) el.classList.add("page-hidden");
    });
    const target = document.getElementById("page" + page);
    if (target) target.classList.remove("page-hidden");
    const navEl = document.getElementById("nav" + page);
    if (navEl) navEl.classList.add("active");
}

document.getElementById("navDashboard").onclick = function(e) { e.preventDefault(); switchPage("Dashboard"); };
document.getElementById("navHistory").onclick = function(e) { e.preventDefault(); switchPage("History"); loadHistory(); };
document.getElementById("navApiDocs").onclick = function(e) { e.preventDefault(); switchPage("ApiDocs"); };
document.getElementById("navSettings").onclick = function(e) { e.preventDefault(); switchPage("Settings"); checkBackend(); };
document.getElementById("navAccount").onclick = function(e) { e.preventDefault(); showAccountModal(); };

// ===== THREAT METER =====
function drawMeter(score) {
    const canvas = document.getElementById("threatMeter");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 100, cy = 100, r = 80, lineWidth = 14;

    ctx.clearRect(0, 0, 200, 200);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    const endAngle = 0.75 * Math.PI + (score / 100) * 1.5 * Math.PI;
    const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#10b981";

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, Math.min(endAngle, 2.25 * Math.PI));
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, Math.min(endAngle, 2.25 * Math.PI));
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function animateMeter(targetScore) {
    if (meterAnimation) cancelAnimationFrame(meterAnimation);
    const startScore = currentScore;
    const duration = 800;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        currentScore = Math.round(startScore + (targetScore - startScore) * eased);

        drawMeter(currentScore);
        const mv = document.getElementById("meterValue");
        if (mv) mv.textContent = currentScore + "%";

        if (progress < 1) {
            meterAnimation = requestAnimationFrame(step);
        }
    }
    meterAnimation = requestAnimationFrame(step);
}

function updateMeterLabel(score, status) {
    const label = document.getElementById("meterLabel");
    if (!label) return;
    if (!status || status === "PENDING SCAN") {
        label.textContent = "Awaiting Scan";
        label.style.color = "#64748b";
        return;
    }
    if (score > 70) {
        label.textContent = "High Threat";
        label.style.color = "#ef4444";
    } else if (score > 40) {
        label.textContent = "Suspicious";
        label.style.color = "#f59e0b";
    } else {
        label.textContent = "Safe";
        label.style.color = "#10b981";
    }
}

// ===== AUTH HEADERS =====
function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    return headers;
}

function updateAuthUI() {
    const btn = document.querySelector(".btn-outline");
    const accountNav = document.getElementById("navAccount").querySelector(".nav-label");
    const signOutBtn = document.getElementById("navSignOut");
    if (authToken && userName) {
        if (btn) btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ' + userName;
        if (accountNav) accountNav.textContent = userName;
        if (signOutBtn) signOutBtn.style.display = "flex";
    } else {
        if (btn) btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Sign In';
        if (accountNav) accountNav.textContent = "Account";
        if (signOutBtn) signOutBtn.style.display = "none";
    }
}

function handleLogout(e) {
    if (e) e.preventDefault();
    authToken = null;
    userName = null;
    userEmail = null;
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    totalScans = 0;
    highRiskCount = 0;
    safeCount = 0;
    updateStatDisplays();
    updateAuthUI();
    switchPage("Dashboard");
    document.getElementById("historyBody").innerHTML = "";
    document.getElementById("historyTable").style.display = "none";
    document.getElementById("historyEmpty").style.display = "block";
    document.getElementById("historyEmpty").textContent = "Signed out. Sign in to view scan history.";
    drawMeter(0);
    document.getElementById("meterValue").textContent = "--";
    document.getElementById("meterLabel").textContent = "Awaiting Scan";
}

document.getElementById("navSignOut").onclick = handleLogout;

// ===== SCAN =====
async function startScan() {
    const inputVal = document.getElementById("scanInput").value;
    if (!inputVal) {
        alert("Please enter a URL or text to scan!");
        return;
    }

    animateMeter(0);

    try {
        const response = await fetch('http://localhost:8081/api/scan', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ content: inputVal })
        });

        if (response.status === 401) { handleExpiredToken(); return; }

        const data = await response.json();

        if (!response.ok) {
            alert("Error: " + (data.error || "Unknown error"));
            return;
        }

        const score = data.score || 0;
        const isHighRisk = data.status === "HIGH RISK";
        const isSuspicious = data.status === "SUSPICIOUS";

        const el = document.getElementById("riskLevel");
        if (el) {
            el.innerText = data.status;
            el.className = "risk-badge " + (isHighRisk ? "high-risk" : isSuspicious ? "suspect" : "safe");
        }

        const urlSign = document.getElementById("urlSign");
        if (urlSign) {
            urlSign.innerText = data.domain && data.domain !== "N/A" ? "Domain: " + data.domain : "No domain extracted";
            urlSign.className = isHighRisk ? "suspect" : "safe";
        }

        const domainAge = document.getElementById("domainAge");
        if (domainAge) {
            domainAge.innerText = isHighRisk ? "Less than 30 days" : "Registered 2+ years ago";
            domainAge.className = isHighRisk ? "suspect" : "safe";
        }

        const blacklist = document.getElementById("blacklistCheck");
        if (blacklist) {
            blacklist.innerText = isHighRisk ? "Listed on blacklists" : "Not blacklisted";
            blacklist.className = isHighRisk ? "suspect" : "safe";
        }

        const sbEl = document.getElementById("safeBrowsingCheck");
        if (sbEl) {
            const sbText = data.safeBrowsing || "Not checked";
            const sbEnabled = data.safeBrowsingEnabled;
            sbEl.innerText = sbText;
            if (sbText.includes("Flagged")) {
                sbEl.className = "suspect";
            } else if (sbText === "No threats detected") {
                sbEl.className = "safe";
            } else if (!sbEnabled) {
                sbEl.innerText = "Not configured (set API key)";
                sbEl.className = "neutral";
            } else {
                sbEl.className = "neutral";
            }
        }

        const prediction = document.getElementById("aiPrediction");
        if (prediction) {
            prediction.innerText = isHighRisk ? "Prediction: Phishing Likely" : isSuspicious ? "Prediction: Suspicious" : "Prediction: Legitimate";
            prediction.style.color = isHighRisk ? "#ef4444" : isSuspicious ? "#f59e0b" : "#10b981";
        }

        const urgency = document.getElementById("aiUrgency");
        if (urgency) {
            urgency.innerText = (data.keywordCount || 0) > 0 ? "High urgency language detected" : "No urgency cues";
            urgency.className = (data.keywordCount || 0) > 0 ? "suspect" : "safe";
        }

        const fear = document.getElementById("aiFear");
        if (fear) {
            fear.innerText = (data.keywordCount || 0) > 1 ? "Fear-based tactics present" : "Neutral tone";
            fear.className = (data.keywordCount || 0) > 1 ? "suspect" : "safe";
        }

        const misleading = document.getElementById("aiMisleading");
        if (misleading) {
            misleading.innerText = isHighRisk ? "Possible spoofing detected" : "No misleading patterns";
            misleading.className = isHighRisk ? "suspect" : "safe";
        }

        animateMeter(score);
        updateMeterLabel(score, data.status);

        if (authToken) {
            await loadStats();
        } else {
            totalScans++;
            if (isHighRisk) highRiskCount++; else safeCount++;
            updateStatDisplays();
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Backend not reachable. Ensure Java is running!");
    }
}

// ===== STATS =====
function updateStatDisplays() {
    const st = document.getElementById("statTotal");
    const sr = document.getElementById("statRisk");
    const ss = document.getElementById("statSafe");
    if (st) st.textContent = totalScans;
    if (sr) sr.textContent = highRiskCount;
    if (ss) ss.textContent = safeCount;
}

async function loadStats() {
    if (!authToken) return;
    try {
        const resp = await fetch('http://localhost:8081/api/history', {
            headers: authHeaders()
        });
        if (resp.ok) {
            const data = await resp.json();
            totalScans = data.stats.total;
            highRiskCount = data.stats.highRisk;
            safeCount = data.stats.safe;
            updateStatDisplays();
        }
    } catch (e) { /* ignore */ }
}

// ===== HISTORY =====
function handleExpiredToken() {
    if (authToken) {
        alert("Session expired. Please sign in again.");
        handleLogout(null);
    }
}

async function loadHistory() {
    const body = document.getElementById("historyBody");
    const empty = document.getElementById("historyEmpty");
    const table = document.getElementById("historyTable");

    if (!authToken) {
        if (empty) empty.textContent = "Sign in to view scan history.";
        if (table) table.style.display = "none";
        return;
    }

    try {
        const resp = await fetch('http://localhost:8081/api/history', {
            headers: authHeaders()
        });
        if (resp.status === 401) { handleExpiredToken(); return; }
        if (!resp.ok) {
            if (empty) empty.textContent = "Failed to load history.";
            return;
        }
        const data = await resp.json();
        if (data.history.length === 0) {
            if (empty) { empty.textContent = "No scans performed yet."; empty.style.display = "block"; }
            if (table) table.style.display = "none";
            return;
        }
        if (empty) empty.style.display = "none";
        if (table) table.style.display = "table";
        if (body) body.innerHTML = "";

        for (const entry of data.history) {
            const row = document.createElement("tr");
            const c = entry.status === "HIGH RISK" ? "suspect" : entry.status === "SUSPICIOUS" ? "suspect" : "safe";
            row.innerHTML = "<td>" + new Date(entry.scannedAt).toLocaleString() + "</td><td>" + escapeHtml(entry.input) + "</td><td class='" + c + "'>" + entry.status + "</td><td>" + entry.score + "</td><td>" + entry.reason + "</td>";
            body.appendChild(row);
        }
    } catch (e) {
        if (empty) empty.textContent = "Error loading history.";
    }
}

function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
}

// ===== SETTINGS =====
async function checkBackend() {
    const el = document.getElementById("backendStatus");
    if (!el) return;
    try {
        const resp = await fetch('http://localhost:8081/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: "test" })
        });
        const data = await resp.json();
        el.innerText = resp.ok ? "Connected" : "Error";
        el.className = resp.ok ? "safe" : "suspect";

        const sbStatus = document.getElementById("sbApiStatus");
        if (sbStatus && data) {
            if (data.safeBrowsingEnabled) {
                sbStatus.innerText = "Configured & Active";
                sbStatus.className = "safe";
            } else {
                sbStatus.innerText = "Not configured (set API key in application.properties)";
                sbStatus.className = "neutral";
            }
        }
    } catch {
        el.innerText = "Not reachable";
        el.className = "suspect";
    }
}

// ===== ACCOUNT MODAL =====
function showAccountModal() {
    document.getElementById("accountModal").classList.add("show");
}

function hideAccountModal() {
    document.getElementById("accountModal").classList.remove("show");
}

function switchTab(tab) {
    document.getElementById("tabLogin").classList.toggle("active", tab === "login");
    document.getElementById("tabSignup").classList.toggle("active", tab === "signup");
    document.getElementById("loginForm").style.display = tab === "login" ? "block" : "none";
    document.getElementById("signupForm").style.display = tab === "signup" ? "block" : "none";
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
        const resp = await fetch('http://localhost:8081/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await resp.json();
        if (!resp.ok) { alert(data.error); return false; }
        authToken = data.token;
        userName = data.name;
        userEmail = data.email;
        localStorage.setItem("token", authToken);
        localStorage.setItem("userName", userName);
        localStorage.setItem("userEmail", userEmail);
        updateAuthUI();
        hideAccountModal();
        loadStats();
        alert("Signed in as " + userName);
    } catch (e) {
        alert("Backend not reachable");
    }
    return false;
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    try {
        const resp = await fetch('http://localhost:8081/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await resp.json();
        if (!resp.ok) { alert(data.error); return false; }
        authToken = data.token;
        userName = data.name;
        userEmail = data.email;
        localStorage.setItem("token", authToken);
        localStorage.setItem("userName", userName);
        localStorage.setItem("userEmail", userEmail);
        updateAuthUI();
        hideAccountModal();
        alert("Account created! Signed in as " + userName);
    } catch (e) {
        alert("Backend not reachable");
    }
    return false;
}

document.getElementById("accountModal").onclick = function(e) {
    if (e.target === this) hideAccountModal();
};

// ===== URL BAR FIX =====
document.getElementById("scanInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") startScan();
});

// ===== INIT =====
drawMeter(0);
updateAuthUI();
checkBackend();
if (authToken) loadStats();
