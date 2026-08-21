import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import { FiArrowLeft, FiSend, FiUser } from "react-icons/fi";
import { io } from "socket.io-client";

import { useAuth } from "../../auth/UseAuth";
import PageLoadingBar from "../../components/PageLoadingBar";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const getSocketHost = () => import.meta.env.VITE_API_HOST.replace(/\/api\/?$/, "");

const appendUniqueMessage = (currentMessages, newMessage) => {
  if (!newMessage) {
    return currentMessages;
  }

  const exists = currentMessages.some((message) => String(message.id) === String(newMessage.id));

  return exists ? currentMessages : [...currentMessages, newMessage];
};

const getProfilePath = (user, fallbackId) => `/${user?.username || fallbackId}`;

const formatMessageTime = (value) => {
  if (!value) return "";

  const date = value._seconds
    ? new Date(value._seconds * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MessageScreen = () => {
  const { userId } = useParams();
  const { profileId } = useAuth();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const participantName = participant?.full_name || participant?.username || participant?.email || "Barát";
  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => {
        const aTime = a.created_at?._seconds || 0;
        const bTime = b.created_at?._seconds || 0;
        return aTime - bTime;
      }),
    [messages]
  );

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_HOST}/messages/${userId}`, {
          headers: getAuthHeaders(),
        });

        if (!isMounted) return;

        setParticipant(response.data.data?.participant || null);
        setMessages(response.data.data?.messages || []);
        setError("");
      } catch (err) {
        if (!isMounted) return;

        setError(err.response?.data?.error || "Nem sikerült betölteni a beszélgetést.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token || !profileId || !userId) {
      return undefined;
    }

    const socket = io(getSocketHost(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("message:created", ({ message }) => {
      const isCurrentConversation =
        [String(message.sender_id), String(message.receiver_id)].includes(String(profileId)) &&
        [String(message.sender_id), String(message.receiver_id)].includes(String(userId));

      if (isCurrentConversation) {
        setMessages((currentMessages) => appendUniqueMessage(currentMessages, message));
      }
    });

    socket.on("connect_error", () => {
      setError("A valós idejű kapcsolat nem aktív. Az üzenetek küldése működik, de frissítés kellhet.");
    });

    return () => {
      socket.disconnect();
    };
  }, [profileId, userId]);

  const sendMessage = (event) => {
    event.preventDefault();

    const cleanBody = messageBody.trim();

    if (!cleanBody || sending) return;

    setSending(true);
    setError("");

    axios
      .post(
        `${import.meta.env.VITE_API_HOST}/messages/${userId}`,
        { body: cleanBody },
        { headers: getAuthHeaders() }
      )
      .then((response) => {
        const newMessage = response.data.data?.message;

        if (newMessage) {
          setMessages((currentMessages) => appendUniqueMessage(currentMessages, newMessage));
        }

        setMessageBody("");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Nem sikerült elküldeni az üzenetet.");
      })
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <div className="sf-page-bg min-h-screen px-5 pb-12 pt-10 text-slate-950">
      <PageLoadingBar show={loading} />
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            >
              <FiArrowLeft />
            </button>
            <Avatar
              image={participant?.avatar_url || undefined}
              label={!participant?.avatar_url ? participantName.charAt(0) : undefined}
              shape="circle"
              className="shrink-0 bg-blue-50 text-blue-600"
              style={{ width: "3rem", height: "3rem" }}
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-slate-950">{participantName}</h1>
              <p className="truncate text-sm text-slate-500">@{participant?.username || participant?.email || "felhasznalo"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(getProfilePath(participant, userId))}
            className="hidden items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:flex"
          >
            <FiUser />
            Profil
          </button>
        </div>

        <div className="min-h-[520px] bg-slate-50 px-6 py-6">
          {loading ? (
            <div className="flex h-96 items-center justify-center text-sm font-bold text-slate-400">
              Beszélgetés betöltése...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
                <FiSend />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">Indíts beszélgetést</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Írj egy rövid üzenetet {participantName} felé. Később ide jöhetnek értesítések, ajánlások és közös listák is.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMessages.map((message) => {
                const isMine = String(message.sender_id) === String(profileId);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-3xl px-5 py-3 shadow-sm ${
                        isMine
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md bg-white text-slate-900"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                        {message.body}
                      </div>
                      <div className={`mt-2 text-right text-[11px] ${isMine ? "text-blue-100" : "text-slate-400"}`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-100 bg-white p-5">
          <textarea
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            className="min-h-14 max-h-40 flex-1 resize-none rounded-2xl border border-slate-200 px-5 py-4 text-sm leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            placeholder="Írj üzenetet..."
            rows={1}
          />
          <button
            type="submit"
            disabled={sending || !messageBody.trim()}
            className="flex h-14 min-h-14 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <FiSend />
            Küldés
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageScreen;
