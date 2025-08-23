import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // adjust path as needed
import { useAuth } from "../../lib/AuthContext"; // donor context
import NearestOrganisationsList from "../../components/NearestNgo";

export default function DonationForm() {
  const { user } = useAuth(); // donor
  const [formData, setFormData] = useState({
    food_type: "",
    quantity: "",
    quantity_unit: "",
    expiry: "",
    custom_expiry: "",
    latitude: null,
    longitude: null,
    acceptance: "edible", // default value
  });

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Arbitrary far-future expiry used for non-edible posts to satisfy NOT NULL without affecting logic
  const NON_EDIBLE_FAKE_EXPIRY = "2099-12-31T23:59:59.000Z";

  useEffect(() => {
    setLoadingLoc(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
          setLoadingLoc(false);
        },
        () => {
          setError("Location access denied. Please enter manually.");
          setLoadingLoc(false);
        }
      );
    } else {
      setError("Geolocation not supported.");
      setLoadingLoc(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If user switches to non-edible, clear expiry fields so we don't submit stale values
    if (name === "acceptance" && value === "non-edible") {
      setFormData((prev) => ({
        ...prev,
        acceptance: value,
        expiry: "",
        custom_expiry: "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Only used for edible acceptance
  function getExpiryTimestamp() {
    const now = new Date();
    let expiryString = formData.expiry === "custom" ? formData.custom_expiry : formData.expiry;
    if (!expiryString) return null;
    const lower = String(expiryString).toLowerCase().trim();

    // accept ISO date-time too
    if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/.test(lower)) {
      const dt = new Date(lower);
      return isNaN(dt.getTime()) ? null : dt.toISOString();
    }

    // "X hour(s)" or "X day(s)"
    const num = parseInt(lower.match(/\d+/)?.[0] || "0", 10);
    if (!num) return null;

    if (lower.includes("hour")) {
      return new Date(now.getTime() + num * 60 * 60 * 1000).toISOString();
    }
    if (lower.includes("day")) {
      return new Date(now.getTime() + num * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  }

  const quantityUnits = [
    { label: "Kilogram (kg)", value: "kg" },
    { label: "Gram (g)", value: "g" }, // convert to kg
    { label: "Litre", value: "liters" },
    { label: "Packet", value: "packs" },
    { label: "Plate", value: "plates" },
    { label: "Item", value: "items" },
  ];

  const acceptanceOptions = [
    { label: "Edible", value: "edible" },
    { label: "Non-edible", value: "non-edible" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Not logged in.");
      return;
    }

    let quantity = formData.quantity;
    let unit = formData.quantity_unit;
    if (unit === "g") {
      quantity = (Number(quantity) / 1000).toFixed(3);
      unit = "kg";
    }

    if (formData.latitude == null || formData.longitude == null) {
      setError("Location not set. Please allow location access or enter manually.");
      return;
    }

    // Choose expiry path based on acceptance
    let expiryTimestamp = null;

    if (formData.acceptance === "edible") {
      expiryTimestamp = getExpiryTimestamp();
      if (!expiryTimestamp) {
        setError("Invalid expiry time.");
        return;
      }
    } else {
      // Non-edible: hide expiry input in UI and supply an arbitrary far-future value
      expiryTimestamp = NON_EDIBLE_FAKE_EXPIRY;
    }

    const donation = {
      donor_id: user.id,
      food_type: formData.food_type,
      quantity: quantity,
      quantity_unit: unit,
      expiry: expiryTimestamp,
      latitude: formData.latitude,
      longitude: formData.longitude,
      acceptance: formData.acceptance, // 'edible' | 'non-edible'
      // status defaults to 'posted'; organisation_id null
    };

    const { error: dbError } = await supabase.from("donations").insert([donation]);
    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess("Donation submitted! 🎉");
      setFormData((prev) => ({
        food_type: "",
        quantity: "",
        quantity_unit: "",
        expiry: "",
        custom_expiry: "",
        latitude: prev.latitude,
        longitude: prev.longitude,
        acceptance: "edible",
      }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w/full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Donate Food</h2>

        {error && <p className="text-red-600 text-center">{error}</p>}
        {success && <p className="text-green-600 text-center">{success}</p>}

        {/* Food Type */}
        <div>
          <label className="block mb-2 text-sm font-medium">Food Type</label>
          <input
            type="text"
            name="food_type"
            value={formData.food_type}
            onChange={handleChange}
            placeholder="e.g. Rice, Bread"
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block mb-2 text-sm font-medium">Quantity</label>
          <input
            type="number"
            name="quantity"
            min="0"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="Enter quantity"
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* Quantity Unit */}
        <div>
          <label className="block mb-2 text-sm font-medium">Quantity Unit</label>
          <select
            name="quantity_unit"
            value={formData.quantity_unit}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="">Select unit</option>
            {quantityUnits.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Acceptance */}
        <div>
          <label className="block mb-2 text-sm font-medium">Food Acceptance Type</label>
          <select
            name="acceptance"
            value={formData.acceptance}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
            required
          >
            {acceptanceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry (only for edible) */}
        {formData.acceptance === "edible" && (
          <div>
            <label className="block mb-2 text-sm font-medium">Expiry</label>
            <select
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Select expiry time</option>
              <option value="1 hour">1 Hour</option>
              <option value="2 hours">2 Hours</option>
              <option value="3 hours">3 Hours</option>
              <option value="1 day">1 Day</option>
              <option value="custom">Custom</option>
            </select>

            {formData.expiry === "custom" && (
              <input
                type="text"
                name="custom_expiry"
                value={formData.custom_expiry}
                onChange={handleChange}
                placeholder="e.g., 5 hours, 1 day, or 2025-08-23T22:00"
                className="w-full mt-2 p-2 border rounded-lg"
                required
              />
            )}
          </div>
        )}

        {/* Latitude / Longitude (readonly, auto-filled) */}
        <div className="flex gap-2">
          <input
            type="number"
            name="latitude"
            value={formData.latitude ?? ""}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded-lg"
            placeholder="Latitude"
            readOnly
          />
          <input
            type="number"
            name="longitude"
            value={formData.longitude ?? ""}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded-lg"
            placeholder="Longitude"
            readOnly
          />
        </div>
        {loadingLoc && <div className="text-sm text-gray-500">Getting location...</div>}

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          Submit Donation
        </button>
      </form>

      <NearestOrganisationsList latitude={formData.latitude} longitude={formData.longitude} />
    </div>
  );
}
