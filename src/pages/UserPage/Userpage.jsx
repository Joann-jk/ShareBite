import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../lib/AuthContext";

// Utility: Haversine formula for distance calculation
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Utility function for expired status
function isExpired(expiry) {
  return Date.now() > new Date(expiry).getTime();
}

const chartData = [
  { month: "Jan", donations: 5 },
  { month: "Feb", donations: 8 },
  { month: "Mar", donations: 3 },
  { month: "Apr", donations: 10 },
  { month: "May", donations: 6 },
  { month: "Jun", donations: 12 },
];

export default function UserPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  // ^^^ Make sure your AuthContext provides a logout method!

  const [donations, setDonations] = useState([]);
  const [nearestOrgs, setNearestOrgs] = useState([]);
  const [userLoc, setUserLoc] = useState({ latitude: null, longitude: null });

  // Separate donations
  const [unclaimed, setUnclaimed] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [delivered, setDelivered] = useState([]);

  // Fetch all donations by this user and update live
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    async function fetchDonations() {
      const { data, error } = await supabase
        .from("donations")
        .select(`
    *,
    organisation:organisation_id ( name )
  `)
        .eq("donor_id", userId)
        .order("created_at", { ascending: false });
      if (error) return;
      setDonations(data || []);
    }
    fetchDonations();

    const channel = supabase
      .channel("donations-realtime-user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        async (payload) => {
          const newDonation = payload.new;
          if (newDonation?.donor_id === userId) {
            let orgName = "";
            if (newDonation.organisation_id) {
              const { data: orgData } = await supabase
                .from("users")
                .select("name")
                .eq("id", newDonation.organisation_id)
                .single();
              orgName = orgData?.name || "";
            }
            setDonations((prev) => {
              const filtered = prev.filter((d) => d.id !== newDonation.id);
              return [
                {
                  ...newDonation,
                  organisation: orgName ? { name: orgName } : null,
                },
                ...filtered,
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto update expired donations in DB
  useEffect(() => {
    async function updateExpiredDonations() {
      const now = new Date();
      const expiredDonations = donations.filter(
        (d) => new Date(d.expiry) < now && d.status !== "expired"
      );
      for (const donation of expiredDonations) {
        await supabase
          .from("donations")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", donation.id);
      }
    }
    if (donations.length > 0) updateExpiredDonations();
  }, [donations]);

  // Categorize donations into unclaimed, claimed, delivered
  useEffect(() => {
    setUnclaimed(donations.filter((d) => d.status === "posted"));
    setClaimed(donations.filter((d) => d.status === "claimed" || d.status === "picked"));
    setDelivered(donations.filter((d) => d.status === "delivered"));
  }, [donations]);

  // Get user location (for nearest orgs)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // fallback or error
        }
      );
    }
  }, []);

  // Fetch nearest edible NGOs
  useEffect(() => {
    async function fetchOrgs() {
      if (!userLoc.latitude || !userLoc.longitude) return;
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, name, organisation_type, acceptance_type, address, latitude, longitude"
        )
        .eq("role", "recipient")
        .eq("acceptance_type", "edible")
        .not("organisation_type", "is", null)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) return;

      const withDistance = data.map((org) => ({
        ...org,
        distance: getDistanceFromLatLonInKm(
          userLoc.latitude,
          userLoc.longitude,
          org.latitude,
          org.longitude
        ),
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      setNearestOrgs(withDistance.slice(0, 5));
    }
    fetchOrgs();
  }, [userLoc]);

  // Handle logout
  const handleLogout = async () => {
    if (logout) {
      await logout(); // If your AuthContext uses a promise
    } else {
      // fallback: supabase sign out
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-yellow-400 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 border-b border-yellow-400">
        <div className="text-2xl font-bold">ShareBite</div>
        <div className="space-x-6 text-lg flex items-center">
          <button
            className="hover:text-white"
            onClick={() => navigate("/DonationForm")}
          >
            Donate
          </button>
          <button
            className="hover:text-white"
            onClick={() => navigate("/analytics")}
          >
            Analytics
          </button>
          <button className="hover:text-white">Green Score</button>
          <button
            className="hover:text-white border border-yellow-400 rounded px-3 py-1 ml-4"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Hero / Welcome Section */}
      <header className="flex flex-col items-center justify-center py-16 bg-black text-yellow-400 rounded-b-3xl shadow-lg">
        <h1 className="text-4xl font-extrabold">
         Welcome To Your Donor Space !
        </h1>
        <p className="mt-3 text-lg">
          Track your contributions and impact on the planet.
        </p>
      </header>

      {/* Analytics Section */}
      <section className="flex flex-col items-center justify-center py-12">
        <button
          onClick={() => navigate("/DonationForm")}
          className="bg-yellow-400 text-black px-10 py-5 text-2xl rounded-full font-extrabold shadow-lg hover:bg-yellow-500 transition"
        >
          Your Donation Today
        </button>
      </section>

      {/* Green Score Section */}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">Your Green Score</h2>
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <p className="mb-2">
            Your eco impact: <span className="font-bold">75%</span>
          </p>
          <div className="w-full bg-gray-700 rounded-full h-6">
            <div className="bg-green-600 h-6 rounded-full w-3/4"></div>
          </div>
        </div>
      </section>

      {/* Donations Section */}
      <section className="p-8">
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6">Your Donations</h2>
          {/* Grid container for horizontal layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Unclaimed Donations */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">Unclaimed Donations</h3>
              {unclaimed.length === 0 ? (
                <p className="text-gray-400 mb-4">No unclaimed donations.</p>
              ) : (
                <ul className="space-y-4">
                  {unclaimed.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity} {d.quantity_unit})<br />
                      <span className="text-xs">Expires: {new Date(d.expiry).toLocaleString()}</span>
                      <br />
                      {isExpired(d.expiry) ? (
                        <span className="block mt-1 font-bold text-red-500">Status: Expired</span>
                      ) : (
                        <span className="block mt-1 font-bold text-red-400">Status: Unclaimed</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Claimed/Picked Donations */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">Claimed / Picked Donations</h3>
              {claimed.length === 0 ? (
                <p className="text-gray-400 mb-4">No claimed or picked donations.</p>
              ) : (
                <ul className="space-y-4">
                  {claimed.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity} {d.quantity_unit})<br />
                      <span className="text-xs">Expires: {new Date(d.expiry).toLocaleString()}</span>
                      <br />
                      <span className="block mt-1 font-semibold">Claimed by: {d.organisation?.name || "Organisation"}</span>
                      {isExpired(d.expiry) ? (
                        <span className="block mt-1 font-bold text-red-500">Status: Expired</span>
                      ) : (
                        <span className="block mt-1 font-bold text-blue-400">Status: {d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Delivered Donations */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">Delivered Donations</h3>
              {delivered.length === 0 ? (
                <p className="text-gray-400">No delivered donations yet.</p>
              ) : (
                <ul className="space-y-4">
                  {delivered.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity} {d.quantity_unit})<br />
                      <span className="text-xs">Expires: {new Date(d.expiry).toLocaleString()}</span>
                      <br />
                      <span className="block mt-1 font-semibold">Claimed by: {d.organisation?.name || "Organisation"}</span>
                      {isExpired(d.expiry) ? (
                        <span className="block mt-1 font-bold text-red-500">Status: Expired</span>
                      ) : (
                        <span className="block mt-1 font-bold text-green-400">Status: Delivered</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nearest NGOs Section (only edible) */}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">Nearest NGOs</h2>
        <div className="bg-gray-900 p-4 rounded-xl shadow-lg">
          {nearestOrgs.length === 0 ? (
            <p className="text-gray-400">
              No nearby  food NGOs found.
            </p>
          ) : (
            <ul className="space-y-2">
              {nearestOrgs.map((org) => (
                <li key={org.id} className="border p-2 rounded">
                  <span className="font-bold">{org.name}</span> -{" "}
                  {org.organisation_type}
                  <br />
                  <span className="text-xs">
                    Distance: {org.distance.toFixed(2)} km
                  </span>
                  <span className="block text-xs">Address: {org.address}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}