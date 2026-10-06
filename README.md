# 🚀 GigPilot

**GigPilot** is a full-stack freelance task marketplace built with **React**, **Spring Boot**, and **MongoDB**. It connects employers with local freelancers for short-term, quick-turnaround projects.

---

## 📌 Features

- 🧑‍💼 Employers can post tasks, assign freelancers, and rate them.
- 🧑‍💻 Freelancers can browse and accept open gigs.
- ✅ JWT Authentication with role-based access control.
- ⭐ Ratings & reviews between users.
- 📊 Public profile pages with task history and average rating.
- 🔍 Task search, filters, and role-specific dashboards.
- 📱 Fully responsive UI using TailwindCSS.

---

## 🛠 Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Frontend | React (Vite), TailwindCSS     |
| Backend  | Java 17, Spring Boot, Spring Data MongoDB |
| Database | MongoDB Atlas                 |
| Auth     | JWT-based authentication      |

---

## 🔧 Project Structure

```
gigpilot/
│
├── frontend/ # React-based UI (Vite + Tailwind)
├── backend/ # Spring Boot API (Spring Data MongoDB, JWT)
└── README.md # This file
```

## 🧪 Running Locally

```bash
# 1. Clone repo
git clone https://github.com/thedistortedwajdan/gigpilot-freelance-marketplace-React-SpringBoot

# 2. Install dependencies
# backend deps are resolved by Maven
cd frontend && npm install

# 3. Set environment variables
# in backend/.env
MONGO_URI=your-mongo-uri
JWT_SECRET=a-secret-of-at-least-32-characters

# 4. Run both servers
cd backend && mvn spring-boot:run   # Start API
cd frontend && npm run dev    # Start Vite frontend
```
