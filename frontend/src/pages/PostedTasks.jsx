import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import StatusBadge from "../components/StatusBadge";


export default function PostedTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === "employer") fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks/posted");
      setTasks(res.data);
    } catch (err) {
      setError("Failed to fetch your posted tasks.");
    }
  };

  if (!user || user.role !== "employer") {
    return (
      <div className="text-center mt-10 text-red-600">
        Access denied. Only employers can view this page.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl font-bold mb-4">Your Posted Tasks</h2>
      {error && <p className="text-red-500">{error}</p>}
      {tasks.length === 0 && <p>No tasks posted yet.</p>}

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
          <p className="text-sm">
            Status: <span className="font-medium">{task.status}</span>
            <StatusBadge status={task.status} />
          </p>
          {task.freelancer && (
            <p className="text-sm">
              Assigned to:{" "}
              <span>
                <Link
                  to={`/user/${task.freelancer._id}`}
                  className="text-blue-600 hover:underline"
                >
                  {task.freelancer.name}
                </Link>
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
