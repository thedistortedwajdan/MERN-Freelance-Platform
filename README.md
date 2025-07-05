# 🚀 GigPilot

**GigPilot** is a full-stack freelance task marketplace built with **React**, **Node.js**, **Express**, and **MongoDB**. It connects employers with local freelancers for short-term, quick-turnaround projects.

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

| Layer       | Technology                         |
|-------------|------------------------------------|
| Frontend    | React (Vite), TailwindCSS          |
| Backend     | Node.js, Express.js, Mongoose      |
| Database    | MongoDB Atlas                      |
| Auth        | JWT-based authentication           |

---

## 🔧 Project Structure

gigpilot/
│
├── frontend/ # React-based UI (Vite + Tailwind)
├── backend/ # Express API, Mongoose models
└── README.md # This file

## 🧪 Running Locally

```bash
# 1. Clone repo
git clone https://github.com/yourusername/gigpilot

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Set environment variables
# in backend/.env
MONGO_URI=your-mongo-uri
JWT_SECRET=your-secret

# 4. Run both servers
cd backend && npm run dev     # Start API
cd frontend && npm run dev    # Start Vite frontend