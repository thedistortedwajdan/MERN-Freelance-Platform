import { useEffect, useState } from "react";
import API from "../services/api";

export default function UserRatingSummary({ userId }) {
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRatings();
  }, [userId]);

  const fetchRatings = async () => {
    try {
      const res = await API.get(`/ratings/${userId}`);
      setRatings(res.data);
    } catch (err) {
      setError("Unable to load ratings.");
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!ratings.length) return <p className="text-gray-500">No ratings yet.</p>;

  const avgRating =
    ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

  return (
    <div className="mt-4">
      <p className="text-yellow-600 font-medium">
        ⭐ {avgRating.toFixed(1)} / 5 ({ratings.length} reviews)
      </p>

      <ul className="text-sm text-gray-700 mt-2 space-y-1">
        {ratings.slice(0, 3).map((r) => (
          <li key={r._id} className="border-l-4 border-yellow-400 pl-2 italic">
            “{r.comment}”
          </li>
        ))}
      </ul>
    </div>
  );
}
