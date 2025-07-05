import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import RatingForm from "../components/RatingForm";
import UserRatingSummary from "../components/UserRatingSummary";
import StatusBadge from "../components/StatusBadge";



export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  // const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTask();
  }, []);

  const fetchTask = async () => {
    try {
      const res = await API.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      setError("Task not found.");
    }
  };

  const handleAccept = async () => {
    try {
      await API.post(`/tasks/${id}/accept`);
      setMessage("Task accepted successfully!");
      fetchTask(); // refresh data
    } catch (err) {
      setError(err.response?.data?.error || "Could not accept task.");
    }
  };

  if (error)
    return <div className="text-center text-red-600 mt-10">{error}</div>;
  if (!task) return <div className="text-center mt-10">Loading task...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
      <p className="text-gray-700 mb-3">{task.description}</p>
      <p className="text-sm text-gray-600 mb-1">📍 Location: {task.location}</p>
      <p className="text-sm text-gray-600 mb-1">💰 Budget: ${task.price}</p>
      <p className="text-sm text-gray-600 mb-1">📅 Status: {task.status}</p>
      <StatusBadge status={task.status} />
      <p className="text-sm text-gray-600 mb-4">
        👤 Posted by: {task.employer?.name}
      </p>
      <UserRatingSummary userId={task.employer?._id} />

      {task.freelancer && (
        <>
          <p className="text-sm text-green-600 font-semibold mb-2">
            Assigned to:{" "}
            <Link
              to={`/user/${task.freelancer._id}`}
              className="text-blue-600 hover:underline"
            >
              {task.freelancer.name}
            </Link>
          </p>
          <UserRatingSummary userId={task.freelancer._id} />
        </>
      )}

      {/* Accept Button - only for freelancers and only if task is open */}
      {user?.role === "freelancer" && task.status === "open" && (
        <button
          onClick={handleAccept}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Accept Task
        </button>
      )}
      {/* Mark as Completed - only assigned freelancer */}
      {user?.role === "freelancer" &&
        task.status === "assigned" &&
        task.freelancer?._id === user._id && (
          <button
            onClick={async () => {
              try {
                await API.post(`/tasks/${task._id}/complete`);
                setMessage("Task marked as completed!");
                fetchTask(); // Refresh
              } catch (err) {
                setError(err.response?.data?.error || "Error completing task");
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
          >
            Mark as Completed
          </button>
        )}
      {user && task.status === "completed" && (
        <RatingForm task={task} user={user} onRated={fetchTask} />
      )}

      {message && <p className="mt-3 text-green-600">{message}</p>}
    </div>
  );
}
