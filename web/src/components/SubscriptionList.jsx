import React, { useEffect, useState } from 'react';
import axios from "axios";
import { useAuth } from "../auth/UseAuth";


const SubscriptionList = () => {
  const {profileId} = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_URL + "/subscriptions?userId=" + profileId, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
    .then(response => {
      setSubscriptions(response.data);
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching subscriptions:", error);
      setLoading(false);
    });
  }, [profileId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
    </div>
  );
};

export default SubscriptionList;