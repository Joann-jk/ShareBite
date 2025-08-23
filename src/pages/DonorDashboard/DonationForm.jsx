import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; // adjust path as needed
import { useAuth } from "../../lib/AuthContext";// get donor_id from logged in user
import NearestOrganisationsList from "../../components/NearestNgo";

export default function DonationForm() {
  const { user } = useAuth(); // get logged in user (donor)
  const [formData, setFormData] = useState({
    food_type: "",
    quantity: "",
    quantity_unit: "",
    expiry: "",
    custom_expiry: "",
    latitude: null,
    longitude: null,
  });

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get current location on mount
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Convert expiry string to timestamp
  function getExpiryTimestamp() {
    const now = new Date();
    let expiryString = formData.expiry === "custom" ? formData.custom_expiry : formData.expiry;

    if (!expiryString) return null;
    expiryString = expiryString.toLowerCase();

    // Examples: "1 hour", "2 hours", "3 hours", "5 hours", "1 day"
    if (expiryString.includes("hour")) {
      const hours = parseInt(expiryString.match(/\d+/)?.[0] || "0", 10);
      return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    }
    if (expiryString.includes("day")) {
      const days = parseInt(expiryString.match(/\d+/)?.[0] || "0", 10);
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    return null; // fallback
  }

  // Match form units to schema units
  const quantityUnits = [
    { label: "Kilogram (kg)", value: "kg" },
    { label: "Gram (g)", value: "g" }, // not in schema, convert to kg
    { label: "Litre", value: "liters" },
    { label: "Packet", value: "packs" },
    { label: "Plate", value: "plates" },
    { label: "Item", value: "items" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Convert quantity if needed
    let quantity = formData.quantity;
    let unit = formData.quantity_unit;
    if (unit === "g") {
      // grams to kg for storage
      quantity = (Number(quantity) / 1000).toFixed(3);
      unit = "kg";
    }

    // Validate location and lat/lng
    if (!formData.latitude || !formData.longitude) {
      setError("Location not set. Please allow location access or enter manually.");
      return;
    }

    const expiryTimestamp = getExpiryTimestamp();
    if (!expiryTimestamp) {
      setError("Invalid expiry time.");
      return;
    }

    // Prepare donation record
    const donation = {
      donor_id: user?.id || "YOUR_DONOR_ID", // replace with actual user id
      food_type: formData.food_type,
      quantity: quantity,
      quantity_unit: unit,
      expiry: expiryTimestamp,
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    // Insert into Supabase
    const { error: dbError } = await supabase
      .from("donations")
      .insert([donation]);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess("Donation submitted! 🎉");
      setFormData({
        food_type: "",
        quantity: "",
        quantity_unit: "",
        expiry: "",
        custom_expiry: "",
        location: "",
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6"
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

        {/* Expiry */}
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
            <option value="custom">Custom</option>
          </select>

          {formData.expiry === "custom" && (
            <input
              type="text"
              name="custom_expiry"
              value={formData.custom_expiry}
              onChange={handleChange}
              placeholder="Enter custom expiry (e.g., 5 hours, 1 day)"
              className="w-full mt-2 p-2 border rounded-lg"
              required
            />
          )}
        </div>

        {/* Latitude / Longitude (readonly, auto-filled) */}
        <div className="flex gap-2">
          <input
            type="number"
            name="latitude"
            value={formData.latitude || ""}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded-lg"
            placeholder="Latitude"
            readOnly
          />
          <input
            type="number"
            name="longitude"
            value={formData.longitude || ""}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded-lg"
            placeholder="Longitude"
            readOnly
          />
        </div>
        {loadingLoc && (
          <div className="text-sm text-gray-500">Getting location...</div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Submit Donation
        </button>
      </form>

      <NearestOrganisationsList latitude={formData.latitude} longitude={formData.longitude} />
    </div>
  );
}