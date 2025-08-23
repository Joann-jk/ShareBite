import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // Adjust path as needed

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
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

export default function NearestOrganisationsList({ latitude, longitude, maxResults = 5 }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganisations() {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, organisation_type, acceptance_type, address, latitude, longitude, email, phone")
        .eq("role", "recipient")
        .not("organisation_type", "is", null)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) {
        setOrgs([]);
        setLoading(false);
        return;
      }

      // Calculate distance to each organisation
      const withDistance = data.map((org) => ({
        ...org,
        distance: getDistanceFromLatLonInKm(
          latitude,
          longitude,
          org.latitude,
          org.longitude
        ),
      }));

      // Sort by distance
      withDistance.sort((a, b) => a.distance - b.distance);

      setOrgs(withDistance.slice(0, maxResults)); // Top N nearest
      setLoading(false);
    }

    if (latitude && longitude) {
      fetchOrganisations();
    }
  }, [latitude, longitude, maxResults]);

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Nearest Organisations</h3>
      {loading && <div>Loading organisations...</div>}
      {!loading && orgs.length === 0 && <div>No organisations found nearby.</div>}
      <ul className="mb-6">
        {orgs.map((org) => (
          <li key={org.id} className="mb-4 p-3 border rounded-lg">
            <strong>{org.name}</strong> ({org.organisation_type})<br />
            Acceptance: {org.acceptance_type}<br />
            Address: {org.address}<br />
            Distance: <span className="font-bold">{org.distance.toFixed(2)} km</span>
          </li>
        ))}
      </ul>
    </div>
  );
}