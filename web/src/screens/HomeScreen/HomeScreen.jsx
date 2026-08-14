import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiArrowRight,
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiMessageCircle,
  FiPlus,
  FiSend,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { LuLightbulb } from "react-icons/lu";
import { useAuth } from "../../auth/UseAuth";

const API_HOST = import.meta.env.VITE_API_HOST;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatCurrency = (value) =>
  Math.round(Number(value) || 0).toLocaleString("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

const parseDate = (value) => {
  if (!value) return null;
  if (value._seconds) return new Date(value._seconds * 1000);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "Nincs";

  return date.toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
  });
};

const formatRelativeDate = (value) => {
  const date = parseDate(value);
  if (!date) return "most";

  const diffDays = Math.floor((new Date() - date) / 86400000);

  if (diffDays <= 0) return "ma";
  if (diffDays === 1) return "tegnap";
  if (diffDays < 30) return `${diffDays} napja`;

  return formatDate(value);
};

const getDaysUntil = (value) => {
  const date = parseDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date - today) / 86400000);
};

const getProfilePath = (user) => `/${user?.username || user?.id || "profile"}`;

const getFirstName = (fullName) => {
  if (!fullName) return "Szia";
  return fullName.trim().split(/\s+/)[0] || "Szia";
};

const getMonthlyPrice = (subscription) => {
  const price = Number(subscription?.price_huf ?? subscription?.price ?? 0);
  const cycle = subscription?.billing_cycle;

  if (cycle === "yearly") return price / 12;
  if (cycle === "weekly") return price * 4;

  return price;
};

const categoryLabels = {
  streaming: "Streaming",
  work: "Munka",
  "ai-tool": "AI tool",
  hosting: "Tárhely",
  mobile: "Mobil",
  bank: "Bank",
  gaming: "Játék",
  other: "Egyéb",
};

const feedMeta = {
  recommendation: {
    label: "Ajánlás",
    color: "bg-blue-50 text-blue-600",
    icon: <FiStar />,
  },
  tip: {
    label: "Tipp",
    color: "bg-orange-50 text-orange-600",
    icon: <LuLightbulb />,
  },
  list: {
    label: "Lista",
    color: "bg-violet-50 text-violet-600",
    icon: <FiBookmark />,
  },
  subscribed_subscription: {
    label: "Új előfizetés",
    color: "bg-emerald-50 text-emerald-600",
    icon: <FiCheckCircle />,
  },
  shared_subscription: {
    label: "Közös előfizetés",
    color: "bg-cyan-50 text-cyan-600",
    icon: <FiUsers />,
  },
  post: {
    label: "Bejegyzés",
    color: "bg-slate-100 text-slate-600",
    icon: <FiMessageCircle />,
  },
  cancelled_subscription: {
    label: "Lemondás",
    color: "bg-emerald-50 text-emerald-600",
    icon: <FiCheckCircle />,
  },
};


const feedTabs = [
  {
    key: "for-you",
    label: "Neked",
    helper: "Saját és baráti posztok",
    icon: <FiUsers />,
  },
  {
    key: "discover",
    label: "Felfedezés",
    helper: "Nyilvános posztok mindenkinek",
    icon: <FiGlobe />,
  },
];

const QuickAction = ({ icon, title, text, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
  >
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-black text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
    </div>
    <FiArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
  </button>
);

const FeedActivityCard = ({
  activity,
  comments,
  commentsOpen,
  commentDraft,
  commentsLoading,
  onLike,
  onSave,
  onToggleComments,
  onCommentDraftChange,
  onSubmitComment,
}) => {
  const meta = feedMeta[activity.type] || feedMeta.post;
  const author = activity.author || {};
  const authorName = author.full_name || author.username || "SpendFox felhasználó";
  const title = activity.title || activity.subscription_name || activity.body || "Profil aktivitás";
  const description = activity.body === title ? "" : activity.body;

  return (
    <article className="min-w-0 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex min-w-0 items-start gap-4">
        <button
          type="button"
          onClick={() => {
            window.location.href = getProfilePath(author);
          }}
          className="shrink-0"
        >
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={authorName}
              className="h-12 w-12 rounded-full object-cover ring-4 ring-slate-50"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-black text-blue-600 ring-4 ring-slate-50">
              {authorName.charAt(0)}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = getProfilePath(author);
              }}
              className="font-black text-slate-950 transition hover:text-blue-600"
            >
              {authorName}
            </button>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-500">{formatRelativeDate(activity.created_at)}</span>
            <span className={`ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </span>
          </div>

          <div className="mt-3 max-w-full break-all text-xl font-black text-slate-950 [overflow-wrap:anywhere]">
            {title}
          </div>
          {description && (
            <p className="mt-2 max-w-full whitespace-pre-wrap break-all text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">
              {description}
            </p>
          )}

          {activity.subscription_name && (
            <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  {activity.logo_url ? (
                    <img
                      src={activity.logo_url}
                      alt={activity.subscription_name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <FiBookmark className="text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-950">{activity.subscription_name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {categoryLabels[activity.category] || activity.category || "Egyéb"}
                  </div>
                </div>
              </div>

              {activity.price_huf !== null && activity.price_huf !== undefined && (
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    HUF érték
                  </div>
                  <div className="text-base font-black text-slate-950">
                    {formatCurrency(activity.price_huf)}
                  </div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(activity.list_items) && activity.list_items.length > 0 && (
            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Megosztott lista
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                  {activity.list_items.length} elem
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {activity.list_items.map((item) => (
                  <div
                    key={`${activity.id}-${item.id || item.name}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-blue-600">
                      {item.logo_url ? (
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <FiBookmark />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">{item.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {categoryLabels[item.category] || item.category || "Egyéb"}
                      </div>
                    </div>
                    {item.price_huf !== null && item.price_huf !== undefined && (
                      <div className="shrink-0 text-right text-xs font-black text-slate-700">
                        {formatCurrency(item.price_huf)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4 text-sm font-bold text-slate-500">
            <button
              type="button"
              onClick={() => onLike(activity)}
              className={`flex items-center gap-2 transition hover:text-blue-600 ${
                activity.viewer_liked ? "text-blue-600" : ""
              }`}
            >
              <FiStar />
              Hasznos {activity.like_count ? `(${activity.like_count})` : ""}
            </button>
            <button
              type="button"
              onClick={() => onToggleComments(activity)}
              className={`flex items-center gap-2 transition hover:text-blue-600 ${
                commentsOpen ? "text-blue-600" : ""
              }`}
            >
              <FiMessageCircle />
              Hozzászólás {activity.comment_count ? `(${activity.comment_count})` : ""}
            </button>
            <button
              type="button"
              onClick={() => onSave(activity)}
              className={`flex items-center gap-2 transition hover:text-blue-600 ${
                activity.viewer_saved ? "text-blue-600" : ""
              }`}
            >
              <FiBookmark />
              {activity.viewer_saved ? "Mentve" : "Mentés"}
            </button>
            <a
              href={`/post/${activity.id}`}
              className="ml-auto inline-flex items-center gap-2 text-slate-700 transition hover:text-blue-600"
            >
              Részletek
              <FiArrowRight />
            </a>
          </div>

          {commentsOpen && (
            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                    Kommentek betöltése...
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => {
                    const commentAuthor = comment.author || {};
                    const commentAuthorName =
                      commentAuthor.full_name || commentAuthor.username || "SpendFox felhasználó";

                    return (
                      <div
                        key={comment.id}
                        className="flex min-w-0 gap-3 overflow-hidden rounded-2xl bg-white p-3"
                      >
                        {commentAuthor.avatar_url ? (
                          <img
                            src={commentAuthor.avatar_url}
                            alt={commentAuthorName}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
                            {commentAuthorName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="truncate text-sm font-black text-slate-950">
                            {commentAuthorName}
                          </div>
                          <div className="mt-1 max-w-full whitespace-pre-wrap break-all text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">
                            {comment.body}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                    Még nincs komment. Legyél te az első.
                  </div>
                )}
              </div>

              <form
                onSubmit={(event) => onSubmitComment(event, activity)}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  value={commentDraft}
                  onChange={(event) => onCommentDraftChange(activity.id, event.target.value)}
                  placeholder="Írj egy kommentet..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Küldés
                  <FiSend />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const EmptyFeed = () => (
  <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-2xl text-blue-600">
      <FiUsers />
    </div>
    <div className="mt-5 text-2xl font-black text-slate-950">Még csendes a feed</div>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
      Küldj barátkérést vagy ossz meg egy ajánlást a profilodon. Ide jönnek majd a barátaid
      tippjei, listái és előfizetés-ajánlásai.
    </p>
  </div>
);

const HomeScreen = () => {
  const { profileId } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [feedActivities, setFeedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedScope, setFeedScope] = useState("for-you");
  const [feedLoading, setFeedLoading] = useState(true);
  const [openComments, setOpenComments] = useState({});
  const [commentsByActivity, setCommentsByActivity] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});

  const handleFeedScopeChange = (scope) => {
    setFeedScope(scope);
    setFeedLoading(true);
  };

  const updateActivity = (activityId, updater) => {
    setFeedActivities((currentActivities) =>
      currentActivities.map((activity) =>
        String(activity.id) === String(activityId) ? updater(activity) : activity
      )
    );
  };

  const handleLike = async (activity) => {
    const previousLiked = Boolean(activity.viewer_liked);
    const nextLikeCount = Math.max((activity.like_count || 0) + (previousLiked ? -1 : 1), 0);

    updateActivity(activity.id, (currentActivity) => ({
      ...currentActivity,
      viewer_liked: !previousLiked,
      like_count: nextLikeCount,
    }));

    try {
      const response = await axios.post(`${API_HOST}/profile-activities/${activity.id}/like`, null, {
        headers: getAuthHeaders(),
      });
      updateActivity(activity.id, (currentActivity) => ({
        ...currentActivity,
        viewer_liked: response.data?.data?.liked,
        like_count: response.data?.data?.like_count,
      }));
    } catch (err) {
      updateActivity(activity.id, (currentActivity) => ({
        ...currentActivity,
        viewer_liked: previousLiked,
        like_count: activity.like_count || 0,
      }));
      console.error("Failed to like activity:", err);
    }
  };

  const handleSave = async (activity) => {
    const previousSaved = Boolean(activity.viewer_saved);

    updateActivity(activity.id, (currentActivity) => ({
      ...currentActivity,
      viewer_saved: !previousSaved,
    }));

    try {
      const response = await axios.post(`${API_HOST}/profile-activities/${activity.id}/save`, null, {
        headers: getAuthHeaders(),
      });
      updateActivity(activity.id, (currentActivity) => ({
        ...currentActivity,
        viewer_saved: response.data?.data?.saved,
      }));
    } catch (err) {
      updateActivity(activity.id, (currentActivity) => ({
        ...currentActivity,
        viewer_saved: previousSaved,
      }));
      console.error("Failed to save activity:", err);
    }
  };

  const loadComments = async (activityId) => {
    setCommentsLoading((current) => ({ ...current, [activityId]: true }));

    try {
      const response = await axios.get(`${API_HOST}/profile-activities/${activityId}/comments`, {
        headers: getAuthHeaders(),
      });
      setCommentsByActivity((current) => ({
        ...current,
        [activityId]: response.data?.data || [],
      }));
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setCommentsLoading((current) => ({ ...current, [activityId]: false }));
    }
  };

  const handleToggleComments = async (activity) => {
    const isOpen = Boolean(openComments[activity.id]);

    setOpenComments((current) => ({
      ...current,
      [activity.id]: !isOpen,
    }));

    if (!isOpen && !commentsByActivity[activity.id]) {
      await loadComments(activity.id);
    }
  };

  const handleCommentDraftChange = (activityId, value) => {
    setCommentDrafts((current) => ({
      ...current,
      [activityId]: value,
    }));
  };

  const handleSubmitComment = async (event, activity) => {
    event.preventDefault();

    const body = String(commentDrafts[activity.id] || "").trim();

    if (!body) return;

    try {
      const response = await axios.post(
        `${API_HOST}/profile-activities/${activity.id}/comments`,
        { body },
        { headers: getAuthHeaders() }
      );
      const createdComment = response.data?.data;

      setCommentsByActivity((current) => ({
        ...current,
        [activity.id]: [...(current[activity.id] || []), createdComment],
      }));
      setCommentDrafts((current) => ({ ...current, [activity.id]: "" }));
      updateActivity(activity.id, (currentActivity) => ({
        ...currentActivity,
        comment_count: (currentActivity.comment_count || 0) + 1,
      }));
    } catch (err) {
      console.error("Failed to create comment:", err);
    }
  };

  useEffect(() => {
    if (!profileId) return;

    let isMounted = true;

    const headers = getAuthHeaders();

    Promise.allSettled([
      axios.get(`${API_HOST}/profile`, { headers }),
      axios.get(`${API_HOST}/subscriptions?userId=${profileId}`, { headers }),
    ])
      .then(([profileResult, subscriptionsResult]) => {
        if (!isMounted) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.data?.data || null);
        }

        if (subscriptionsResult.status === "fulfilled") {
          setSubscriptions(subscriptionsResult.value.data?.data || []);
        }

      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;

    let isMounted = true;

    axios
      .get(`${API_HOST}/feed`, {
        headers: getAuthHeaders(),
        params: { limit: 12, scope: feedScope },
      })
      .then((response) => {
        if (!isMounted) return;
        setFeedActivities(response.data?.data || []);
      })
      .catch((error) => {
        console.error("Error fetching feed:", error);
      })
      .finally(() => {
        if (isMounted) setFeedLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [feedScope, profileId]);

  const summary = useMemo(() => {
    const active = subscriptions.filter((item) => item.is_active !== false);
    const inactiveCount = subscriptions.length - active.length;
    const monthlyTotal = active.reduce((total, item) => total + getMonthlyPrice(item), 0);
    const upcoming = active
      .map((item) => ({
        ...item,
        daysUntil: getDaysUntil(item.trial_enabled ? item.trial_end_date : item.next_billing_date),
        nextDate: item.trial_enabled ? item.trial_end_date : item.next_billing_date,
      }))
      .filter((item) => item.daysUntil !== null && item.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0];

    const categoryMap = active.reduce((acc, item) => {
      const key = item.category || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({
        key,
        label: categoryLabels[key] || key,
        value,
      }));

    return {
      activeCount: active.length,
      inactiveCount,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      upcoming,
      topCategories,
    };
  }, [subscriptions]);

  const firstName = getFirstName(profile?.full_name);
  const upcomingLabel =
    summary.upcoming?.daysUntil === 0
      ? "ma"
      : summary.upcoming?.daysUntil === 1
        ? "holnap"
        : summary.upcoming
          ? `${summary.upcoming.daysUntil} napon belül`
          : "nincs közelgő";

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      {loading && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1 overflow-hidden bg-blue-100">
          <div className="h-full w-1/2 animate-[homeLoader_1.1s_ease-in-out_infinite] rounded-full bg-blue-600" />
        </div>
      )}

      <style>{`
        @keyframes homeLoader {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(220%); }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6">
        <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                <FiZap />
                Kezdőlap
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Szia, {firstName}. Nézzük, mi történt.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
                Egy letisztult feed ajánlásokkal, spórolási tippekkel és a legfontosabb
                pénzügyi jelzéseiddel.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
              <div className="rounded-3xl bg-slate-950 p-4 text-white">
                <div className="text-xs font-bold text-slate-300">Havi költés</div>
                <div className="mt-2 text-2xl font-black">{formatCurrency(summary.monthlyTotal)}</div>
              </div>
              <div className="rounded-3xl bg-blue-50 p-4 text-blue-700">
                <div className="text-xs font-bold text-blue-500">Aktív</div>
                <div className="mt-2 text-2xl font-black">{summary.activeCount} db</div>
              </div>
              <div className="rounded-3xl bg-orange-50 p-4 text-orange-700">
                <div className="text-xs font-bold text-orange-500">Következő</div>
                <div className="mt-2 truncate text-lg font-black">{upcomingLabel}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Feed</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    Válts a baráti és a nyilvános tartalmak között.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex rounded-2xl bg-slate-100 p-1">
                {feedTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleFeedScopeChange(tab.key)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                      feedScope === tab.key
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

            </div>

            {feedLoading ? (
              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-6 space-y-3">
                  <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                </div>
              </div>
            ) : feedActivities.length > 0 ? (
              <div className="grid gap-4">
                {feedActivities.map((activity) => (
                  <FeedActivityCard
                    key={activity.id}
                    activity={activity}
                    comments={commentsByActivity[activity.id] || []}
                    commentsOpen={Boolean(openComments[activity.id])}
                    commentDraft={commentDrafts[activity.id] || ""}
                    commentsLoading={Boolean(commentsLoading[activity.id])}
                    onLike={handleLike}
                    onSave={handleSave}
                    onToggleComments={handleToggleComments}
                    onCommentDraftChange={handleCommentDraftChange}
                    onSubmitComment={handleSubmitComment}
                  />
                ))}
              </div>
            ) : (
              <EmptyFeed />
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">
                  <FiClock />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-950">Ma fontos</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-500">
                    {summary.upcoming
                      ? `${summary.upcoming.name} következő fizetése: ${formatDate(summary.upcoming.nextDate)}.`
                      : "Nincs közeli fizetésed, ma nyugodtabb napod van."}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-slate-950">Leggyakoribb kategóriáid</div>
                  <div className="mt-1 text-sm text-slate-500">Rövid áttekintés a saját listádból.</div>
                </div>
                <FiActivityFallback />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {summary.topCategories.length > 0 ? (
                  summary.topCategories.map((category) => (
                    <span
                      key={category.key}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                    >
                      {category.label} · {category.value}
                    </span>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Még nincs kategorizált előfizetésed.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-black text-slate-950">Gyors műveletek</div>
              <div className="mt-4 space-y-3">
                <QuickAction
                  icon={<FiPlus />}
                  title="Új előfizetés"
                  text="Add hozzá a következő szolgáltatást."
                  onClick={() => {
                    window.location.href = "/subscriptions";
                  }}
                />
                <QuickAction
                  icon={<FiUsers />}
                  title="Profilom"
                  text="Barátok, ajánlások és aktivitás."
                  onClick={() => {
                    window.location.href = "/profile";
                  }}
                />
              </div>
            </div>
          </aside>
        </section>
      </div>

    </main>
  );
};

const FiActivityFallback = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
    <FiTrendingUp />
  </div>
);

export default HomeScreen;
