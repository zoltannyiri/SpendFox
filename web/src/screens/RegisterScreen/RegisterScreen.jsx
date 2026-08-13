import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import AppLogo from "../../components/AppLogo";

const normalizeUsername = (value) => value.trim().toLowerCase();
const isValidUsername = (value) => /^[a-z][a-z0-9_]*$/.test(value);

const RegisterScreen = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [avatar] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    const payload = {
      username: normalizedUsername,
      email,
      full_name: fullName,
      password,
      avatar_url: avatar,
    }
    if (!username || !email || !fullName || !password || !verifyPassword) {
      setError("Kérlek töltsd ki az összes mezőt.");
      return;
    }
    if (password !== verifyPassword) {
      setError("A jelszavak nem egyeznek.");
      return;
    }
    if (email.length < 5 || !email.includes("@")) {
      setError("Érvénytelen e-mail cím.");
      return;
    }
    if (normalizedUsername.length < 3) {
      setError("A felhasználónév túl rövid.");
      return;
    }
    if (!isValidUsername(normalizedUsername)) {
      setError("A felhasználónév betűvel kezdődjön, és csak kisbetűt, számot vagy aláhúzást tartalmazhat.");
      return;
    }
    if (fullName.length < 3) {
      setError("A teljes név túl rövid.");
      return;
    }
    axios.post(`${import.meta.env.VITE_API_HOST}/auth/register`, payload)
      .then((response) => {
        console.log("Registration successful:", response.data);
        localStorage.setItem("accessToken", response.data.data.session.access_token);
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error during registration:", error.response.data);
        setError(error.response.data.error || error.response || "Hiba történt a regisztráció során.");
      })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-black p-8 shadow-2xl border border-zinc-800">
        
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-cyan-300 to-blue-600 shadow-inner mb-4">
            <AppLogo size={52} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Fiók létrehozása
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Csatlakozz a SpendFox-hoz és kövesd nyomon a kiadásaidat!
          </p>
        </div>

        {/* Regisztrációs Űrlap */}
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Felhasználónév
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              required
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          
          {/* Teljes név / Felhasználónév */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Teljes név
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Email mező */}
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

          {/* Jelszó mező */}
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

          {/* Jelszó megerősítése */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Jelszó megerősítése
            </label>
            <input
              type="password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Regisztráció gomb */}
          <button
            type="submit"
            onClick={handleRegister}
            className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-[0.98]"
          >
            Regisztráció
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </form>

        {/* Átirányítás Bejelentkezésre */}
        <div className="text-center text-xs text-zinc-500 pt-2">
          Már van fiókod?{" "}
          <a href="/login" className="font-semibold text-white hover:underline">
            Jelentkezz be!
          </a>
        </div>

      </div>
    </div>
  );
}

export default RegisterScreen;
