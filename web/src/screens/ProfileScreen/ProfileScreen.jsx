import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import {
  FiBell,
  FiBookmark,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiLink,
  FiList,
  FiLock,
  FiMail,
  FiMessageCircle,
  FiMapPin,
  FiMoreHorizontal,
  FiShield,
  FiStar,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { LuLightbulb } from "react-icons/lu";

import { useAuth } from "../../auth/UseAuth";

const CATEGORY_META = {
  streaming: { label: "Streaming", color: "bg-violet-100 text-violet-700" },
  work: { label: "Munka", color: "bg-orange-100 text-orange-700" },
  "ai-tool": { label: "AI tool", color: "bg-blue-100 text-blue-700" },
  hosting: { label: "Felhő", color: "bg-sky-100 text-sky-700" },
  mobile: { label: "Mobil", color: "bg-emerald-100 text-emerald-700" },
  bank: { label: "Bank", color: "bg-slate-100 text-slate-700" },
  gaming: { label: "Játék", color: "bg-red-100 text-red-700" },
  other: { label: "Egyéb", color: "bg-zinc-100 text-zinc-700" },
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatFirestoreDate = (value, options = {}) => {
  if (!value) return "N/A";

  const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
};

const formatCurrency = (value) =>
  Math.round(Number(value) || 0).toLocaleString("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

const getMonthlyPrice = (subscription) => {
  const price = Number(subscription?.price_huf ?? subscription?.price ?? 0);

  if (subscription?.billing_cycle === "yearly") return price / 12;
  if (subscription?.billing_cycle === "weekly") return price * 4;

  return price;
};

const getNextPayment = (subscriptions) => {
  const now = new Date();

  return subscriptions
    .filter((item) => item?.next_billing_date)
    .map((item) => ({
      ...item,
      parsedDate: new Date(item.next_billing_date),
    }))
    .filter((item) => !Number.isNaN(item.parsedDate.getTime()) && item.parsedDate >= now)
    .sort((a, b) => a.parsedDate - b.parsedDate)[0];
};

const getDaysUntil = (dateValue) => {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date - today) / 86400000);
};

const getProfilePath = (user) => `/${user?.username || user?.id}`;

const profileVisibilityLabels = {
  public: "Publikus profil",
  friends: "Csak barátok",
  private: "Privát profil",
};

const billingCycleLabels = {
  monthly: "hó",
  yearly: "év",
  weekly: "hét",
};

const activityMeta = {
  recommendation: {
    badge: "Ajánlott előfizetés",
    badgeClass: "bg-blue-50 text-blue-600",
    icon: <FiStar className="text-blue-600" />,
    action: "Részletek megtekintése",
  },
  tip: {
    badge: "Spórolási tipp",
    badgeClass: "bg-orange-50 text-orange-600",
    icon: <LuLightbulb className="text-orange-500" />,
    action: "Tipp részletei",
  },
  list: {
    badge: "Megosztott lista",
    badgeClass: "bg-violet-50 text-violet-600",
    icon: <FiList className="text-violet-600" />,
    action: "Lista megnyitása",
  },
  subscribed_subscription: {
    badge: "Új előfizetés",
    badgeClass: "bg-emerald-50 text-emerald-600",
    icon: <FiCheckCircle className="text-emerald-600" />,
    action: "Előfizetés részletei",
  },
  shared_subscription: {
    badge: "Közös előfizetés",
    badgeClass: "bg-cyan-50 text-cyan-600",
    icon: <FiUsers className="text-cyan-600" />,
    action: "Közös oldal megnyitása",
  },
  post: {
    badge: "Bejegyzés",
    badgeClass: "bg-slate-100 text-slate-700",
    icon: <FiMessageCircle className="text-slate-600" />,
  },
  cancelled_subscription: {
    badge: "Lemondott előfizetés",
    badgeClass: "bg-red-50 text-red-600",
    icon: <FiBookmark className="text-red-500" />,
    action: "Megtakarítás megtekintése",
  },
};

const getActivityMeta = (activity) => activityMeta[activity?.type] || activityMeta.post;

const getActivityTitle = (activity) =>
  activity?.title || activity?.subscription_name || activity?.body?.split("\n")[0] || "Profil aktivitás";

const getActivityDescription = (activity) => {
  if (!activity?.body) return "Nincs további leírás.";

  const title = getActivityTitle(activity);
  return activity.body === title ? "" : activity.body;
};

const getActivityCategoryLabel = (activity) =>
  (CATEGORY_META[activity?.category] || CATEGORY_META.other).label;

const getActivityPriceText = (activity) => {
  if (activity?.price === null || activity?.price === undefined) {
    return "";
  }

  const currency = activity.currency || "HUF";
  const cycle = billingCycleLabels[activity.billing_cycle] || "hó";
  const formattedPrice = Math.round(Number(activity.price) || 0).toLocaleString("hu-HU");

  return `${formattedPrice} ${currency} / ${cycle}`;
};

const formatRelativeDate = (value) => {
  if (!value) return "most";

  const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "most";

  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffDays <= 0) return "ma";
  if (diffDays === 1) return "tegnap";
  if (diffDays < 30) return `${diffDays} napja`;

  return formatFirestoreDate(value, { month: "short" });
};

const Card = ({ children, className = "" }) => (
  <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, action }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
    </div>
    {action || <FiMoreHorizontal className="text-slate-500" />}
  </div>
);

const StatCard = ({ icon, label, value, hint, tone = "blue" }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <Card className="p-6">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
        {icon}
      </div>
      <div className="mt-6 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-3 text-sm text-slate-500">{hint}</div>
    </Card>
  );
};

const ActivityCard = ({
  icon,
  badge,
  badgeClass,
  title,
  description,
  action,
  footer,
  accent,
  authorName,
  activity,
}) => (
  <Card className={`relative overflow-hidden p-6 ${accent || ""}`}>
    <FiBookmark className="absolute right-6 top-6 text-xl text-slate-400" />
    <div className="flex gap-5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
            {badge}
          </span>
          <span className="text-sm font-bold text-slate-950">{authorName}</span>
          <span className="text-sm text-slate-400">·</span>
          <span className="text-sm text-slate-500">{footer}</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{description}</p>
            {activity?.subscription_name && (
              <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                    {activity.logo_url ? (
                      <img
                        src={activity.logo_url}
                        alt={activity.subscription_name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <FiBookmark className="text-xl text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-slate-950">
                      {activity.subscription_name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                        {getActivityCategoryLabel(activity)}
                      </span>
                      {getActivityPriceText(activity) && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                          {getActivityPriceText(activity)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {activity.price_huf !== null && activity.price_huf !== undefined && (
                  <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      HUF érték
                    </div>
                    <div className="text-lg font-black text-slate-950">
                      {formatCurrency(activity.price_huf)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {action && activity?.id && (
            <a
              href={`/post/${activity.id}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
            >
              {action}
            </a>
          )}
        </div>
      </div>
    </div>
  </Card>
);

const TopLoader = () => (
  <div className="fixed left-0 right-0 top-[76px] z-50 h-1 overflow-hidden bg-blue-50">
    <div className="h-full w-1/2 animate-[profile-loader_1.1s_ease-in-out_infinite] rounded-full bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.55)]" />
  </div>
);

const ProfileError = ({ message }) => (
  <div className="min-h-screen bg-slate-50 px-5 pb-12 pt-10 text-slate-950">
    <div className="mx-auto flex min-h-[70vh] max-w-[88rem] items-center justify-center">
      <div className="rounded-[2rem] border border-red-100 bg-white px-10 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
          !
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-950">Nem sikerült betölteni a profilt</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  </div>
);

const ProfileScreen = () => {
  const { profileId, user } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const authProfileId = profileId || user?.id;
  const viewedProfileLookup = routeUsername || authProfileId;

  const [userData, setUserData] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [friendList, setFriendList] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendMessage, setFriendMessage] = useState("");
  const [profileAccessMessage, setProfileAccessMessage] = useState("");
  const [loadedProfileLookup, setLoadedProfileLookup] = useState("");
  const [profileError, setProfileError] = useState("");
  const [activities, setActivities] = useState([]);

  const fetchFriends = () =>
    axios
      .get(import.meta.env.VITE_API_HOST + "/friends", {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        setFriendList(response.data.data || []);
      })
      .catch((error) => {
        console.error("Error fetching friends:", error);
      });

  const fetchFriendRequests = () =>
    axios
      .get(import.meta.env.VITE_API_HOST + "/friends/requests", {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        setFriendRequests(response.data.data || { incoming: [], outgoing: [] });
      })
      .catch((error) => {
        console.error("Error fetching friend requests:", error);
      });

  useEffect(() => {
    if (!viewedProfileLookup) return;

    axios
      .get(import.meta.env.VITE_API_HOST + "/users/" + viewedProfileLookup, {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        setUserData(response.data.data);
        setLoadedProfileLookup(String(viewedProfileLookup));
        setProfileError("");
        const permission = response.data.data?.viewer_permissions;
        if (permission?.canViewFullProfile === false) {
          setSubscriptions([]);
          setActivities([]);
          setProfileAccessMessage(
            permission.visibility === "private"
              ? "Ez a profil privát, ezért csak az alapadatok láthatók."
              : "Ez a profil csak barátoknak látható. Küldj barátkérést a részletekhez."
          );
        } else {
          setProfileAccessMessage("");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        setLoadedProfileLookup(String(viewedProfileLookup));
        setProfileError(error.response?.data?.error || "Próbáld meg újratölteni az oldalt.");
      });
  }, [viewedProfileLookup]);

  useEffect(() => {
    if (!userData?.id || String(userData.id) !== String(authProfileId)) return;

    fetchFriends();
    fetchFriendRequests();
  }, [userData?.id, authProfileId]);

  useEffect(() => {
    if (!userData?.id || userData.viewer_permissions?.canViewFullProfile === false) {
      return;
    }

    axios
      .get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + userData.id, {
        headers: getAuthHeaders(),
      })
      .then((response) => {
        setSubscriptions(response.data.data || []);
      })
      .catch((error) => {
        console.error("Error fetching subscriptions:", error);
      });
  }, [userData?.id, userData?.viewer_permissions?.canViewFullProfile]);

  useEffect(() => {
    if (!userData?.id || userData.viewer_permissions?.canViewFullProfile === false) {
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_HOST}/profile-activities/${userData.id}`, {
        params: { limit: 20 },
        headers: getAuthHeaders(),
      })
      .then((response) => {
        setActivities(response.data.data || []);
      })
      .catch((error) => {
        console.error("Error fetching profile activities:", error);
      });
  }, [userData?.id, userData?.viewer_permissions?.canViewFullProfile]);

  useEffect(() => {
    const query = friendSearchQuery.trim();

    const timeout = setTimeout(() => {
      if (query.length < 2) {
        setFriendSearchResults([]);
        return;
      }

      axios
        .get(import.meta.env.VITE_API_HOST + "/friends/search", {
          params: { q: query },
          headers: getAuthHeaders(),
        })
        .then((response) => {
          setFriendSearchResults(response.data.data || []);
        })
        .catch((error) => {
          console.error("Error searching friends:", error);
        });
    }, 300);

    return () => clearTimeout(timeout);
  }, [friendSearchQuery]);

  const sendFriendRequest = (receiverId) => {
    setFriendMessage("");

    axios
      .post(
        import.meta.env.VITE_API_HOST + "/friends/requests",
        { receiver_id: receiverId },
        { headers: getAuthHeaders() }
      )
      .then(() => {
        setFriendMessage("Barátkérés elküldve.");
        setFriendSearchQuery("");
        setFriendSearchResults([]);
        fetchFriendRequests();
      })
      .catch((error) => {
        setFriendMessage(error.response?.data?.error || "Nem sikerült elküldeni a barátkérést.");
      });
  };

  const respondToFriendRequest = (requestId, action) => {
    axios
      .patch(
        `${import.meta.env.VITE_API_HOST}/friends/requests/${requestId}/${action}`,
        {},
        { headers: getAuthHeaders() }
      )
      .then(() => {
        fetchFriends();
        fetchFriendRequests();
      })
      .catch((error) => {
        setFriendMessage(error.response?.data?.error || "Nem sikerült kezelni a barátkérést.");
      });
  };

  const profileName = userData?.full_name || "SpendFox felhasználó";
  const username = userData?.username || "felhasznalo";
  const isOwnProfile =
    String(userData?.id) === String(authProfileId) ||
    Boolean(userData?.username && user?.username && userData.username === user.username);
  const bio =
    userData?.bio ||
    "Digitális minimalista. Szeretem az okos eszközöket, a jó kávét és az átlátható pénzügyeket.";
  const location = userData?.location || "Budapest, Magyarország";
  const visibilityLabel = profileVisibilityLabels[userData?.profile_visibility] || "Publikus profil";

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.is_active !== false),
    [subscriptions]
  );
  const inactiveCount = subscriptions.length - activeSubscriptions.length;
  const monthlyTotal = activeSubscriptions.reduce((total, item) => total + getMonthlyPrice(item), 0);
  const yearlyTotal = monthlyTotal * 12;
  const nextPayment = getNextPayment(activeSubscriptions);
  const daysUntilNextPayment = getDaysUntil(nextPayment?.next_billing_date);
  const displayedFriends = friendList.map((item) => item.friend).filter(Boolean);
  const canViewFullProfile = userData?.viewer_permissions?.canViewFullProfile !== false;
  const isProfileLoading =
    !viewedProfileLookup || loadedProfileLookup !== String(viewedProfileLookup);
  const activeProfileError =
    loadedProfileLookup === String(viewedProfileLookup) ? profileError : "";

  const topCategories = useMemo(() => {
    const counts = activeSubscriptions.reduce((acc, item) => {
      const category = item.category || "other";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return sorted.length ? sorted : ["streaming", "work", "ai-tool", "hosting", "other"];
  }, [activeSubscriptions]);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 pb-12 pt-10 text-slate-950">
        <TopLoader />
        <div className="mx-auto max-w-[88rem]" />
      </div>
    );
  }

  if (activeProfileError) {
    return <ProfileError message={activeProfileError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 pb-12 pt-10 text-slate-950">
      <div className="mx-auto max-w-[88rem]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative min-h-[360px] overflow-hidden bg-slate-950 px-10 py-12 text-white">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(37,99,235,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#020617_100%)]" />
              <div className="absolute -right-32 bottom-4 h-72 w-[640px] rounded-[100%] border border-white/10 bg-white/[0.03] blur-[1px]" />
              <div className="absolute right-16 top-20 h-56 w-[520px] rounded-[100%] border border-white/10 bg-white/[0.04]" />
              <div className="absolute left-1/2 top-0 h-full w-[1px] rotate-[28deg] bg-white/10" />
            </div>

            <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="relative">
                  <Avatar
                    image={userData?.avatar_url || undefined}
                    label={!userData?.avatar_url ? profileName.charAt(0) : undefined}
                    style={{ width: "12rem", height: "12rem" }}
                    shape="circle"
                    className="border-[6px] border-white shadow-2xl"
                  />
                  <span className="absolute bottom-7 right-2 h-6 w-6 rounded-full border-4 border-white bg-emerald-500" />
                </div>

                <div>
                  <h1 className="text-5xl font-black tracking-tight">{profileName}</h1>
                  <div className="mt-3 text-xl text-slate-300">@{username}</div>
                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-100">{bio}</p>

                  <div className="mt-7 flex flex-wrap gap-6 text-base text-slate-100">
                    <span className="flex items-center gap-2">
                      <FiMapPin className="text-xl" />
                      {location}
                    </span>
                    <span className="flex items-center gap-2">
                      <FiCalendar className="text-xl" />
                      {formatFirestoreDate(userData?.created_at, { month: "long", day: undefined })}
                    </span>
                  </div>

                  <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-100">
                    <FiLock />
                    {visibilityLabel}
                  </div>
                </div>
              </div>

              {isOwnProfile && (
                <div className="flex flex-col gap-4 lg:w-64">
                  <button
                    type="button"
                    onClick={() => navigate("/profile/edit")}
                    className="flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                  >
                    <FiEdit3 />
                    Profil szerkesztése
                  </button>
                  <button
                    type="button"
                    className="mt-12 flex items-center justify-center gap-3 rounded-2xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white/90 backdrop-blur transition hover:bg-white/10"
                  >
                    <FiEye />
                    Nyilvános profil előnézete
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/profile/edit")}
                    className="flex items-center justify-center gap-3 rounded-2xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white/90 backdrop-blur transition hover:bg-white/10"
                  >
                    <FiShield />
                    Adatvédelmi beállítások
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-10 overflow-x-auto bg-white px-10 text-base font-semibold text-slate-600">
            {["Áttekintés", "Ajánlások", "Listák", "Barátok", "Rólam"].map((tab, index) => (
              <button
                key={tab}
                className={`cursor-pointer border-b-2 py-6 transition ${
                  index === 0
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-slate-950"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {profileAccessMessage && (
          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 px-6 py-5 text-sm font-bold text-blue-700">
            {profileAccessMessage}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <Card className="p-6">
              <SectionHeader icon={<FiUser />} title="Bemutatkozás" />
              <p className="mt-5 text-base leading-relaxed text-slate-600">{bio}</p>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <FiMapPin className="text-xl text-slate-500" />
                  {location}
                </div>
                <div className="flex items-center gap-3">
                  <FiMail className="text-xl text-slate-500" />
                  {userData?.email || "email nincs megadva"}
                </div>
                <div className="flex items-center gap-3">
                  <FiLink className="text-xl text-slate-500" />
                  spendfox.com/{userData?.profile_slug || username}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeader
                icon={<FiUsers />}
                title="Barátok"
                action={
                  <span className="text-sm text-slate-500">
                    {isOwnProfile ? `Összes (${friendList.length})` : "Csak saját profilon"}
                  </span>
                }
              />

              {isOwnProfile ? (
                <input
                  value={friendSearchQuery}
                  onChange={(event) => setFriendSearchQuery(event.target.value)}
                  className="mt-5 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                  placeholder="Keress név, email vagy username alapján"
                />
              ) : (
                <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                  {profileName} profilját nézed.
                </div>
              )}

              {friendMessage && (
                <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                  {friendMessage}
                </div>
              )}

              {isOwnProfile && friendSearchResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  {friendSearchResults.map((candidate) => {
                    const candidateName = candidate.full_name || candidate.username || candidate.email;

                    return (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            image={candidate.avatar_url || undefined}
                            label={!candidate.avatar_url ? candidateName?.charAt(0) : undefined}
                            shape="circle"
                            className="shrink-0 bg-blue-50 text-blue-600"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-950">{candidateName}</div>
                            <div className="truncate text-xs text-slate-500">
                              @{candidate.username || candidate.email}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendFriendRequest(candidate.id)}
                          className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                        >
                          Kérés
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isOwnProfile && friendSearchQuery.trim().length >= 2 && friendSearchResults.length === 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nincs találat erre a keresésre.
                </div>
              )}

              {isOwnProfile && friendRequests.incoming?.length > 0 && (
                <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="text-sm font-black text-orange-800">Bejövő kérések</div>
                  <div className="mt-3 space-y-3">
                    {friendRequests.incoming.map((request) => {
                      const sender = request.sender || {};
                      const senderName = sender.full_name || sender.username || sender.email || "Felhasználó";

                      return (
                        <div key={request.id} className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              image={sender.avatar_url || undefined}
                              label={!sender.avatar_url ? senderName.charAt(0) : undefined}
                              shape="circle"
                              className="shrink-0 bg-white text-orange-700"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-950">{senderName}</div>
                              <div className="truncate text-xs text-slate-500">@{sender.username || sender.email}</div>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, "accept")}
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToFriendRequest(request.id, "reject")}
                              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
                            >
                              Nem
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-5">
                {displayedFriends.slice(0, 6).map((friend) => {
                  const friendName = friend.full_name || friend.username || friend.email || "Barát";

                  return (
                    <div key={friend.id || friend.email} className="group relative min-w-0 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(getProfilePath(friend))}
                        className="block w-full"
                      >
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friendName}
                            className="mx-auto h-16 w-16 rounded-full object-cover transition group-hover:brightness-75"
                          />
                        ) : (
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-lg font-black text-blue-600 transition group-hover:bg-blue-100">
                            {friendName.charAt(0)}
                          </div>
                        )}
                      </button>

                      <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
                          aria-label={`${friendName} menü`}
                        >
                          <FiMoreHorizontal />
                        </button>

                        <div className="absolute left-1/2 top-9 hidden w-36 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl group-hover:block">
                          <button
                            type="button"
                            onClick={() => navigate(getProfilePath(friend))}
                            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiUser />
                            Profil
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/messages/${friend.id}`)}
                            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiMessageCircle />
                            Üzenetek
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(getProfilePath(friend))}
                        className="mt-2 block w-full truncate text-sm font-medium text-slate-700 transition hover:text-blue-600"
                      >
                        {friendName.split(" ")[0] || friendName}
                      </button>
                    </div>
                  );
                })}
              </div>

              {isOwnProfile && displayedFriends.length === 0 && (
                <p className="mt-5 text-center text-sm leading-relaxed text-slate-500">
                  Keress rá valakire, küldj barátkérést, és később összehasonlíthatjátok a kedvenc előfizetéseiteket.
                </p>
              )}

              {!isOwnProfile && (
                <p className="mt-5 text-center text-sm leading-relaxed text-slate-500">
                  Más felhasználók barátlistája később adatvédelmi beállítás alapján lesz látható.
                </p>
              )}

              {isOwnProfile && friendRequests.outgoing?.length > 0 && (
                <div className="mt-4 text-center text-xs font-bold text-slate-400">
                  {friendRequests.outgoing.length} elküldött kérés függőben
                </div>
              )}

              <button className="mt-4 w-full text-sm font-bold text-blue-600">
                Összes barát megtekintése →
              </button>
            </Card>

            <Card className="p-6">
              <SectionHeader icon={<FiBookmark />} title="Leggyakoribb kategóriáid" />
              <div className="mt-5 flex flex-wrap gap-3">
                {topCategories.map((category) => {
                  const meta = CATEGORY_META[category] || CATEGORY_META.other;
                  return (
                    <span
                      key={category}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeader icon={<FiShield />} title="Pénzügyi setup" />
              <div className="mt-5 text-sm text-slate-600">Profil 95%-ban teljes</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[95%] rounded-full bg-emerald-500" />
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-emerald-500" />
                  Értesítések bekapcsolva
                </div>
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-emerald-500" />
                  Kategóriák rendezve
                </div>
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-emerald-500" />
                  Megosztott listák: 2
                </div>
              </div>
            </Card>
          </aside>

          <main className="space-y-6">
            {canViewFullProfile ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    icon={<FiCalendar className="text-2xl" />}
                    label="Havi költség"
                    value={formatCurrency(monthlyTotal)}
                    hint="Összes előfizetés"
                    tone="violet"
                  />
                  <StatCard
                    icon={<FiCheckCircle className="text-2xl" />}
                    label="Aktív előfizetések"
                    value={`${activeSubscriptions.length} db`}
                    hint={`${inactiveCount} inaktív`}
                    tone="green"
                  />
                  <StatCard
                    icon={<FiCalendar className="text-2xl" />}
                    label="Következő fizetés"
                    value={daysUntilNextPayment === null ? "Nincs" : `${daysUntilNextPayment} napon belül`}
                    hint={
                      nextPayment
                        ? `${nextPayment.name} · ${formatCurrency(nextPayment.price_huf ?? nextPayment.price)}`
                        : "Nincs közelgő fizetés"
                    }
                    tone="orange"
                  />
                  <StatCard
                    icon={<FiBell className="text-2xl" />}
                    label="Éves becslés"
                    value={formatCurrency(yearlyTotal)}
                    hint="becsült éves összeg"
                    tone="blue"
                  />
                </div>

                {activities.length > 0 ? (
                  activities.map((activity) => {
                    const meta = getActivityMeta(activity);

                    return (
                      <ActivityCard
                        key={activity.id}
                        icon={meta.icon}
                        badge={meta.badge}
                        badgeClass={meta.badgeClass}
                        title={getActivityTitle(activity)}
                        description={getActivityDescription(activity)}
                        action={meta.action}
                        footer={formatRelativeDate(activity.created_at)}
                        authorName={profileName}
                        activity={activity}
                        accent={
                          activity.type === "cancelled_subscription"
                            ? "border-l-4 border-l-emerald-500"
                            : ""
                        }
                      />
                    );
                  })
                ) : (
                  <Card className="p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                      <FiMessageCircle />
                    </div>
                    <h2 className="mt-5 text-2xl font-black text-slate-950">
                      Még nincs profil aktivitás
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
                      Itt jelennek meg az ajánlások, listák, tippek és később a közösségi
                      aktivitások is.
                    </p>
                  </Card>
                )}

                {activities.length >= 20 && (
                  <button className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    További aktivitások megtekintése →
                  </button>
                )}
              </>
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  <FiLock />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">
                  A részletek nem nyilvánosak
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
                  A felhasználó adatvédelmi beállítása alapján az előfizetési összkép,
                  aktivitások és pénzügyi adatok csak engedélyezett nézőknek jelennek meg.
                </p>
              </Card>
            )}
          </main>
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 SpendFox. Minden jog fenntartva.</div>
          <div className="flex flex-wrap gap-8">
            <a href="/legal/privacy" className="hover:text-slate-900">Adatvédelem</a>
            <a href="/legal/terms" className="hover:text-slate-900">Általános Szerződési Feltételek</a>
            <a href="/help" className="hover:text-slate-900">Súgó</a>
            <a href="/contact" className="hover:text-slate-900">Kapcsolat</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProfileScreen;
