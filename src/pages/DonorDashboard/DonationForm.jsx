import { useState } from "react";

export default function DonationForm() {
  const [formData, setFormData] = useState({
    food_type: "",
    quantity: "",
    quantity_unit: "",
    expiry: "",
    location: "",
    custom_expiry: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      donor_id: "YOUR_DONOR_ID", // later replace with logged-in user's id
      food_type: formData.food_type,
      quantity: formData.quantity,
      quantity_unit: formData.quantity_unit,
      expiry: formData.expiry === "custom" ? formData.custom_expiry : formData.expiry,
      location: formData.location
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Donate Food</h2>

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
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="litre">Litre</option>
            <option value="packet">Packet</option>
            <option value="plate">Plate</option>
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
            />
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block mb-2 text-sm font-medium">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Enter location"
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Submit Donation
        </button>
      </form>
    </div>
  );
}
