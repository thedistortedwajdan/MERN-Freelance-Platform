# 🎨 Frontend – GigPilot

The frontend of **GigPilot** is a React-based SPA built using **Vite**, **TailwindCSS**, and **React Router**. It offers a responsive and minimal UI designed for ease of use and role-based navigation.

---

## 🛠 Tools & Tech

- React (with Vite)
- React Router DOM (v6+)
- TailwindCSS
- Axios
- JWT handling via localStorage
- Context API for auth

---

## 📁 Folder Structure

frontend/
│
├── src/
│ ├── components/ # Shared UI components (Navbar, RouteWrappers)
│ ├── pages/ # Screens (Login, Dashboard, PostTask, etc.)
│ ├── context/ # AuthContext
│ ├── services/ # Axios wrapper
│ └── App.jsx # Routing and layout

## ✅ Core Principles

- **Role-Based UI**: Employers and freelancers see different dashboards, actions, and permissions.
- **Route Protection**: Auth + Role guards prevent unauthorized access using wrappers like:
  - `<PrivateRoute>`
  - `<RoleRoute>`
  - `<GuestOnlyRoute>`
- **State Management**: Auth state handled via React Context and localStorage.
- **Minimal UX**: Clean, mobile-first design using Tailwind.

---

## 🔄 Key User Flows

| Role        | Actions                                                  |
|-------------|----------------------------------------------------------|
| Employer    | Register → Post Task → View Applicants → Rate Freelancer|
| Freelancer  | Register → Browse Tasks → Accept → Complete → Get Rated |

---

## 📸 UI Highlights

- ✅ Diagonal gig-themed background on home page
- 🗂️ Task feed with filters (by price, category)
- 🧑‍💼 My Profile with stats and editable details
- ⭐ Public profile with ratings and task history

---

## 🚀 Dev Commands

```bash
npm install
npm run dev