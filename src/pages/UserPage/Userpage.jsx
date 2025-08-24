import React, { useEffect, useState } from "react";
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

export default function UserPage() {
  const navigate = useNavigate();
  const { user, userDetail, logout } = useAuth();

  useEffect(() => {
    if (userDetail && userDetail.role !== "donor") {
      navigate("/redirect");
    }
  }, [userDetail, navigate]);

  const [donations, setDonations] = useState([]);
  const [nearestOrgs, setNearestOrgs] = useState([]);
  const [userLoc, setUserLoc] = useState({ latitude: null, longitude: null });

  const [unclaimed, setUnclaimed] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [delivered, setDelivered] = useState([]);

  // Fetch all donations by this user
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

      if (error) {
        console.error("fetchDonations error:", error);
        return;
      }
      setDonations(data || []);
    }

    fetchDonations();

    const channel = supabase
      .channel("donations-realtime-user")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: `donor_id=eq.${userId}`,
        },
        async (payload) => {
          const { eventType } = payload;
          const incoming = payload.new || payload.old;
          if (!incoming) return;

          if (eventType === "DELETE") {
            setDonations((prev) => prev.filter((d) => d.id !== incoming.id));
            return;
          }

          let orgName = "";
          if (incoming.organisation_id) {
            const { data: orgData } = await supabase
              .from("users")
              .select("name")
              .eq("id", incoming.organisation_id)
              .single();
            orgName = orgData?.name || "";
          }

          setDonations((prev) => {
            const filtered = prev.filter((d) => d.id !== incoming.id);
            return [
              {
                ...incoming,
                organisation: orgName ? { name: orgName } : null,
              },
              ...filtered,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Categorize donations
  useEffect(() => {
    setUnclaimed(donations.filter((d) => d.status === "posted"));
    setClaimed(
      donations.filter((d) => d.status === "claimed" || d.status === "picked")
    );
    setDelivered(donations.filter((d) => d.status === "delivered"));
  }, [donations]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLoc({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      });
    }
  }, []);

  // Fetch nearest NGOs
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

      const withDistance = (data || []).map((org) => ({
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

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
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
         {/* <button className="hover:text-white">Green Score</button>*/}
          <button
            className="hover:text-white border border-yellow-400 rounded px-3 py-1 ml-4"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="flex flex-col items-center justify-center py-16 bg-black text-yellow-400 rounded-b-3xl shadow-lg">
        <h1 className="text-4xl font-extrabold">Welcome To Your Donor Space !</h1>
        <p className="mt-3 text-lg">Track your contributions and impact on the planet.</p>
      </header>

      {/* Donations Section */}
      <section className="p-8">
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6">Your Donations</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Unclaimed */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">
                Unclaimed Donations
              </h3>
              {unclaimed.length === 0 ? (
                <p className="text-gray-400 mb-4">No unclaimed donations.</p>
              ) : (
                <ul className="space-y-4">
                  {unclaimed.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity}{" "}
                      {d.quantity_unit})
                      <br />
                      <span className="block mt-1 font-bold text-red-400">
                        Status: Unclaimed
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Claimed */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">
                Claimed / Picked Donations
              </h3>
              {claimed.length === 0 ? (
                <p className="text-gray-400 mb-4">No claimed or picked donations.</p>
              ) : (
                <ul className="space-y-4">
                  {claimed.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity}{" "}
                      {d.quantity_unit})
                      <br />
                      <span className="block mt-1 font-semibold">
                        Claimed by: {d.organisation?.name || "Organisation"}
                      </span>
                      <span className="block mt-1 font-bold text-blue-400">
                        Status: {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Delivered */}
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300">
                Delivered Donations
              </h3>
              {delivered.length === 0 ? (
                <p className="text-gray-400">No delivered donations yet.</p>
              ) : (
                <ul className="space-y-4">
                  {delivered.map((d) => (
                    <li key={d.id} className="border p-4 rounded-lg bg-gray-700">
                      <span className="font-bold text-lg">{d.food_type}</span> ({d.quantity}{" "}
                      {d.quantity_unit})
                      <br />
                      <span className="block mt-1 font-semibold">
                        Claimed by: {d.organisation?.name || "Organisation"}
                      </span>
                      <span className="block mt-1 font-bold text-green-400">
                        Status: Delivered
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nearest NGOs */}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">Nearest NGOs</h2>
        <div className="bg-gray-900 p-4 rounded-xl shadow-lg">
          {nearestOrgs.length === 0 ? (
            <p className="text-gray-400">No nearby food NGOs found.</p>
          ) : (
            <ul className="space-y-2">
              {nearestOrgs.map((org) => (
                <li key={org.id} className="border p-2 rounded">
                  <span className="font-bold">{org.name}</span> - {org.organisation_type}
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
