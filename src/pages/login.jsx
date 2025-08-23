import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      
      navigate('/redirect')
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400">
      <div className="w-full max-w-md bg-black-900 p-8 rounded-2xl shadow-2xl border border-yellow-500">
        <h1 className="text-3xl font-bold text-center text-yellow-400 mb-6">
          ShareBite Login
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
             className="w-full p-3 border border-yellow-500 bg-black rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400 placeholder-yellow-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-yellow-500 bg-black rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-yellow-400 placeholder-yellow-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
           className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-600 transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

         <p className="text-sm text-yellow-400 text-center mt-4">
          Don’t have an account?{" "}
          <a href="/signup" className="text-yellow-300 font-semibold hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
