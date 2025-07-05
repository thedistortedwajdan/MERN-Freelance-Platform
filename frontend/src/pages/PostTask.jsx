import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function PostTask() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Redirect non-employers
  if (!user || user.role !== "employer") {
    return (
      <div className="text-center mt-10 text-red-600">
        Access denied. Only employers can post tasks.
      </div>
    );
  }

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tasks", {
        ...form,
        price: Number(form.price),
      });
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post task");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Post a New Task</h2>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">Task posted successfully!</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="title"
          type="text"
          placeholder="Task Title"
          required
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <textarea
          name="description"
          placeholder="Task Description"
          required
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          name="price"
          type="number"
          placeholder="Budget (USD)"
          required
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          name="location"
          type="text"
          placeholder="City or Area"
          required
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Post Task
        </button>
      </form>
    </div>
  );
}
