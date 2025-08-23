import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../lib/AuthContext"; // To get organisation_id

export default function RecipientDashboard() {
  const { user } = useAuth(); // The logged-in user (organisation/recipient)
  const [donations, setDonations] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [picked, setPicked] = useState([]);
  const [delivered, setDelivered] = useState([]);

  // Fetch donations by status
  useEffect(() => {
    async function fetchAllDonations() {
      // Posted donations (available to claim)
      const { data: postedData, error: postedError } = await supabase
        .from("donations")
        .select("*")
        .eq("status", "posted");
      if (postedError) console.error("Posted fetch error:", postedError);
      setDonations(postedData || []);

      // Claimed by this org
      if (user?.id) {
        const { data: claimedData, error: claimedError } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "claimed")
          .eq("organisation_id", user.id);
        if (claimedError) console.error("Claimed fetch error:", claimedError);
        setClaimed(claimedData || []);

        const { data: pickedData, error: pickedError } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "picked")
          .eq("organisation_id", user.id);
        if (pickedError) console.error("Picked fetch error:", pickedError);
        setPicked(pickedData || []);

        const { data: deliveredData, error: deliveredError } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "delivered")
          .eq("organisation_id", user.id);
        if (deliveredError) console.error("Delivered fetch error:", deliveredError);
        setDelivered(deliveredData || []);
      }
    }
    fetchAllDonations();
  }, [user]);

  // Real-time sync for all status changes
  useEffect(() => {
    const channel = supabase
      .channel("donations-realtime-recipient")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        (payload) => {
          // Update lists based on status and organisation_id
          const newDonation = payload.new;
          if (newDonation.status === "posted") {
            setDonations((prev) => {
              // Add or update
              const filtered = prev.filter((d) => d.id !== newDonation.id);
              return [newDonation, ...filtered];
            });
          } else {
            setDonations((prev) => prev.filter((d) => d.id !== newDonation.id));
          }
          if (user?.id && newDonation.organisation_id === user.id) {
            if (newDonation.status === "claimed") {
              setClaimed((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [newDonation, ...filtered];
              });
              setPicked((prev) => prev.filter((d) => d.id !== newDonation.id));
              setDelivered((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else if (newDonation.status === "picked") {
              setPicked((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [newDonation, ...filtered];
              });
              setClaimed((prev) => prev.filter((d) => d.id !== newDonation.id));
              setDelivered((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else if (newDonation.status === "delivered") {
              setDelivered((prev) => {
                const filtered = prev.filter((d) => d.id !== newDonation.id);
                return [newDonation, ...filtered];
              });
              setClaimed((prev) => prev.filter((d) => d.id !== newDonation.id));
              setPicked((prev) => prev.filter((d) => d.id !== newDonation.id));
            } else {
              // Remove from all if not matched
              setClaimed((prev) => prev.filter((d) => d.id !== newDonation.id));
              setPicked((prev) => prev.filter((d) => d.id !== newDonation.id));
              setDelivered((prev) => prev.filter((d) => d.id !== newDonation.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Claim a donation
  async function handleClaim(donationId) {
    if (!user?.id) return;
    const { error } = await supabase
      .from("donations")
      .update({ status: "claimed", organisation_id: user.id })
      .eq("id", donationId);
    if (error) alert("Error claiming donation: " + error.message);
  }

  // Mark as picked up
  async function handlePicked(donationId) {
    const { error } = await supabase
      .from("donations")
      .update({ status: "picked" })
      .eq("id", donationId);
    if (error) alert("Error picking donation: " + error.message);
  }

  // Mark as delivered
  async function handleDelivered(donationId) {
    const { error } = await supabase
      .from("donations")
      .update({ status: "delivered" })
      .eq("id", donationId);
    if (error) alert("Error delivering donation: " + error.message);
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nearby Donations</h2>
      {donations.length === 0 ? (
        <p className="text-gray-500">No active donations right now.</p>
      ) : (
        <ul className="space-y-4">
          {donations.map((d) => (
            <li key={d.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>
                Expires:{" "}
                {new Date(d.expiry).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p>Status: {d.status}</p>
              <button
                onClick={() => handleClaim(d.id)}
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Claim
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Claimed Donations */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Claimed Donations</h2>
      {claimed.length === 0 ? (
        <p className="text-gray-500">No claimed donations yet.</p>
      ) : (
        <ul className="space-y-4">
          {claimed.map((d) => (
            <li key={d.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>
                Expires:{" "}
                {new Date(d.expiry).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p>Status: {d.status}</p>
              <button
                onClick={() => handlePicked(d.id)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Picked Up
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Picked Donations */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Picked Up Donations</h2>
      {picked.length === 0 ? (
        <p className="text-gray-500">No picked up donations yet.</p>
      ) : (
        <ul className="space-y-4">
          {picked.map((d) => (
            <li key={d.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>
                Expires:{" "}
                {new Date(d.expiry).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p>Status: {d.status}</p>
              <button
                onClick={() => handleDelivered(d.id)}
                className="mt-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Delivered
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Delivered Donations */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Delivered Donations</h2>
      {delivered.length === 0 ? (
        <p className="text-gray-500">No delivered donations yet.</p>
      ) : (
        <ul className="space-y-4">
          {delivered.map((d) => (
            <li key={d.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>
                Expires:{" "}
                {new Date(d.expiry).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p>Status: {d.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}