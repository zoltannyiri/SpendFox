import React, { useState, useEffect } from "react";
import axios from "axios";

import AppLogo from "../../components/AppLogo";
import { AiOutlineEdit } from "react-icons/ai";
import { AiOutlineCalendar } from "react-icons/ai";
import { AiOutlineStar, AiOutlineUser, } from 'react-icons/ai';
import { useAuth } from "../../auth/UseAuth";

const HomeScreen = () => {
  const {profileId, user} = useAuth();
  const [avatar, setAvatar] = useState(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  // const monthlyPrice =
  //   item.billing_cycle === 'yearly'
  //     ? price / 12
  //     : item.billing_cycle === 'weekly'
  //       ? price * 4
  //       : price;

  // const categoryCode = item.category || 'other';
  // const categoryTotal = summary.categoryTotals[categoryCode] || 0;

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_HOST + "/profile", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
      .then((response) => {
        setAvatar(response.data.data.avatar_url);
        setUsername(response.data.data.username);
        setFullName(response.data.data.full_name);
        setFirstName(response.data.data.full_name.split(" ")[1]);
        setEmail(response.data.data.email);
        setCreatedAt(response.data.data.created_at);
        console.log(fullName);
      })
      .catch((error) => {
        console.error("Error fetching user profile:", error);
      })

    axios.get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + profileId, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
      .then((response) => {
        console.log("Subscriptions fetched successfully:", response.data);
      })
      .catch((error) => {
        console.error("Error fetching subscriptions:", error);
      });
  }, []);


  return (
    <>
      <div className="flex w-full flex-col items-center gap-6 px-4 py-12">
        <div className="w-full max-w-7xl space-y-8 rounded-3xl bg-black p-8 shadow-2xl border border-zinc-800 gap-y-2">
          <div className="relative">
            {/* <div className="flex items-center rounded-3xl">
              <img src={avatar} alt="Avatar" className="w-40 h-40 rounded-full" />
            </div> */}

            <div className="flex flex-col ml-0 text-white">
              <div className="text-3xl font-bold">
                Szia, {firstName}!
              </div>
              <div className="mt-2 text-lg">
                Itt láthatod az előfizetéseid összesítését.
              </div>
            </div>
            
            <div className="border border-zinc-400 rounded-2xl py-2 px-4 absolute top-0 right-0">
              <div className="cursor-pointer flex flex-row justify-center items-center text-center text-white text-md">
                <AiOutlineEdit className="text-2xl mr-2 text-white items-center justify-center" /> Profil szerkesztése
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center">
            <AiOutlineCalendar className="text-3xl mr-3 text-white shrink-0" /> 
            <div className="flex flex-col text-gray-300">
              <div className=" text-gray-300 text-md mt-2 tracking-wider">
                Csatlakozott
              </div>
              <div className="text-white text-lg font-bold tracking-wider">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
            <div className="mx-6 h-10 w-[1px] bg-zinc-700 mt-2" />

            <AiOutlineStar className="text-3xl mr-3 text-white shrink-0" /> 
            <div className="flex flex-col text-gray-300">
              <div className=" text-gray-300 text-md mt-2 tracking-wider">
                Státusz
              </div>
              <div className="text-white text-lg font-bold tracking-wider">
                Felhasználó
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="w-full max-w-7xl grid grid-cols-1 gap-4 md:grid-cols-10">
          <div className="md:col-span-4 rounded-2xl border border-zinc-300 bg-gray-800 p-6 text-white shadow-md">
            {/* <h3 className="mb-2 text-xl font-bold">1. Oszlop</h3>
            <p>Ide jöhet az első ablak tartalma.</p> */}
            <div className="text-gray-300 text-md">
              Ebben a hónapban
            </div>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md">
            <h3 className="mb-2 text-xl font-bold">2. Oszlop</h3>
            <p>Ide jöhet a második ablak tartalma.</p>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md">
            <h3 className="mb-2 text-xl font-bold">3. Oszlop</h3>
            <p>Ide jöhet a harmadik ablak tartalma.</p>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md">
            <h3 className="mb-2 text-xl font-bold">4. Oszlop</h3>
            <p>Ide jöhet a negyedik ablak tartalma.</p>
          </div>
        </div>
      </div>

    </>
  );
}

export default HomeScreen;