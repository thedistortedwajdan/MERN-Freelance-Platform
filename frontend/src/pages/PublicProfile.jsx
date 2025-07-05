import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await API.get(`/users/${id}`);
      setProfile({
        ...res.data,
        completedTasks: res.data.completedTasks || [],
      });
    } catch (err) {
      setError("User not found.");
    }
  };

  if (error)
    return <div className="text-red-600 mt-8 text-center">{error}</div>;
  if (!profile) return <div className="text-center mt-8">Loading...</div>;

  const { user, avgRating, totalRatings, recentRatings } =
    profile;


  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
      <p className="text-gray-700 mb-4 capitalize">Role: {user.role}</p>

      <div className="mb-4">
        <p className="text-yellow-600 font-medium">
          ⭐ {avgRating || "N/A"} / 5
        </p>
        <p className="text-sm text-gray-600">
          {totalRatings} rating{totalRatings !== 1 && "s"}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Recent Reviews</h3>
        {recentRatings.length === 0 ? (
          <p className="text-gray-500 italic">No reviews yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentRatings.map((r, i) => (
              <li key={i} className="border-l-4 border-yellow-400 pl-3">
                <p className="italic">“{r.comment}”</p>
                <p className="text-sm text-gray-600">
                  — {r.from} (⭐ {r.score})
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">
          Completed {profile.user.role === "freelancer" ? "Tasks" : "Projects"}{" "}
          ({profile.completedTasks.length})
        </h3>
        {profile.completedTasks.length === 0 ? (
          <p className="text-gray-500 italic">No completed tasks yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {profile.completedTasks.map((task) => (
              <li key={task._id} className="p-3 border rounded bg-gray-50">
                <p className="font-medium">{task.title}</p>
                <p className="text-gray-600">
                  {task.description.slice(0, 100)}...
                </p>
                <p className="text-green-700 mt-1">💰 ${task.price}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
