import React, { useState } from "react";


function SubscriptionLogo({ logoUrl, name }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-3 font-bold">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white">
        {logoUrl && !failed ? (
          <img
            src={logoUrl}
            alt={name || 'Logo'}
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <SubscriptionsIcon />
        )}
      </div>
      <span>{name}</span>
    </div>
  );
}

const SubscriptionsIcon = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="#19386e" strokeWidth="1.8" />
      <path d="M8 10h8M8 14h5" stroke="#19386e" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default SubscriptionLogo;
