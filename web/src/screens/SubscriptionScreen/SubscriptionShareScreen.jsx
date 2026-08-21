import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCopy,
  FiMessageCircle,
  FiGrid,
  FiSend,
  FiShare2,
  FiTrash2,
  FiUserPlus,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../../auth/UseAuth";
import PageLoadingBar from "../../components/PageLoadingBar";
import SubscriptionLogo from "../../components/SubscriptionLogo";

const API_HOST = import.meta.env.VITE_API_HOST;

const BILLING_LABELS = {
  monthly: "Havi",
  yearly: "Éves",
  weekly: "Heti",
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

const formatDate = (value) => {
  if (!value) return "-";

  const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatTime = (value) => {
  if (!value) return "";

  const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getParticipantName = (participant) =>
  participant?.user?.full_name ||
  participant?.full_name ||
  participant?.user?.username ||
  participant?.username ||
  participant?.user?.email ||
  participant?.email ||
  "Résztvevő";

const getUserName = (user) =>
  user?.full_name || user?.username || user?.email || "Ismeretlen";

const getFriendUser = (friendship) => friendship.friend || friendship.user || friendship;

const getSettlementLabel = (status) =>
  status === "settled" ? "Rendezve" : "Rendezetlen";

const SubscriptionShareScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profileId } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [role, setRole] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [inviteSharePrice, setInviteSharePrice] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copyState, setCopyState] = useState("");

  const participants = useMemo(
    () => subscription?.participants || [],
    [subscription]
  );
  const acceptedParticipants = participants.filter(
    (participant) => participant.status === "accepted" || participant.is_owner
  );
  const settleableParticipants = acceptedParticipants.filter(
    (participant) => !participant.is_owner
  );
  const settledParticipants = settleableParticipants.filter(
    (participant) => participant.settlement_status === "settled"
  );
  const isOwner = role === "owner" || String(subscription?.user_id) === String(profileId);
  const availableFriends = friends
    .map(getFriendUser)
    .filter(Boolean)
    .filter((friend) => {
      const alreadyParticipant = participants.some(
        (participant) => String(participant.user_id) === String(friend.id)
      );

      return !alreadyParticipant && String(friend.id) !== String(profileId);
    });

  const loadOverview = useCallback(async () => {
    const response = await axios.get(`${API_HOST}/subscriptions/${id}/share/overview`, {
      headers: authHeaders(),
    });

    setSubscription(response.data.data?.subscription || null);
    setRole(response.data.data?.role || null);
  }, [id]);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setMessagesLoading(true);
    }

    try {
      const response = await axios.get(`${API_HOST}/subscriptions/${id}/share/messages`, {
        headers: authHeaders(),
      });

      setMessages(response.data.data || []);
    } finally {
      if (!silent) {
        setMessagesLoading(false);
      }
    }
  }, [id]);

  const loadFriends = useCallback(async () => {
    const response = await axios.get(`${API_HOST}/friends`, {
      headers: authHeaders(),
    });

    setFriends(response.data.data || []);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const requests = [loadOverview(), loadMessages()];

        if (profileId) {
          requests.push(loadFriends());
        }

        await Promise.all(requests);
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.error || "Nem sikerült betölteni a közös előfizetést.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, loadFriends, loadMessages, loadOverview, profileId]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadMessages({ silent: true }).catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, [id, loadMessages]);

  const inviteFriend = async (event) => {
    event.preventDefault();

    if (!selectedFriendId || saving) return;

    setSaving(true);
    setError("");

    try {
      await axios.post(
        `${API_HOST}/subscriptions/${id}/share/invite`,
        {
          receiver_id: selectedFriendId,
          share_price_huf: inviteSharePrice === "" ? undefined : Number(inviteSharePrice),
        },
        { headers: authHeaders() }
      );
      setSelectedFriendId("");
      setInviteSharePrice("");
      await Promise.all([loadOverview(), loadFriends()]);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült elküldeni a meghívót.");
    } finally {
      setSaving(false);
    }
  };

  const updateParticipantShare = async (participantUserId, value) => {
    setSaving(true);
    setError("");

    try {
      await axios.patch(
        `${API_HOST}/subscriptions/${id}/share/participants/${participantUserId}`,
        { share_price_huf: value === "" ? null : Number(value) },
        { headers: authHeaders() }
      );
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült módosítani a részösszeget.");
    } finally {
      setSaving(false);
    }
  };

  const updateParticipantSettlement = async (participantUserId, settlementStatus) => {
    setSaving(true);
    setError("");

    try {
      await axios.patch(
        `${API_HOST}/subscriptions/${id}/share/participants/${participantUserId}`,
        { settlement_status: settlementStatus },
        { headers: authHeaders() }
      );
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült módosítani az elszámolási állapotot.");
    } finally {
      setSaving(false);
    }
  };

  const removeParticipant = async (participantUserId) => {
    if (!window.confirm("Biztosan eltávolítod ezt a résztvevőt?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await axios.delete(
        `${API_HOST}/subscriptions/${id}/share/participants/${participantUserId}`,
        { headers: authHeaders() }
      );
      await Promise.all([loadOverview(), loadFriends()]);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült eltávolítani a résztvevőt.");
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    const cleanBody = messageBody.trim();

    if (!cleanBody || saving) return;

    setSaving(true);
    setError("");

    try {
      await axios.post(
        `${API_HOST}/subscriptions/${id}/share/messages`,
        { body: cleanBody },
        { headers: authHeaders() }
      );
      setMessageBody("");
      await loadMessages({ silent: true });
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült elküldeni az üzenetet.");
    } finally {
      setSaving(false);
    }
  };

  const createInviteLink = async () => {
    if (inviteLoading) return;

    setInviteLoading(true);
    setError("");
    setCopyState("");

    try {
      const response = await axios.post(
        `${API_HOST}/subscriptions/${id}/share/link`,
        null,
        { headers: authHeaders() }
      );
      const token = response.data.data?.token;

      if (!token) {
        throw new Error("Missing invite token");
      }

      const deepLink = `spendfox://subscription-share/${token}`;
      const webUrl = `${window.location.origin}/subscription-share/${token}`;

      setInviteLink({
        token,
        deepLink,
        webUrl,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(deepLink)}`,
      });
      setInviteModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült létrehozni a QR meghívót.");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink?.deepLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink.deepLink);
      setCopyState("App link másolva.");
    } catch {
      setCopyState("Nem sikerült automatikusan másolni.");
    }
  };

  const shareInviteLink = async () => {
    if (!inviteLink?.deepLink) return;

    if (navigator.share) {
      await navigator.share({
        title: "SpendFox közös előfizetés meghívó",
        text: `Csatlakozz ehhez a SpendFox közös előfizetéshez az appban: ${inviteLink.deepLink}`,
        url: inviteLink.deepLink,
      });
      return;
    }

    await copyInviteLink();
  };

  if (loading) {
    return (
      <div className="sf-page-bg min-h-screen px-5 py-16">
        <PageLoadingBar />
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="p-10 text-sm font-bold text-slate-500">
            Közös előfizetés betöltése...
          </div>
        </div>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="sf-page-bg min-h-screen px-5 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-red-50 p-8 text-red-700">
          <div className="text-xl font-black">Nem elérhető</div>
          <p className="mt-2 text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/subscriptions")}
            className="mt-6 cursor-pointer rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
          >
            Vissza az előfizetésekhez
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="sf-page-bg min-h-screen px-5 pb-16 pt-10 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/subscriptions")}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <FiArrowLeft />
          Vissza az előfizetésekhez
        </button>

        {error && (
          <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
                Közös előfizetés
              </div>
              <div className="mt-5 max-w-xl">
                <SubscriptionLogo
                  logoUrl={subscription?.logo_url}
                  name={subscription?.name}
                />
              </div>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                Itt egy helyen látjátok, ki mennyit fizet, mikor jön a következő levonás,
                és meg tudjátok beszélni a közös előfizetés részleteit.
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={createInviteLink}
                  disabled={inviteLoading}
                  className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <FiGrid />
                  {inviteLoading ? "QR készül..." : "QR meghívó"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-sky-500 p-5 text-white shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                  Saját részed
                </div>
                <div className="mt-3 text-3xl font-black">
                  {formatMoney(subscription?.my_share_price_huf)}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Teljes ár
                </div>
                <div className="mt-3 text-3xl font-black text-slate-950">
                  {formatMoney(subscription?.price_huf)}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Következő fizetés
                </div>
                <div className="mt-3 text-xl font-black text-slate-950">
                  {formatDate(subscription?.next_billing_date)}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Résztvevők
                </div>
                <div className="mt-3 text-xl font-black text-slate-950">
                  {acceptedParticipants.length || 1} fő
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">Fizetési megosztás</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Itt állítható be, hogy ki mennyit fizet bele a közös előfizetésbe.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                  {BILLING_LABELS[subscription?.billing_cycle] || subscription?.billing_cycle || "-"}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Elszámolás állapota
                </div>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {settledParticipants.length}/{settleableParticipants.length} rendezve
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Ez csak könyvelés, tényleges fizetés nem történik az oldalon.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {participants.map((participant) => {
                  const isParticipantOwner = participant.is_owner;

                  return (
                    <div
                      key={`${participant.user_id}-${participant.status}`}
                      className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-950">
                            {getParticipantName(participant)}
                          </div>
                          <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            {isParticipantOwner
                              ? "Tulajdonos"
                              : participant.status === "pending"
                                ? "Meghívva"
                                : "Résztvevő"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-right">
                          {!isParticipantOwner && (
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                participant.settlement_status === "settled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {getSettlementLabel(participant.settlement_status)}
                            </div>
                          )}
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            Rész
                          </div>
                          <div className="font-black text-slate-950">
                            {formatMoney(participant.share_price_huf)}
                          </div>
                        </div>
                      </div>

                      {!isParticipantOwner && participant.status === "accepted" && (isOwner || String(participant.user_id) === String(profileId)) && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => updateParticipantSettlement(participant.user_id, "pending")}
                            className={`cursor-pointer rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed ${
                              participant.settlement_status !== "settled"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-white text-slate-500 hover:bg-slate-100"
                            }`}
                            disabled={saving}
                          >
                            Rendezetlen
                          </button>
                          <button
                            type="button"
                            onClick={() => updateParticipantSettlement(participant.user_id, "settled")}
                            className={`cursor-pointer rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed ${
                              participant.settlement_status === "settled"
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-slate-500 hover:bg-slate-100"
                            }`}
                            disabled={saving}
                          >
                            Rendezve
                          </button>
                        </div>
                      )}

                      {isOwner && !isParticipantOwner && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            defaultValue={
                              participant.has_custom_share
                                ? Number(participant.custom_share_price_huf || 0).toFixed(0)
                                : ""
                            }
                            onBlur={(event) =>
                              updateParticipantShare(participant.user_id, event.target.value)
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-500"
                            placeholder="Automatikus osztás"
                            disabled={saving}
                          />
                          <button
                            type="button"
                            onClick={() => removeParticipant(participant.user_id)}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed"
                            disabled={saving}
                          >
                            <FiTrash2 />
                            {participant.status === "pending" ? "Visszavonás" : "Eltávolítás"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isOwner && (
              <form
                onSubmit={inviteFriend}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FiUserPlus />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Barát meghívása</h2>
                    <p className="text-sm text-slate-500">
                      Csak olyan felhasználót hívhatsz meg, aki már a barátod.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                  <select
                    value={selectedFriendId}
                    onChange={(event) => setSelectedFriendId(event.target.value)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-500"
                  >
                    <option value="">Válassz barátot</option>
                    {availableFriends.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {getUserName(friend)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={inviteSharePrice}
                    onChange={(event) => setInviteSharePrice(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-blue-500"
                    placeholder="Fix Ft"
                  />
                  <button
                    type="submit"
                    disabled={!selectedFriendId || saving}
                    className="cursor-pointer rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Meghívás
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-sky-100 bg-sky-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-950">QR meghívó</div>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        Linkkel vagy QR-kóddal is csatlakozhatnak a közös előfizetéshez.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={createInviteLink}
                      disabled={inviteLoading}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FiGrid />
                      {inviteLoading ? "Készül..." : "QR megnyitása"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          <section className="flex min-h-[660px] flex-col rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FiMessageCircle />
                </div>
                <div>
                  <h2 className="text-xl font-black">Közös chat</h2>
                  <p className="text-sm text-slate-500">
                    Megbeszélések, emlékeztetők, részletek.
                  </p>
                </div>
              </div>
              {messagesLoading && (
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Frissítés...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
                    <FiCheckCircle />
                  </div>
                  <h3 className="mt-5 text-2xl font-black">Még nincs üzenet</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Írj egy rövid üzenetet a többieknek, például hogy ki mikor fizet.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = String(message.sender_id) === String(profileId);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-3xl px-5 py-3 shadow-sm ${
                          isMine
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md bg-white text-slate-950"
                        }`}
                      >
                        {!isMine && (
                          <div className="mb-1 text-xs font-black text-blue-600">
                            {getUserName(message.sender)}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                          {message.body}
                        </div>
                        <div
                          className={`mt-2 text-right text-[11px] ${
                            isMine ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-100 p-5">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                className="max-h-36 min-h-14 flex-1 resize-none rounded-2xl border border-slate-200 px-5 py-4 text-sm leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                placeholder="Írj üzenetet..."
                rows={1}
              />
              <button
                type="submit"
                disabled={!messageBody.trim() || saving}
                className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <FiSend />
                Küldés
              </button>
            </form>
          </section>
        </div>
      </div>

      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-slate-100 p-6">
              <div>
                <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-600">
                  QR meghívó
                </div>
                <h2 className="mt-4 text-3xl font-black text-slate-950">
                  Csatlakozás közös előfizetéshez
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  Olvastasd be telefonról a QR-kódot. A SpendFox app nyílik meg, és bejelentkezés után a másik fél automatikusan a csatlakozó oldalra kerül.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Bezárás"
              >
                <FiX />
              </button>
            </div>

            <div className="p-6">
              {inviteLink?.qrUrl && (
                <div className="flex flex-col items-center rounded-[2rem] bg-slate-50 p-6">
                  <img
                    src={inviteLink.qrUrl}
                    alt="Közös előfizetés QR meghívó"
                    className="h-72 w-72 rounded-3xl bg-white p-3 shadow-sm"
                  />
                  <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 break-all">
                    {inviteLink.deepLink}
                  </div>
                  <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-xs font-bold text-slate-500 break-all">
                    Webes tartalék link: {inviteLink.webUrl}
                  </div>
                </div>
              )}

              {copyState && (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  {copyState}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                >
                  <FiCopy />
                  App link másolása
                </button>
                <button
                  type="button"
                  onClick={shareInviteLink}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-500"
                >
                  <FiShare2 />
                  Megosztás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SubscriptionShareScreen;
