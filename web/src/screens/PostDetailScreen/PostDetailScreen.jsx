import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookmark,
  FiCheckCircle,
  FiMessageCircle,
  FiSend,
  FiStar,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { LuLightbulb } from "react-icons/lu";
import PageLoadingBar from "../../components/PageLoadingBar";

const API_HOST = import.meta.env.VITE_API_HOST;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const parseDate = (value) => {
  if (!value) return null;
  if (value._seconds) return new Date(value._seconds * 1000);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "most";

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (value) =>
  Math.round(Number(value) || 0).toLocaleString("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

const getProfilePath = (user) => `/${user?.username || user?.id || "profile"}`;

const categoryLabels = {
  streaming: "Streaming",
  work: "Munka",
  ai_tool: "AI tool",
  cloud: "Felhő",
  music: "Zene",
  productivity: "Produktivitás",
  mobile: "Mobil",
  bank: "Bank",
  gaming: "Játék",
  other: "Egyéb",
};

const activityMeta = {
  recommendation: {
    badge: "Ajánlott előfizetés",
    icon: <FiStar />,
    tone: "bg-blue-50 text-blue-600",
  },
  tip: {
    badge: "Spórolási tipp",
    icon: <LuLightbulb />,
    tone: "bg-orange-50 text-orange-600",
  },
  list: {
    badge: "Megosztott lista",
    icon: <FiBookmark />,
    tone: "bg-violet-50 text-violet-600",
  },
  cancelled_subscription: {
    badge: "Lemondott előfizetés",
    icon: <FiCheckCircle />,
    tone: "bg-emerald-50 text-emerald-600",
  },
  subscribed_subscription: {
    badge: "Új előfizetés",
    icon: <FiCheckCircle />,
    tone: "bg-emerald-50 text-emerald-600",
  },
  shared_subscription: {
    badge: "Közös előfizetés",
    icon: <FiUsers />,
    tone: "bg-cyan-50 text-cyan-600",
  },
  post: {
    badge: "Bejegyzés",
    icon: <FiMessageCircle />,
    tone: "bg-slate-100 text-slate-700",
  },
};

const getActivityMeta = (activity) => activityMeta[activity?.type] || activityMeta.post;

const getActivityTitle = (activity) =>
  activity?.title || activity?.subscription_name || activity?.body?.split("\n")[0] || "Bejegyzés";

const getActivityDescription = (activity) => {
  if (!activity?.body) return "";

  const title = getActivityTitle(activity);
  return activity.body === title ? "" : activity.body;
};

const PostDetailScreen = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
      setLoading(true);
      setError("");

      try {
        const [activityResponse, commentsResponse] = await Promise.all([
          axios.get(`${API_HOST}/profile-activities/show/${activityId}`, {
            headers: getAuthHeaders(),
          }),
          axios.get(`${API_HOST}/profile-activities/${activityId}/comments`, {
            headers: getAuthHeaders(),
          }),
        ]);

        if (!isMounted) return;

        setActivity(activityResponse.data?.data || null);
        setComments(commentsResponse.data?.data || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.error || "Nem sikerült betölteni a bejegyzést.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  const updateActivity = (updater) => {
    setActivity((current) => (current ? updater(current) : current));
  };

  const handleLike = async () => {
    if (!activity) return;

    const wasLiked = Boolean(activity.viewer_liked);
    updateActivity((current) => ({
      ...current,
      viewer_liked: !wasLiked,
      like_count: Math.max((Number(current.like_count) || 0) + (wasLiked ? -1 : 1), 0),
    }));

    try {
      const response = await axios.post(`${API_HOST}/profile-activities/${activity.id}/like`, null, {
        headers: getAuthHeaders(),
      });
      updateActivity((current) => ({ ...current, ...(response.data?.data || {}) }));
    } catch {
      updateActivity((current) => ({
        ...current,
        viewer_liked: wasLiked,
        like_count: Math.max((Number(current.like_count) || 0) + (wasLiked ? 1 : -1), 0),
      }));
    }
  };

  const handleSave = async () => {
    if (!activity) return;

    const wasSaved = Boolean(activity.viewer_saved);
    updateActivity((current) => ({ ...current, viewer_saved: !wasSaved }));

    try {
      const response = await axios.post(`${API_HOST}/profile-activities/${activity.id}/save`, null, {
        headers: getAuthHeaders(),
      });
      updateActivity((current) => ({ ...current, ...(response.data?.data || {}) }));
    } catch {
      updateActivity((current) => ({ ...current, viewer_saved: wasSaved }));
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    const body = commentDraft.trim();

    if (!body || !activity || submittingComment) return;

    setSubmittingComment(true);

    try {
      const response = await axios.post(
        `${API_HOST}/profile-activities/${activity.id}/comments`,
        { body },
        { headers: getAuthHeaders() }
      );

      setComments((current) => [...current, response.data?.data].filter(Boolean));
      setCommentDraft("");
      updateActivity((current) => ({
        ...current,
        comment_count: (Number(current.comment_count) || 0) + 1,
      }));
    } catch (err) {
      setError(err?.response?.data?.error || "Nem sikerült elküldeni a hozzászólást.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRefreshComments = async () => {
    if (!activity) return;

    setCommentsLoading(true);
    try {
      const response = await axios.get(`${API_HOST}/profile-activities/${activity.id}/comments`, {
        headers: getAuthHeaders(),
      });
      setComments(response.data?.data || []);
    } finally {
      setCommentsLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="sf-page-bg min-h-screen px-5 pb-16 pt-10">
        <PageLoadingBar />
        <div className="mx-auto max-w-[88rem]">
          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
            <div className="h-8 w-56 rounded-full bg-slate-100" />
            <div className="mt-8 h-72 rounded-[2rem] bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main className="sf-page-bg min-h-screen px-5 pb-16 pt-10">
        <div className="mx-auto max-w-[88rem]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:text-blue-600"
          >
            <FiArrowLeft />
            Vissza
          </button>
          <div className="mt-8 rounded-[2rem] border border-red-100 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-950">Nem található a bejegyzés</h1>
            <p className="mt-3 text-sm font-bold text-slate-500">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const meta = getActivityMeta(activity);
  const author = activity.author;

  return (
    <main className="sf-page-bg min-h-screen px-5 pb-16 pt-10 text-slate-950">
      <div className="mx-auto max-w-[88rem]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:text-blue-600"
        >
          <FiArrowLeft />
          Vissza
        </button>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-7 py-8 text-white md:px-10">
              <div className="flex flex-wrap items-center gap-4">
                <Link to={getProfilePath(author)} className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt={author.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <FiUser className="text-2xl" />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-black">{author?.full_name || "SpendFox felhasználó"}</div>
                    <div className="text-sm font-bold text-white/60">
                      @{author?.username || author?.id || "profil"} · {formatDate(activity.created_at)}
                    </div>
                  </div>
                </Link>
                <span className={`ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${meta.tone}`}>
                  {meta.icon}
                  {meta.badge}
                </span>
              </div>

              <h1 className="mt-9 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                {getActivityTitle(activity)}
              </h1>
              {getActivityDescription(activity) && (
                <p className="mt-5 max-w-3xl whitespace-pre-wrap break-words text-base font-medium leading-8 text-white/75">
                  {getActivityDescription(activity)}
                </p>
              )}
            </div>

            <div className="p-7 md:p-10">
              {activity.subscription_name && (
                <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
                        {activity.logo_url ? (
                          <img
                            src={activity.logo_url}
                            alt={activity.subscription_name}
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <FiBookmark className="text-2xl text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-2xl font-black text-slate-950">
                          {activity.subscription_name}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                          <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                            {categoryLabels[activity.category] || activity.category || "Egyéb"}
                          </span>
                          {activity.price !== null && activity.price !== undefined && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                              {Math.round(Number(activity.price) || 0).toLocaleString("hu-HU")} {activity.currency || "HUF"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {activity.price_huf !== null && activity.price_huf !== undefined && (
                      <div className="rounded-3xl bg-white px-6 py-4 text-right shadow-sm">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">HUF érték</div>
                        <div className="mt-1 text-2xl font-black text-slate-950">
                          {formatCurrency(activity.price_huf)}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {Array.isArray(activity.list_items) && activity.list_items.length > 0 && (
                <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-950">Megosztott lista</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                      {activity.list_items.length} elem
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activity.list_items.map((item) => (
                      <div key={`${activity.id}-${item.id || item.name}`} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                          {item.logo_url ? (
                            <img src={item.logo_url} alt={item.name} className="h-full w-full object-contain p-2" />
                          ) : (
                            <FiBookmark className="text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black text-slate-950">{item.name}</div>
                          <div className="text-xs font-bold text-slate-500">
                            {categoryLabels[item.category] || item.category || "Egyéb"}
                          </div>
                        </div>
                        {item.price_huf !== null && item.price_huf !== undefined && (
                          <div className="text-xs font-black text-slate-700">{formatCurrency(item.price_huf)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-5 text-sm font-black text-slate-500">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`inline-flex items-center gap-2 transition hover:text-blue-600 ${
                    activity.viewer_liked ? "text-blue-600" : ""
                  }`}
                >
                  <FiStar />
                  Hasznos {activity.like_count ? `(${activity.like_count})` : ""}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshComments}
                  className="inline-flex items-center gap-2 transition hover:text-blue-600"
                >
                  <FiMessageCircle />
                  Hozzászólás {activity.comment_count ? `(${activity.comment_count})` : ""}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`inline-flex items-center gap-2 transition hover:text-blue-600 ${
                    activity.viewer_saved ? "text-blue-600" : ""
                  }`}
                >
                  <FiBookmark />
                  {activity.viewer_saved ? "Mentve" : "Mentés"}
                </button>
              </div>
            </div>
          </article>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Beszélgetés</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Kérdezz rá, ajánlj alternatívát, vagy mentsd el későbbre.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-lg font-black text-slate-950">{activity.like_count || 0}</div>
                  <div className="text-xs font-bold text-slate-500">hasznos</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-lg font-black text-slate-950">{activity.comment_count || 0}</div>
                  <div className="text-xs font-bold text-slate-500">komment</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-lg font-black text-slate-950">{activity.save_count || 0}</div>
                  <div className="text-xs font-bold text-slate-500">mentés</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-950">Hozzászólások</h2>
            {commentsLoading && <span className="text-sm font-bold text-slate-400">Frissítés...</span>}
          </div>

          <form onSubmit={handleSubmitComment} className="mt-5 flex gap-3">
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              rows={2}
              placeholder="Írj hozzászólást..."
              className="min-h-[3.5rem] flex-1 resize-none rounded-3xl border border-slate-200 px-5 py-4 text-sm font-bold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            />
            <button
              type="submit"
              disabled={!commentDraft.trim() || submittingComment}
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiSend />
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
                      {comment.author?.avatar_url ? (
                        <img
                          src={comment.author.avatar_url}
                          alt={comment.author.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FiUser className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        {comment.author?.full_name || "SpendFox felhasználó"}
                      </div>
                      <div className="text-xs font-bold text-slate-400">{formatDate(comment.created_at)}</div>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                    {comment.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                Még nincs hozzászólás. Itt lehet az első érdemi beszélgetés.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PostDetailScreen;
