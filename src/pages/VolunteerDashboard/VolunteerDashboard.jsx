import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../lib/AuthContext";

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [acceptedDeliveries, setAcceptedDeliveries] = useState([]);
  const [pickedUpDeliveries, setPickedUpDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [confirmedDeliveries, setConfirmedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to batch-hydrate donor/recipient for an array of donations
  async function hydrateUsers(donations) {
    const ids = new Set();
    donations.forEach((d) => {
      if (d?.donor_id) ids.add(d.donor_id);
      if (d?.organisation_id) ids.add(d.organisation_id);
    });
    const userIds = Array.from(ids);
    if (userIds.length === 0) return donations;

    const { data: usersList, error } = await supabase
      .from("users")
      .select("id,name,address,latitude,longitude")
      .in("id", userIds);

    if (error || !usersList) return donations;

    const map = new Map(usersList.map((u) => [u.id, u]));
    return donations.map((d) => ({
      ...d,
      donor: map.get(d.donor_id) || null,
      recipient: map.get(d.organisation_id) || null,
    }));
  }

  // Initial fetch
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      setLoading(true);

      // Available for volunteers: claimed + volunteer_needed + no volunteer yet
      const { data: avail, error: e1 } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "claimed")
        .eq("volunteer_needed", true)
        .is("volunteer_id", null);

      const { data: acc, error: e2 } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "accepted")
        .eq("volunteer_id", user.id);

      const { data: pk, error: e3 } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "picked")
        .eq("volunteer_id", user.id);

      const { data: done, error: e4 } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "delivered")
        .eq("volunteer_id", user.id);

      const { data: conf, error: e5 } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "confirmed")
        .eq("volunteer_id", user.id);

      // Hydrate donor/recipient in one go for each list
      const [hAvail, hAcc, hPk, hDone, hConf] = await Promise.all([
        hydrateUsers(avail || []),
        hydrateUsers(acc || []),
        hydrateUsers(pk || []),
        hydrateUsers(done || []),
        hydrateUsers(conf || []),
      ]);

      if (!e1) setAvailableDeliveries(hAvail);
      if (!e2) setAcceptedDeliveries(hAcc);
      if (!e3) setPickedUpDeliveries(hPk);
      if (!e4) setCompletedDeliveries(hDone);
      if (!e5) setConfirmedDeliveries(hConf);

      setLoading(false);
    })();
  }, [user?.id]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel("donations-volunteer")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donations",
          filter: "", // receive all and filter in handler
        },
        async (payload) => {
          const row = payload.new ?? payload.old;
          if (!row) return;

          // join donor/org for the changed row to keep UI hydrated
          const { data: donor } = row.donor_id
            ? await supabase
                .from("users")
                .select("name,address,latitude,longitude")
                .eq("id", row.donor_id)
                .single()
            : { data: null };
          const { data: recipient } = row.organisation_id
            ? await supabase
                .from("users")
                .select("name,address,latitude,longitude")
                .eq("id", row.organisation_id)
                .single()
            : { data: null };

          const d = { ...(payload.new || row), donor, recipient };

          // helpers
          const upsert = (arr, item) => {
            const idx = arr.findIndex((x) => x.id === item.id);
            if (idx === -1) return [item, ...arr];
            const copy = [...arr];
            copy[idx] = item;
            return copy;
          };
          const remove = (arr, id) => arr.filter((x) => x.id !== id);

          // Availability for volunteer list
          if (d.status === "claimed" && d.volunteer_needed === true && !d.volunteer_id) {
            setAvailableDeliveries((prev) => upsert(prev, d));
          } else {
            setAvailableDeliveries((prev) => remove(prev, d.id));
          }

          // My lists (volunteer perspective)
          const mine = d.volunteer_id === user.id;

          if (!mine) {
            setAcceptedDeliveries((p) => remove(p, d.id));
            setPickedUpDeliveries((p) => remove(p, d.id));
            setCompletedDeliveries((p) => remove(p, d.id));
            setConfirmedDeliveries((p) => remove(p, d.id));
            return;
          }

          if (d.status === "accepted") {
            setAcceptedDeliveries((p) => upsert(p, d));
            setPickedUpDeliveries((p) => remove(p, d.id));
            setCompletedDeliveries((p) => remove(p, d.id));
            setConfirmedDeliveries((p) => remove(p, d.id));
          } else if (d.status === "picked") {
            setPickedUpDeliveries((p) => upsert(p, d));
            setAcceptedDeliveries((p) => remove(p, d.id));
            setCompletedDeliveries((p) => remove(p, d.id));
            setConfirmedDeliveries((p) => remove(p, d.id));
          } else if (d.status === "delivered") {
            setCompletedDeliveries((p) => upsert(p, d));
            setAcceptedDeliveries((p) => remove(p, d.id));
            setPickedUpDeliveries((p) => remove(p, d.id));
            setConfirmedDeliveries((p) => remove(p, d.id));
          } else if (d.status === "confirmed") {
            setConfirmedDeliveries((p) => upsert(p, d));
            setAcceptedDeliveries((p) => remove(p, d.id));
            setPickedUpDeliveries((p) => remove(p, d.id));
            setCompletedDeliveries((p) => remove(p, d.id));
          } else {
            // any other status: remove from my lists
            setAcceptedDeliveries((p) => remove(p, d.id));
            setPickedUpDeliveries((p) => remove(p, d.id));
            setCompletedDeliveries((p) => remove(p, d.id));
            setConfirmedDeliveries((p) => remove(p, d.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  // Actions via RPC
  async function handleAccept(id) {
  const { data, error } = await supabase.rpc("volunteer_accept", { _donation_id: id });
  if (error) {
    alert(error.message || "Accept failed");
  } else if (!data || data.length === 0) {
    alert("This delivery could not be accepted. It may have already been accepted or does not meet criteria.");
  } else {
    // Optimistically update UI
    setAvailableDeliveries((prev) => prev.filter(x => x.id !== id));
    setAcceptedDeliveries((prev) => [data[0], ...prev]);
  }
}

  async function handlePickup(id) {
  const { data, error } = await supabase.rpc("mark_picked", { _donation_id: id });
  if (error) {
    alert(error.message || "Pickup failed");
  } else if (!data || data.length === 0) {
    alert("Could not mark as picked up. It may have already been picked.");
  } else {
    // Optimistically update UI
    setAcceptedDeliveries((prev) => prev.filter(x => x.id !== id));
    setPickedUpDeliveries((prev) => [data[0], ...prev]);
  }
}

  async function handleDelivered(id) {
  const { data, error } = await supabase.rpc("mark_delivered", { _donation_id: id });
  if (error) {
    alert(error.message || "Delivery failed");
  } else if (!data || data.length === 0) {
    alert("Could not mark as delivered. It may have already been delivered.");
  } else {
    // Optimistically update UI
    setPickedUpDeliveries((prev) => prev.filter(x => x.id !== id));
    setCompletedDeliveries((prev) => [data[0], ...prev]);
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-yellow-400">
      {/* Navbar 
      <nav className="flex justify-between items-center p-6 border-b border-yellow-400/30 backdrop-blur-sm bg-black/50">
        <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          ShareBite
        </div>
        <div className="space-x-8 text-lg">
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Dashboard
          </button>
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Profile
          </button>
          <button className="hover:text-white transition-colors duration-300 hover:scale-105 transform">
            Settings
          </button>
        </div>
      </nav>*/}

      {/* Hero */}
      <header className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
            Volunteer Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Making a difference, one delivery at a time. Connect food donors with those in need.
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Live tracking</span>
            </div>
          </div>
        </div>
      </header>

      {/* Available Deliveries */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Available Deliveries
              </h2>
              <div className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
                {availableDeliveries.length} opportunities
              </div>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading…</p>
            ) : availableDeliveries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
                <p className="text-xl text-gray-400 mb-2">No deliveries available right now</p>
                <p className="text-gray-500">Check back soon for new opportunities!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableDeliveries.map((d) => (
                  <div key={d.id} className="group bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:border-yellow-400/50 transition-all duration-300 hover:shadow-lg hover:scale-105 transform">
                    <div className="mb-4">
                      <h3 className="font-bold text-2xl text-yellow-300 mb-2">{d.food_type}</h3>
                      <div className="flex items-center space-x-2 text-gray-300 mb-2">
                        <span className="text-lg font-semibold">{d.quantity}</span>
                        <span className="text-sm bg-gray-700 px-2 py-1 rounded">{d.quantity_unit}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-gray-300">
                          Expires: {new Date(d.expiry).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-gray-300">From: {d.donor?.name || "Loading..."}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-gray-300">To: {d.recipient?.name || "Loading..."}</span>
                      </div>

                      <div className="text-xs text-gray-400 mt-2">
                        📍 Donor: {d.donor?.address || "Loading..."}
                      </div>
                      <div className="text-xs text-gray-400">
                        📍 Recipient: {d.recipient?.address || "Loading..."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-block px-3 py-1 bg-orange-600/20 border border-orange-600 text-orange-300 text-xs rounded-full font-medium">
                        Volunteer Requested
                      </span>
                    </div>

                    <button
                      onClick={() => handleAccept(d.id)}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 px-6 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Accept Delivery
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* My Delivery Pipeline */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              My Delivery Pipeline
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Accepted */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300">Accepted</h3>
                  <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded-full">
                    {acceptedDeliveries.length}
                  </span>
                </div>
                {acceptedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"></div>
                    <p className="text-gray-400">No accepted deliveries</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {acceptedDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-3 space-y-1">
                          <div>⏰ Expires: {new Date(d.expiry).toLocaleDateString()}</div>
                          <div>📦 From: {d.donor?.name || "Loading..."}</div>
                          <div>🏠 To: {d.recipient?.name || "Loading..."}</div>
                        </div>
                        <button
                          onClick={() => handlePickup(d.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 text-sm font-medium"
                        >
                          Mark as Picked Up
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In Transit */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300">In Transit</h3>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    {pickedUpDeliveries.length}
                  </span>
                </div>
                {pickedUpDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"></div>
                    <p className="text-gray-400">No deliveries in transit</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {pickedUpDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-3 space-y-1">
                          <div> Expires: {new Date(d.expiry).toLocaleDateString()}</div>
                          <div> From: {d.donor?.name || "Loading..."}</div>
                          <div> To: {d.recipient?.name || "Loading..."}</div>
                        </div>
                        <button
                          onClick={() => handleDelivered(d.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 text-sm font-medium"
                        >
                          Mark as Delivered
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivered (awaiting recipient confirm) */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300"> Delivered</h3>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                    {completedDeliveries.length}
                  </span>
                </div>
                {completedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"></div>
                    <p className="text-gray-400">No delivered items awaiting confirmation</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {completedDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-2 space-y-1">
                          <div> Delivered: {new Date(d.updated_at || d.created_at).toLocaleDateString()}</div>
                          <div> {d.donor?.name || "Unknown"} → {d.recipient?.name || "Unknown"}</div>
                        </div>
                        <div className="text-xs bg-green-600/20 border border-green-600 text-green-300 px-2 py-1 rounded text-center font-medium">
                          Awaiting Recipient Confirmation
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmed */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-yellow-300"> Confirmed</h3>
                  <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                    {confirmedDeliveries.length}
                  </span>
                </div>
                {confirmedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"></div>
                    <p className="text-gray-400">No confirmed records yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {confirmedDeliveries.map((d) => (
                      <div key={d.id} className="border border-gray-600 p-4 rounded-lg bg-gray-700/50">
                        <div className="font-bold text-lg text-yellow-300 mb-2">{d.food_type}</div>
                        <div className="text-sm text-gray-300 mb-2">
                          {d.quantity} {d.quantity_unit}
                        </div>
                        <div className="text-xs text-gray-400 mb-2 space-y-1">
                          <div> Confirmed: {new Date(d.updated_at || d.created_at).toLocaleDateString()}</div>
                          <div> {d.donor?.name || "Unknown"} → {d.recipient?.name || "Unknown"}</div>
                        </div>
                        <div className="text-xs bg-emerald-600/20 border border-emerald-600 text-emerald-300 px-2 py-1 rounded text-center font-medium">
                          Recipient Confirmed
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Action */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-black px-12 py-4 text-xl rounded-full font-extrabold shadow-2xl hover:from-yellow-500 hover:via-orange-600 hover:to-yellow-500 transition-all duration-300 transform hover:scale-110 hover:shadow-3xl"
          >
             Refresh Deliveries
          </button>
          <p className="text-gray-400 text-sm mt-4">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </section>
    </div>
  );
}
