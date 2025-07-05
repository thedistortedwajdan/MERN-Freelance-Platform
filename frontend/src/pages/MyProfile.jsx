import { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data.user);
      setStats(res.data.stats);
      setForm((prev) => ({ ...prev, name: res.data.user.name }));
    } catch (err) {
      setError("Failed to load profile");
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.password && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await API.put("/users/me", {
        name: form.name,
        password: form.password || undefined,
      });
      setMessage("Profile updated successfully!");
      fetchProfile(); // refresh
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    }
  };

  if (!profile)
    return <div className="mt-10 text-center">Loading profile...</div>;

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}

        <div>
          <label className="block font-medium">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Email</label>
          <input
            value={profile.email}
            disabled
            className="w-full border bg-gray-100 p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">New Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Your Stats</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>Total Tasks: {stats.totalTasks}</li>
          <li>Completed Tasks: {stats.completedTasks}</li>
          <li>
            Average Rating:{" "}
            {stats.avgRating ? `⭐ ${stats.avgRating} / 5` : "N/A"}
          </li>
          <li>Total Ratings: {stats.totalRatings}</li>
        </ul>
      </div>
    </div>
  );
}
