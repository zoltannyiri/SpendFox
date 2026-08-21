import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiLoader, FiUsers } from "react-icons/fi";

import SubscriptionLogo from "../../components/SubscriptionLogo";

const API_HOST = import.meta.env.VITE_API_HOST;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

const getOwnerName = (owner) =>
  owner?.full_name || owner?.username || owner?.email || "Egy ismerősöd";

const getBillingCycleLabel = (value) => {
  if (value === "monthly") return "Havi";
  if (value === "yearly") return "Éves";
  if (value === "weekly") return "Heti";

  return "Ciklus";
};

const SubscriptionJoinScreen = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError("Hiányzó meghívó token.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_HOST}/subscriptions/share-links/${token}`, {
        headers: authHeaders(),
      });

      setPreview(response.data.data || null);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült betölteni a meghívót.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPreview();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  const joinShare = async () => {
    if (!token || joining) return;

    if (preview?.already_joined && preview?.subscription?.id) {
      navigate(`/subscriptions/${preview.subscription.id}/share`);
      return;
    }

    setJoining(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_HOST}/subscriptions/share-links/${token}/join`,
        null,
        { headers: authHeaders() }
      );
      const subscription = response.data.data?.subscription;
      const subscriptionId = subscription?.id || preview?.subscription?.id;

      if (!subscriptionId) {
        throw new Error("Missing subscription id");
      }

      navigate(`/subscriptions/${subscriptionId}/share`);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült csatlakozni.");
    } finally {
      setJoining(false);
    }
  };

  const subscription = preview?.subscription;
  const owner = preview?.owner;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/subscriptions")}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <FiArrowLeft />
          Vissza az előfizetésekhez
        </button>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 p-8">
            <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-600 shadow-sm">
              SpendFox meghívó
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
              Közös előfizetés csatlakozás
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              Ha elfogadod, az előfizetés bekerül a közös előfizetéseid közé, és eléred a résztvevőket, státuszokat és a közös chatet.
            </p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <FiLoader className="animate-spin text-3xl text-blue-600" />
                <div className="mt-4 text-sm font-black text-slate-500">
                  Meghívó betöltése...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
                <div className="text-lg font-black">Nem elérhető</div>
                <p className="mt-2 text-sm font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={loadPreview}
                  className="mt-5 cursor-pointer rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500"
                >
                  Újrapróbálom
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-[2rem] bg-slate-50 p-5">
                  <SubscriptionLogo
                    logoUrl={subscription?.logo_url}
                    name={subscription?.name}
                  />
                  <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-600">
                    {getOwnerName(owner)} meghívott, hogy közösen kezeljétek ezt az előfizetést.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Összeg
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-950">
                        {formatMoney(subscription?.price_huf)}
                      </div>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Ciklus
                      </div>
                      <div className="mt-2 text-2xl font-black text-slate-950">
                        {getBillingCycleLabel(subscription?.billing_cycle)}
                      </div>
                    </div>
                  </div>
                </div>

                {preview?.already_joined && (
                  <div className="mt-5 flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
                    <FiCheckCircle />
                    Már csatlakoztál ehhez a közös előfizetéshez.
                  </div>
                )}

                <button
                  type="button"
                  onClick={joinShare}
                  disabled={joining}
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {joining ? <FiLoader className="animate-spin" /> : <FiUsers />}
                  {preview?.already_joined ? "Közös oldal megnyitása" : "Csatlakozás"}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default SubscriptionJoinScreen;
