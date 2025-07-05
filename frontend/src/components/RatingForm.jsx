import { useEffect, useState } from "react";
import API from "../services/api";

export default function RatingForm({ task, user, onRated }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [alreadyRated, setAlreadyRated] = useState(false);

  const targetUser =
    user._id === task.employer._id ? task.freelancer : task.employer;

  useEffect(() => {
    checkIfRated();
  }, []);

  const checkIfRated = async () => {
    try {
      const res = await API.get(`/ratings/${user._id}`);
      const already = res.data.find(
        (r) => r.task === task._id && r.to === targetUser._id
      );
      if (already) setAlreadyRated(true);
    } catch (err) {
      console.error("Error checking existing ratings", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/ratings", {
        to: targetUser._id,
        task: task._id,
        score,
        comment,
      });
      setMessage("Rating submitted successfully!");
      setError("");
      setAlreadyRated(true);
      onRated?.(); // callback to refresh task or UI
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit rating");
    }
  };

  if (!targetUser) return null;

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-2">Leave a Rating</h3>

      {alreadyRated ? (
        <p className="text-yellow-600 font-medium">
          ⭐ You have already rated this task
        </p>
      ) : message ? (
        <p className="text-green-600">{message}</p>
      ) : (
        <>
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Score</label>
              <select
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full border p-2 rounded"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Submit Rating
            </button>
          </form>
        </>
      )}
    </div>
  );
}
