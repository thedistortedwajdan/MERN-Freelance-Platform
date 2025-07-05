import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    minPrice: "",
    maxPrice: "",
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });

      const res = await API.get(`/tasks?${params.toString()}`);
      setTasks(res.data);
    } catch (err) {
      setError("Failed to load tasks");
    }
  };

  const handleAccept = async (taskId) => {
    try {
      await API.post(`/tasks/${taskId}/accept`);
      fetchTasks(); // refresh
    } catch (err) {
      alert(err.response?.data?.error || "Failed to accept task");
    }
  };

  const handleChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleFilter = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  // Role Restriction
  if (!user || user.role !== "freelancer") {
    return (
      <div className="text-center mt-10 text-red-600">
        Access denied. Only freelancers can view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl font-bold mb-4">Available Tasks</h2>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6"
      >
        <input
          name="q"
          placeholder="Search title"
          className="border p-2 rounded"
          onChange={handleChange}
        />
        <input
          name="location"
          placeholder="City"
          className="border p-2 rounded"
          onChange={handleChange}
        />
        <input
          name="minPrice"
          placeholder="Min $"
          type="number"
          className="border p-2 rounded"
          onChange={handleChange}
        />
        <input
          name="maxPrice"
          placeholder="Max $"
          type="number"
          className="border p-2 rounded"
          onChange={handleChange}
        />
        <button
          type="submit"
          className="col-span-full sm:col-span-1 bg-blue-600 text-white p-2 rounded"
        >
          Apply Filters
        </button>
      </form>

      {/* Task List */}
      {error && <p className="text-red-600">{error}</p>}
      {tasks.length === 0 && <p>No tasks found.</p>}
      {tasks.map((task) => (
        <div key={task._id} className="border rounded p-4 mb-4 shadow-sm">
          <h3 className="text-lg font-bold">
            <Link
              to={`/task/${task._id}`}
              className="text-blue-600 hover:underline"
            >
              {task.title}
            </Link>
          </h3>
          <p className="text-gray-700">{task.description}</p>
          <p className="text-sm text-gray-500">📍 {task.location}</p>
          <p className="text-sm text-gray-600">💰 ${task.price}</p>
          <p className="text-sm text-gray-600">
            Posted by:{" "}
            <Link
              to={`/user/${employer._id}`}
              className="text-blue-600 hover:underline"
            >
              {task.employer?.name}
            </Link>
          </p>
          <button
            onClick={() => handleAccept(task._id)}
            className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
          >
            Accept Task
          </button>
        </div>
      ))}
    </div>
  );
}
