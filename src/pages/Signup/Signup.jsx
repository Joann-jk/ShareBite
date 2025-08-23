import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "donor",
    address: "",
    latitude: null,
    longitude: null,
    acceptance_type: "edible", // default matches schema
    organisation_type: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate()

  // 📍 Get current location if recipient
  useEffect(() => {
    if (formData.role === "recipient" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
        },
        () => {
          console.warn("Location access denied, fallback to address input");
        }
      );
    }
  }, [formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1️⃣ Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;

    // 2️⃣ Insert into users table
    const { error: dbError } = await supabase.from("users").insert([
      {
        id: userId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        acceptance_type:
          formData.role === "recipient" ? formData.acceptance_type : null,
        organisation_type:
          formData.role === "recipient" && formData.organisation_type !== ""
            ? formData.organisation_type
            : null,
      },
    ]);

    if (dbError) {
      setError(dbError.message);
    } else {
      alert("Signup successful  Please verify your email.");
      navigate('/redirect')
    }

    setLoading(false);
  };

  // 🎯 Organisation options mapped to DB schema values
  const getOrgOptions = () => {
    if (formData.acceptance_type === "edible") {
      return [
        { label: "NGO", value: "ngo" },
        { label: "Food Bank", value: "food_bank" },
        { label: "Orphanage", value: "orphanage" },
        { label: "Others", value: "others" },
      ];
    } else if (formData.acceptance_type === "non-edible") {
      return [
        { label: "Bio-gas", value: "biogas" },
        { label: "Farmers", value: "farmers" },
        { label: "Others", value: "others" },
      ];
    } else {
      return [
        { label: "NGO", value: "ngo" },
        { label: "Food Bank", value: "food_bank" },
        { label: "Orphanage", value: "orphanage" },
        { label: "Bio-gas", value: "biogas" },
        { label: "Farmers", value: "farmers" },
        { label: "Others", value: "others" },
      ];
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400 ">
      <div className="w-full max-w-lg bg-black p-8 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-yellow-400 mb-6">
           ShareBite Signup
        </h1>

        {error && <p className="text-white-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
            value={formData.phone}
            onChange={handleChange}
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
          >
            <option value="donor">Donor</option>
            <option value="recipient">Recipient</option>
            <option value="volunteer">Volunteer</option>
          </select>

          {/* Recipient-specific fields */}
          {formData.role === "recipient" && (
            <>
              <select
                name="acceptance_type"
                value={formData.acceptance_type}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
              >
                <option value="edible">Edible</option>
                <option value="non-edible">Non-Edible</option>
                <option value="both">Both</option>
              </select>

              <select
                name="organisation_type"
                value={formData.organisation_type}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
              >
                <option value="">-- Select Organisation Type --</option>
                {getOrgOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            type="text"
            name="address"
            placeholder="Address"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400"
            value={formData.address}
            onChange={handleChange}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-yellow-600 font-semibold">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
