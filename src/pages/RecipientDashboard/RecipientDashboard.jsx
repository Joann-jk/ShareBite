import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../lib/AuthContext";

// Haversine distance in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

export default function RecipientDashboard() {
  const { userDetail: user, logout } = useAuth();
  // ^^^ Make sure your AuthContext provides a logout method!
  const [donationsStatus, setDonationsStatus] = useState({
    posted: [],
    diverted: [],
    claimed: [],
    picked: [],
    delivered: [],
  });

  // Lists by status
  const [posted, setPosted] = useState([]);
  const [diverted, setDiverted] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [picked, setPicked] = useState([]);
  const [delivered, setDelivered] = useState([]);

  // UI state
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [pickingId, setPickingId] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const orgLat = user?.latitude ?? null;
  const orgLng = user?.longitude ?? null;
  const orgId = user?.id ?? null;
  const acceptanceType = user?.acceptance_type ?? "edible"; // 'edible' | 'non-edible' | 'both'

  const canNonEdible = acceptanceType === "non-edible" || acceptanceType === "both";
  const canEdible = acceptanceType === "edible" || acceptanceType === "both";

  // Fetch initial data
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setInitialLoading(true);
      setErrorMsg("");

      // Build posted query based on acceptance_type
      // - edible orgs: posted + acceptance='edible'
      // - non-edible orgs: posted + acceptance='non-edible'
      // - both: posted + acceptance in both types
      let postedQuery = supabase.from("donations").select("*").eq("status", "posted");

      if (canEdible && !canNonEdible) {
        postedQuery = postedQuery.eq("acceptance", "edible");
      } else if (!canEdible && canNonEdible) {
        postedQuery = postedQuery.eq("acceptance", "non-edible");
      } else if (canEdible && canNonEdible) {
        postedQuery = postedQuery.in("acceptance", ["edible", "non-edible"]);
      } else {
        postedQuery = postedQuery.eq("acceptance", "edible");
      }

      const postedPromise = postedQuery;

      // Diverted only for non-edible/both orgs
      const divertedPromise = canNonEdible
        ? supabase.from("donations").select("*").eq("status", "diverted")
        : Promise.resolve({ data: [], error: null });

      // Org-owned lists
      const claimedPromise = orgId
        ? supabase.from("donations").select("*").eq("status", "claimed").eq("organisation_id", orgId)
        : Promise.resolve({ data: [], error: null });

      const pickedPromise = orgId
        ? supabase.from("donations").select("*").eq("status", "picked").eq("organisation_id", orgId)
        : Promise.resolve({ data: [], error: null });

      const deliveredPromise = orgId
        ? supabase
            .from("donations")
            .select("*")
            .eq("status", "delivered")
            .eq("organisation_id", orgId)
        : Promise.resolve({ data: [], error: null });

      const [
        { data: postedData, error: postedErr },
        { data: divertedData, error: divertedErr },
        { data: claimedData, error: claimedErr },
        { data: pickedData, error: pickedErr },
        { data: deliveredData, error: deliveredErr },
      ] = await Promise.all([postedPromise, divertedPromise, claimedPromise, pickedPromise, deliveredPromise]);

      if (cancelled) return;

      if (postedErr) setErrorMsg((e) => e || postedErr.message);
      if (divertedErr) setErrorMsg((e) => e || divertedErr.message);
      if (claimedErr) setErrorMsg((e) => e || claimedErr.message);
      if (pickedErr) setErrorMsg((e) => e || pickedErr.message);
      if (deliveredErr) setErrorMsg((e) => e || deliveredErr.message);

      setPosted(postedData || []);
      setDiverted(divertedData || []);
      setClaimed(claimedData || []);
      setPicked(pickedData || []);
      setDelivered(deliveredData || []);
      setInitialLoading(false);
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [orgId, acceptanceType]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("donations-realtime-recipient")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          if (payload.eventType === "DELETE") {
            const id = oldRow?.id;
            if (!id) return;
            setPosted((prev) => prev.filter((d) => d.id !== id));
            setDiverted((prev) => prev.filter((d) => d.id !== id));
            setClaimed((prev) => prev.filter((d) => d.id !== id));
            setPicked((prev) => prev.filter((d) => d.id !== id));
            setDelivered((prev) => prev.filter((d) => d.id !== id));
            return;
          }

          const d = newRow;
          const isMine = orgId && d?.organisation_id === orgId;

          // Should this row appear in posted for this org?
          const matchesPostedForOrg =
            d?.status === "posted" &&
            ((canEdible && !canNonEdible && d?.acceptance === "edible") ||
              (!canEdible && canNonEdible && d?.acceptance === "non-edible") ||
              (canEdible && canNonEdible && (d?.acceptance === "edible" || d?.acceptance === "non-edible")));

          if (matchesPostedForOrg) {
            setPosted((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
          } else {
            setPosted((prev) => prev.filter((x) => x.id !== d.id));
          }

          // Diverted list only for non-edible/both orgs
          if (canNonEdible && d?.status === "diverted") {
            setDiverted((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
          } else {
            setDiverted((prev) => prev.filter((x) => x.id !== d.id));
          }

          // If not mine, ensure it's not in my org-owned lists
          if (!isMine) {
            setClaimed((prev) => prev.filter((x) => x.id !== d.id));
            setPicked((prev) => prev.filter((x) => x.id !== d.id));
            setDelivered((prev) => prev.filter((x) => x.id !== d.id));
            return;
          }

          // If mine, place in correct list
          if (d.status === "claimed") {
            setClaimed((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
            setPicked((prev) => prev.filter((x) => x.id !== d.id));
            setDelivered((prev) => prev.filter((x) => x.id !== d.id));
          } else if (d.status === "picked") {
            setPicked((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
            setClaimed((prev) => prev.filter((x) => x.id !== d.id));
            setDelivered((prev) => prev.filter((x) => x.id !== d.id));
          } else if (d.status === "delivered") {
            setDelivered((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
            setClaimed((prev) => prev.filter((x) => x.id !== d.id));
            setPicked((prev) => prev.filter((x) => x.id !== d.id));
          } else {
            // Any other status: remove from my org lists
            setClaimed((prev) => prev.filter((x) => x.id !== d.id));
            setPicked((prev) => prev.filter((x) => x.id !== d.id));
            setDelivered((prev) => prev.filter((x) => x.id !== d.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, canEdible, canNonEdible]);

  // Mutations

  // Claim posted (filtered by acceptance) or diverted (if visible through separate section)
  async function handleClaim(donationId) {
    if (!orgId) return;
    setErrorMsg("");
    setClaimingId(donationId);
    try {
      const { data, error } = await supabase
        .from("donations")
        .update({ status: "claimed", organisation_id: orgId })
        .eq("id", donationId)
        .in("status", ["posted", "diverted"])
        .is("organisation_id", null)
        .select("*")
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message || "Failed to claim the donation");
        return;
      }
      if (!data) {
        setErrorMsg("This donation was just claimed by another organisation.");
      }
    } finally {
      setClaimingId(null);
    }
  }

  async function handlePicked(donationId) {
    if (!orgId) return;
    setErrorMsg("");
    setPickingId(donationId);
    try {
      const { error } = await supabase
        .from("donations")
        .update({ status: "picked" })
        .eq("id", donationId)
        .eq("organisation_id", orgId);
      if (error) setErrorMsg(error.message || "Failed to mark as picked up");
    } finally {
      setPickingId(null);
    }
  }

  async function handleDelivered(donationId) {
    if (!orgId) return;
    setErrorMsg("");
    setDeliveringId(donationId);
    try {
      const { error } = await supabase
        .from("donations")
        .update({ status: "delivered" })
        .eq("id", donationId)
        .eq("organisation_id", orgId);
      if (error) setErrorMsg(error.message || "Failed to mark as delivered");
    } finally {
      setDeliveringId(null);
    }
  }

  // Map modal
  const renderMapModal = useMemo(() => {
    if (!selectedDonation) return null;

    const { latitude, longitude, expiry, food_type, quantity, quantity_unit, status } = selectedDonation;

    let distance =
      orgLat && orgLng && latitude != null && longitude != null
        ? getDistanceFromLatLonInKm(orgLat, orgLng, latitude, longitude).toFixed(2)
        : null;

    const googleMapUrl =
      orgLat && orgLng && latitude != null && longitude != null
        ? `https://www.google.com/maps/dir/?api=1&origin=${orgLat},${orgLng}&destination=${latitude},${longitude}&travelmode=driving`
        : null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => setSelectedDonation(null)}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-2">{food_type}</h2>
          <p>
            <b>Quantity:</b> {quantity} {quantity_unit}
          </p>
          <p>
            <b>Status:</b> {status}
          </p>
          <p>
            <b>Expiry:</b>{" "}
            {expiry
              ? new Date(expiry).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "N/A"}
          </p>
          {googleMapUrl && (
            <a
              href={googleMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block my-4 text-blue-700 underline"
            >
              Open in Google Maps
            </a>
          )}
          {latitude != null && longitude != null && (
            <iframe
              title="Google Map"
              width="100%"
              height="200"
              style={{ border: 0, borderRadius: "1em" }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
            />
          )}
          <button
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            onClick={() => setSelectedDonation(null)}
          >
            Close
          </button>
        </div>
      </div>
    );
  }, [selectedDonation, orgLat, orgLng]);

  // UI helpers
  function formatExpiry(ts) {
    if (!ts) return "N/A";
    try {
      return new Date(ts).toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(ts);
    }
  }

  // Logout Handler
  const handleLogout = async () => {
    if (logout) {
      await logout();
      // Optionally, redirect to login page here if you use react-router
      // window.location.href = "/login";
    } else {
      await supabase.auth.signOut();
      // window.location.href = "/login";
    }
  };

  return (
    <div className="p-6">
      {/* Logout Button */}
      <div className="flex justify-end mb-4">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2">Nearby Donations</h1>
      <p className="text-sm text-gray-600 mb-4">
        View only the donations your organisation accepts. Non-edible organisations also see diverted items.
      </p>

      {errorMsg && (
        <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Posted (filtered by org acceptance) */}
      <h2 className="text-xl font-semibold mb-3">Posted</h2>
      {initialLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : posted.length === 0 ? (
        <p className="text-gray-500">No active donations right now.</p>
      ) : (
        <ul className="space-y-4">
          {posted.map((d) => (
            <li
              key={d.id}
              className="p-4 border rounded-lg shadow-md bg-white cursor-pointer"
              onClick={() => setSelectedDonation(d)}
            >
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>Expires: {formatExpiry(d.expiry)}</p>
              <p>Type: {d.acceptance}</p>
              <p>Status: {d.status}</p>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleClaim(d.id);
                }}
                disabled={!orgId || claimingId === d.id}
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {claimingId === d.id ? "Claiming…" : "Claim"}
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {/* Diverted (visible for non-edible/both orgs) 
      {canNonEdible && (
        <>
          <h2 className="text-xl font-semibold mt-8 mb-3">Diverted (Non-edible)</h2>
          {diverted.length === 0 ? (
            <p className="text-gray-500">No diverted donations available.</p>
          ) : (
            <ul className="space-y-4">
              {diverted.map((d) => (
                <li
                  key={d.id}
                  className="p-4 border rounded-lg shadow-md bg-white cursor-pointer"
                  onClick={() => setSelectedDonation(d)}
                >
                  <h3 className="font-semibold text-lg">{d.food_type}</h3>
                  <p>Quantity: {d.quantity} {d.quantity_unit}</p>
                  <p>Originally edible, now diverted to non-edible queue</p>
                  <p>Type: {d.acceptance}</p>
                  <p>Status: {d.status}</p>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleClaim(d.id); // same handler supports diverted
                    }}
                    disabled={!orgId || claimingId === d.id}
                    className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {claimingId === d.id ? "Claiming…" : "Claim"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
*/}
      {/* Claimed Donations */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Claimed Donations</h2>
      {claimed.length === 0 ? (
        <p className="text-gray-500">No claimed donations yet.</p>
      ) : (
        <ul className="space-y-4">
          {claimed.map((d) => (
            <li
              key={d.id}
              className="p-4 border rounded-lg shadow-md bg-white cursor-pointer"
              onClick={() => setSelectedDonation(d)}
            >
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>Expires: {formatExpiry(d.expiry)}</p>
              <p>Status: {d.status}</p>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handlePicked(d.id);
                }}
                disabled={pickingId === d.id}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {pickingId === d.id ? "Updating…" : "Picked Up"}
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
            <li
              key={d.id}
              className="p-4 border rounded-lg shadow-md bg-white cursor-pointer"
              onClick={() => setSelectedDonation(d)}
            >
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>Expires: {formatExpiry(d.expiry)}</p>
              <p>Status: {d.status}</p>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleDelivered(d.id);
                }}
                disabled={deliveringId === d.id}
                className="mt-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {deliveringId === d.id ? "Updating…" : "Delivered"}
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
            <li
              key={d.id}
              className="p-4 border rounded-lg shadow-md bg-white cursor-pointer"
              onClick={() => setSelectedDonation(d)}
            >
              <h3 className="font-semibold text-lg">{d.food_type}</h3>
              <p>Quantity: {d.quantity} {d.quantity_unit}</p>
              <p>Expires: {formatExpiry(d.expiry)}</p>
              <p>Status: {d.status}</p>
            </li>
          ))}
        </ul>
      )}

      {renderMapModal}
    </div>
  );
}