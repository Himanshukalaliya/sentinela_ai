# 🛡️ SentinelAI — Threat Detection & Phishing Analysis Platform

![Java](https://img.shields.io/badge/Java-21-007396?style=flat-square&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.5-6DB33F?style=flat-square&logo=springboot)
![Maven](https://img.shields.io/badge/Maven-3.9.15-C71A36?style=flat-square&logo=apachemaven)
![H2](https://img.shields.io/badge/Database-H2-0000BB?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

SentinelAI is a full-stack cybersecurity web application that detects **phishing URLs** and **suspicious email content** in real time. It features an animated threat meter, AI-style content analysis, Google Safe Browsing integration, and JWT-based user authentication — all in a sleek dark-themed dashboard.

---

## 📸 Features

- 🔍 **Real-time URL & text scanning** with a 0–100 risk score
- 🎯 **Animated threat meter** — color-coded green / amber / red
- 🤖 **AI content analysis** — urgency detection, fear tactics, spoofing patterns
- 🌐 **Google Safe Browsing API** integration for blacklist lookup
- 🔐 **JWT authentication** — Sign Up, Sign In, persistent sessions
- 🕒 **Per-user scan history** stored in an embedded H2 database
- 📄 **API Docs page** built into the dashboard
- ⚙️ **Settings page** with live backend connectivity status

---

## 🗂️ Project Structure

```
sentinelai/
├── index1.html               # Frontend SPA (all pages in one file)
├── style.css                 # Dark-theme CSS with custom properties
├── script.js                 # Navigation, scan logic, auth, meter animation
├── pom.xml                   # Maven build config & dependencies
├── application.properties    # Server, DB, JWT, and API key config
└── data/
    └── sentinelai2.mv.db     # H2 file-based database (auto-created)
```

---

## 🛠️ Tech Stack

| Layer      | Technology              | Version     |
|------------|-------------------------|-------------|
| Backend    | Java + Spring Boot      | 21 / 3.4.5  |
| Security   | Spring Security + JJWT  | 0.12.6      |
| Database   | H2 (embedded, file)     | Managed     |
| Frontend   | HTML5, CSS3, Vanilla JS | —           |
| Charts     | HTML5 Canvas API        | —           |
| Build Tool | Maven                   | 3.9.15      |

---

## 🚀 Getting Started

### Prerequisites

- Java 21+
- Maven 3.9+
- Any modern browser (Chrome, Firefox, Edge)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sentinelai.git
cd sentinelai
```

### 2. Start the Backend

```bash
mvn spring-boot:run
```

The server starts at **http://localhost:8081**. The H2 database is created automatically at `./data/sentinelai2.mv.db`.

### 3. Open the Frontend

Simply open `index1.html` in your browser. No build step needed.

> 💡 **Tip:** Navigate to the **Settings** page to confirm the backend shows **Connected**.

---

## ⚙️ Configuration

All settings live in `src/main/resources/application.properties`:

```properties
# Server
server.port=8081

# H2 Database
spring.datasource.url=jdbc:h2:file:./data/sentinelai2
spring.h2.console.enabled=true        # http://localhost:8081/h2-console

# JWT
jwt.secret=your-secret-key-here       # Must be 256+ bits
jwt.expiration=86400000               # 24 hours

# Google Safe Browsing (optional)
# Get a free key at: https://developers.google.com/safe-browsing/v4/get-started
safebrowsing.api.key=YOUR_API_KEY
```

> ⚠️ **Before deploying to production**, move secrets to environment variables and disable the H2 console.

---

## 📡 API Reference

All endpoints are served at `http://localhost:8081`.

### `POST /api/auth/signup`
Register a new user.
```json
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }
```

### `POST /api/auth/login`
Authenticate and receive a JWT token.
```json
{ "email": "john@example.com", "password": "secret123" }
```

### `POST /api/scan`
Analyze a URL or text for threats. Attach a Bearer token to save results to history.
```json
{ "content": "http://secure-login-bank-verify.com/reset" }
```
**Response:**
```json
{
  "status": "HIGH RISK",
  "score": 85,
  "reason": "Suspicious keywords detected: login, verify, bank",
  "domain": "secure-login-bank-verify.com",
  "safeBrowsing": "No threats detected",
  "safeBrowsingEnabled": true,
  "keywordCount": 3
}
```

### `GET /api/history`
Retrieve scan history (requires Bearer token).

---

## 🔍 Detection Logic

| Check                   | Details                                              |
|-------------------------|------------------------------------------------------|
| **Keyword Detection**   | urgent, suspended, password, verify, account, login, bank |
| **Character Analysis**  | `@` and `-` in domain names raise suspicion          |
| **Safe Browsing API**   | Real-time lookup against Google's threat database    |
| **Risk Scoring**        | `> 70` = HIGH RISK · `40–70` = SUSPICIOUS · `< 40` = SAFE |

---

## 🧪 Quick Test with curl

```bash
# Scan a URL
curl -X POST http://localhost:8081/api/scan \
  -H "Content-Type: application/json" \
  -d '{"content": "http://secure-login-example.com/verify"}'

# Sign up
curl -X POST http://localhost:8081/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"secret123"}'

# Scan with auth (saves to history)
curl -X POST http://localhost:8081/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{"content": "http://phishing-bank-verify.com"}'
```

---

## 🗺️ Roadmap

- [ ] Upgrade Java runtime to **25** (plan in `plan.md`)
- [ ] Replace H2 with **PostgreSQL** for production
- [ ] Integrate real **ML/NLP model** for phishing classification
- [ ] Add real **WHOIS API** for domain age verification
- [ ] Add **PhishTank / URLhaus** blacklist checks
- [ ] Frontend build pipeline with **Vite**
- [ ] Rate limiting on `/api/scan`
- [ ] Email verification on signup

---

## 🤝 Contributing

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">Built with ❤️ by the SentinelAI team</p>
