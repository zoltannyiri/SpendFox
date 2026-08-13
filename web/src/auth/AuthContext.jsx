/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem("accessToken"));

  const fetchProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      return axios.get(import.meta.env.VITE_API_HOST + "/profile", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
        .then((response) => {
          setUser(response.data.data);
          return response;
        })
        .catch((error) => {
          console.error("Error fetching user profile:", error);
          localStorage.removeItem("accessToken");
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profileId: user?.id, loading, fetchProfile }}>
      {loading ? (
        <div className="">
          {/* Betöltés... */}
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
