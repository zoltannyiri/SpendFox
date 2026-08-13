import { FaAndroid } from "react-icons/fa";

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
    <nav className="sticky mx-auto top-3 max-w-6xl justify-center items-center transparent-bg z-50">
      <div className="flex h-14 items-center justify-between rounded-2xl bg-white px-3 shadow-xl">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl">
            <div className="h-2 w-5 rounded-full bg-white/80" />
            {AppLogo({ size: 50, className: "absolute" })}
          </div>

          <span className="text-base font-bold text-gray-900">
            SpendFox
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {Object.entries(menuItems).map(([label, path]) => (
            <a
              key={label}
              href={path}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-black"
            >
              {label}
            </a>
          ))}
        </div>
        <a
          onClick={downloadAndroidApp}
          className="cursor-pointer flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
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
            className="cursor-pointer hidden rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 md:block"
          >
            Kijelentkezés
          </a>
          ) : (
          <a
            href="/register"
            className="hidden rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 md:block"
          >
            Regisztráció
          </a>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
