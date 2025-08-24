import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const chartData = [
  { month: "Jan", donations: 5 },
  { month: "Feb", donations: 8 },
  { month: "Mar", donations: 3 },
  { month: "Apr", donations: 10 },
  { month: "May", donations: 6 },
  { month: "Jun", donations: 12 },
];

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-black text-yellow-400 p-8">
      <h1 className="text-3xl font-bold mb-6"> Past Contributions</h1>

      <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
            <XAxis dataKey="month" stroke="#FFD700" />
            <YAxis stroke="#FFD700" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="donations"
              stroke="#FFD700"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
