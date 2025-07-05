# 🔧 Backend – GigPilot

The backend is a **Node.js + Express** REST API with **MongoDB Atlas** and **Mongoose** for data modeling. It supports user auth, task posting, acceptance, completion, and ratings.

---

## 🛠 Tech Stack

- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt (password hashing)
- dotenv

---

## 📁 Folder Structure

```
backend/
│
├── routes/ # Express route handlers (auth, task, user, rating)
├── models/ # Mongoose schemas
├── middleware/ # Auth check, role guard (optional)
├── server.js # Entry point
└── .env # Secrets (Mongo URI, JWT secret)
```

## ✅ Core Features

- 🔐 JWT Auth + login/register
- 🧑‍💼 Role system: employer vs freelancer
- 📝 Employers post tasks, freelancers accept
- 📦 Task flow: open → assigned → completed
- ⭐ Ratings between users after task completion
- 📊 Public user profiles with stats + reviews

---

## 🌐 API Endpoints Overview

| Method | Endpoint             | Description                         |
|--------|----------------------|-------------------------------------|
| POST   | `/api/auth/register` | Register a new user                 |
| POST   | `/api/auth/login`    | Login and receive JWT               |
| GET    | `/api/tasks`         | List open tasks (filters optional) |
| POST   | `/api/tasks`         | Post new task (employer only)       |
| PATCH  | `/api/tasks/:id/accept` | Accept a task (freelancer only)  |
| PATCH  | `/api/tasks/:id/complete` | Mark as complete (freelancer)  |
| POST   | `/api/ratings`       | Submit rating (after task complete)|
| GET    | `/api/users/:id`     | Public profile with stats          |

## 🚀 Dev Commands

```bash
npm install
npm run dev