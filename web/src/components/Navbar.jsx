import { FaAndroid } from "react-icons/fa";
import { NavLink } from "react-router-dom";

import AppLogo from "./AppLogo";
import { useAuth } from "../auth/UseAuth";

function Navbar() {
  const { user } = useAuth();
  const profilePath = `/${user?.username || "profile"}`;
  const menuItems = {
    "Kezdőlap": "/home",
    "Előfizetések": "/subscriptions",
    "Profilom": profilePath,
    "Beállítások": "/settings"
  };

  const downloadAndroidApp = (e) => {
    e.preventDefault();
    const apkUrl = `${import.meta.env.VITE_BACKEND_VPS_API}/app-version/android/apk`;
    window.location.href = apkUrl;
  }


  // const downloadAndroidApp = () => {
  //   setLoading(true);
  //   axios.get(import.meta.env.VITE_BACKEND_VPS_API + "/app-version/android/apk", {
  //     params: {},
  //     headers: {
  //       "Content-Type": "application/vnd.android.package-archive",
  //     },
  //   })
  //     .then((response) => {
  //       setAndroidFile(response.data);
  //       const downloadPath = response.data.downloadUrl;
  //       const url = import.meta.env.VITE_BACKEND_VPS_API + downloadPath;
  //       window.location.href = url;
  //       console.log("App version data:", response.data);
  //     })
  //     .catch(error => {
  //       console.error("Error fetching app version data:", error);
  //     })
  //     .finally(() => {
  //       setLoading(false);
  //     });
  // };

  // const downloadApp = async () => {
  //   try {
  //     await axios.get(PROCESS.env.REACT_APP_API_HOST + "/app-version/android/apk")
  //   } catch (error) {
  //     console.error("Error downloading app:", error);
  //   }
  // }

  return (
    <nav className="sticky top-4 z-50 mx-auto w-[min(92rem,calc(100%-2rem))]">
      <div className="sf-card relative flex h-16 items-center justify-between rounded-[1.35rem] px-4">
        <NavLink to="/home" className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 shadow-inner">
            {AppLogo({ size: 50, className: "absolute" })}
          </div>

          <span className="text-base font-bold text-gray-900">
            SpendFox
          </span>
        </NavLink>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
          {Object.entries(menuItems).map(([label, path]) => (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) =>
                `sf-nav-link text-sm font-bold transition-colors ${isActive ? "sf-nav-link-active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <a
            onClick={downloadAndroidApp}
            className="hidden cursor-pointer items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200 lg:flex"
          >
            <FaAndroid className="h-5 w-5 text-lime-500" />
            Alkalmazás letöltése
          </a>

          {localStorage.getItem("accessToken") ? (
            <a
              onClick={() => {
                localStorage.removeItem("accessToken");
                window.location.href = "/register";
              }}
              className="cursor-pointer rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-blue-600"
            >
              Kijelentkezés
            </a>
            ) : (
            <a
              href="/register"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Regisztráció
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
