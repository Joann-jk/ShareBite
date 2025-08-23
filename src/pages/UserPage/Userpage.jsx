import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";  // ✅ for navigation

const data = [
  { month: "Jan", donations: 5 },
  { month: "Feb", donations: 8 },
  { month: "Mar", donations: 3 },
  { month: "Apr", donations: 10 },
  { month: "May", donations: 6 },
  { month: "Jun", donations: 12 },
];

export default function UserPage() {
  const navigate = useNavigate(); // ✅ hook for navigation

  return (
    <div className="min-h-screen bg-black text-yellow-400 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 border-b border-yellow-400">
        <div className="text-2xl font-bold">ShareBite</div>
        <div className="space-x-6 text-lg">
         <button
  className="hover:text-white"
  onClick={() => navigate("/DonationForm")}
>
  Donate
</button>
          <button className="hover:text-white">Analytics</button>
          <button className="hover:text-white">Green Score</button>
        </div>
      </nav>

      {/* Hero / Welcome Section */}
      <header className="flex flex-col items-center justify-center py-16 bg-black text-yellow-400 rounded-b-3xl shadow-lg">
        <h1 className="text-4xl font-extrabold">Welcome Back, Donor! </h1>
        <p className="mt-3 text-lg">Track your contributions and impact on the planet.</p>
      </header>

      {/* Analytics Section */}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">📊 Past Contributions</h2>
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis dataKey="month" stroke="#FFD700" />
              <YAxis stroke="#FFD700" />
              <Tooltip />
              <Line type="monotone" dataKey="donations" stroke="#FFD700" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Green Score Section */}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">🌍 Your Green Score</h2>
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <p className="mb-2">Your eco impact: <span className="font-bold">75%</span></p>
          <div className="w-full bg-gray-700 rounded-full h-6">
            <div className="bg-yellow-400 h-6 rounded-full w-3/4"></div>
          </div>
        </div>
      </section>

      {/* Big Center Button Section */}
      <section className="flex flex-col items-center justify-center py-12">
        <button
          onClick={() => navigate("/DonationForm")} // 
          className="bg-yellow-400 text-black px-10 py-5 text-2xl rounded-full font-extrabold shadow-lg hover:bg-yellow-500 transition"
        >
          🌟 Your Donation Today
        </button>
      </section>
    </div>
  );
}
