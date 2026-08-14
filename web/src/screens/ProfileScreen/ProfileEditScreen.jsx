import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import { FiArrowLeft, FiCheck, FiEye, FiGlobe, FiImage, FiLock, FiMapPin, FiUser } from "react-icons/fi";

import { useAuth } from "../../auth/UseAuth";

const visibilityOptions = [
  {
    id: "private",
    label: "Privát",
    description: "Csak te látod a profilod részleteit.",
    icon: <FiLock />,
  },
  {
    id: "friends",
    label: "Barátok",
    description: "Csak az elfogadott barátaid látják.",
    icon: <FiUser />,
  },
  {
    id: "public",
    label: "Nyilvános",
    description: "Megosztható SpendFox profilként is látható.",
    icon: <FiGlobe />,
  },
];

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeUsername = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

const defaultNotificationSettings = {
  feed_auto_share: {
    subscription_created: false,
    shared_subscription_created: false,
    subscription_cancelled: false,
  },
};

const mergeNotificationSettings = (settings = {}) => ({
  ...defaultNotificationSettings,
  ...settings,
  feed_auto_share: {
    ...defaultNotificationSettings.feed_auto_share,
    ...(settings.feed_auto_share || {}),
  },
});

const ProfileEditScreen = () => {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    avatar_url: "",
    bio: "",
    location: "",
    profile_slug: "",
    public_profile_enabled: false,
    profile_visibility: "private",
    notification_settings: defaultNotificationSettings,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    // Profile data arrives asynchronously from auth context, then hydrates the edit form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      full_name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
      avatar_url: user.avatar_url || "",
      bio: user.bio || "",
      location: user.location || "",
      profile_slug: user.profile_slug || slugify(user.username || user.full_name),
      public_profile_enabled: Boolean(user.public_profile_enabled),
      profile_visibility: user.profile_visibility || "private",
      notification_settings: mergeNotificationSettings(user.notification_settings),
    });
  }, [user]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "username" && !previous.profile_slug
        ? { profile_slug: slugify(value) }
        : {}),
    }));
  };

  const updateFeedAutoShare = (field, value) => {
    setForm((previous) => {
      const notificationSettings = mergeNotificationSettings(previous.notification_settings);

      return {
        ...previous,
        notification_settings: {
          ...notificationSettings,
          feed_auto_share: {
            ...notificationSettings.feed_auto_share,
            [field]: value,
          },
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await axios.patch(
        import.meta.env.VITE_API_HOST + "/profile",
        {
          ...form,
          avatar_url: form.avatar_url || null,
          profile_slug: slugify(form.profile_slug || form.username),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const profileResponse = await fetchProfile();
      const updatedUser = profileResponse?.data?.data;
      navigate(`/${updatedUser?.username || form.username || "profile"}`);
    } catch (err) {
      setError(err.response?.data?.error || "Nem sikerült menteni a profilt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-5 pb-12 pt-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(`/${user?.username || "profile"}`)}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <FiArrowLeft />
          Vissza a profilra
        </button>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.24),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_60%,#020617_100%)]" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.35em] text-blue-400">
                  Profil szerkesztése
                </div>
                <h1 className="mt-3 text-4xl font-black tracking-tight">
                  Tedd személyessé a SpendFox profilod
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
                  Ezek az adatok később a publikus profilon, ajánlásoknál és barát funkcióknál is megjelenhetnek.
                </p>
              </div>
              <Avatar
                image={form.avatar_url || undefined}
                label={!form.avatar_url ? form.full_name?.charAt(0) : undefined}
                style={{ width: "6rem", height: "6rem" }}
                shape="circle"
                className="border-4 border-white shadow-xl"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-8 p-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Teljes név</span>
                  <input
                    value={form.full_name}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
                    placeholder="Nyiri Zoltán"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Felhasználónév</span>
                  <input
                    value={form.username}
                    onChange={(event) => updateField("username", normalizeUsername(event.target.value))}
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
                    placeholder="znyiri"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">E-mail cím</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Bemutatkozás</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  rows={5}
                  maxLength={260}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-relaxed outline-none transition focus:border-blue-500"
                  placeholder="Írj pár mondatot magadról..."
                />
                <span className="mt-2 block text-xs text-slate-400">
                  {form.bio.length}/260 karakter
                </span>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Hely</span>
                  <div className="relative mt-2">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.location}
                      onChange={(event) => updateField("location", event.target.value)}
                      className="h-13 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500"
                      placeholder="Budapest, Magyarország"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Profil link</span>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      spendfox.com/
                    </span>
                    <input
                      value={form.profile_slug}
                      onChange={(event) => updateField("profile_slug", event.target.value)}
                      className="h-13 w-full rounded-2xl border border-slate-200 pl-32 pr-4 text-sm outline-none transition focus:border-blue-500"
                      placeholder="znyiri"
                    />
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Avatar kép URL</span>
                <div className="relative mt-2">
                  <FiImage className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.avatar_url}
                    onChange={(event) => updateField("avatar_url", event.target.value)}
                    className="h-13 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </label>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <FiEye className="text-xl text-blue-600" />
                  <div className="font-black text-slate-950">Láthatóság</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Beállíthatod, mennyi profiladatot lássanak mások.
                </p>

                <div className="mt-5 space-y-3">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updateField("profile_visibility", option.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        form.profile_visibility === option.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-600">{option.icon}</span>
                          <span className="font-bold text-slate-900">{option.label}</span>
                        </div>
                        {form.profile_visibility === option.id && (
                          <FiCheck className="text-blue-600" />
                        )}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <div className="font-black text-slate-950">Nyilvános profil</div>
                  <div className="mt-1 text-sm text-slate-500">
                    A profil link külön is megosztható legyen.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.public_profile_enabled}
                  onChange={(event) => updateField("public_profile_enabled", event.target.checked)}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="font-black text-slate-950">Automatikus feed megosztás</div>
                <div className="mt-1 text-sm leading-relaxed text-slate-500">
                  Csak akkor jelenik meg aktivitás a feedben, ha ezt külön engedélyezed.
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    {
                      id: "subscription_created",
                      title: "Új előfizetés",
                      text: "Megosztás, amikor új előfizetést adsz hozzá.",
                    },
                    {
                      id: "shared_subscription_created",
                      title: "Közös előfizetés",
                      text: "Megosztás, amikor közös előfizetést hozol létre.",
                    },
                    {
                      id: "subscription_cancelled",
                      title: "Lemondás",
                      text: "Megosztás, amikor lemondasz vagy törölsz egy aktív előfizetést.",
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    >
                      <span>
                        <span className="block text-sm font-black text-slate-950">{item.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.text}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(form.notification_settings?.feed_auto_share?.[item.id])}
                        onChange={(event) => updateFeedAutoShare(item.id, event.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Mentés..." : "Profil mentése"}
              </button>
            </aside>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditScreen;
