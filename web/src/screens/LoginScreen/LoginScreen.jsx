import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../auth/UseAuth";
import AppLogo from "../../components/AppLogo";
import PageLoadingBar from "../../components/PageLoadingBar";

const LoginScreen = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetchProfile } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!email || !password) {
      setError("Töltsd ki az összes mezőt.");
      setLoading(false);
      return;
    }
    try {
      const payload = { 
        email, 
        password
      };
      const response = await axios.post(`${import.meta.env.VITE_API_HOST}/auth/login`, payload);
      
      console.log("Login successful:", response.data);
      localStorage.setItem("accessToken", response.data.data.session.access_token);
      
      await fetchProfile();
      navigate(location.pathname.startsWith("/subscription-share/") ? location.pathname : "/home");
    } catch (err) {
      console.error("Error during login:", err?.response?.data || err);
      setError(err?.response?.data?.error || "Hiba történt a bejelentkezés során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sf-auth-page flex min-h-screen w-full items-center justify-center px-4 py-12">
      <PageLoadingBar show={loading} />
      <div className="sf-auth-card w-full max-w-md space-y-8 rounded-[2rem] border border-white/10 p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b shadow-inner mb-4">
            <AppLogo size={52} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Bejelentkezés
          </h2>
          {/* <p className="mt-2 text-sm text-zinc-400">
            Csatlakozz a SpendFox-hoz és kövesd nyomon a kiadásaidat!
          </p> */}
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Email cím
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="pelda@spendfox.com"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Jelszó
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Bejelentkezés gomb */}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Belépés..." : "Bejelentkezés"}
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </form>

        {/* Átirányítás Bejelentkezésre */}
        <div className="text-center text-xs text-zinc-500 pt-2">
          Még nincs fiókod?{" "}
          <a href="/register" className="font-semibold text-white hover:underline">
            Regisztrálj!
          </a>
        </div>

      </div>
    </div>
  )
}

export default LoginScreen;
