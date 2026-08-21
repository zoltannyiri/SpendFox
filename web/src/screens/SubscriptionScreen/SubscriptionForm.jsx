import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/UseAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Field } from 'react-final-form';
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {InputNumber} from "primereact/inputnumber";
import {Dropdown} from "primereact/dropdown";
import {Calendar} from "primereact/calendar";
import { addLocale, locale } from 'primereact/api';
import {Checkbox} from "primereact/checkbox";
import {InputSwitch} from "primereact/inputswitch";
import PageLoadingBar from '../../components/PageLoadingBar';



const billingCycles = [
  { id: 'monthly', name: 'Havi' },
  { id: 'weekly', name: 'Heti' },
  { id: 'yearly', name: 'Éves' },
];

const categoryMeta = [
  { label: 'Streaming', value: 'streaming', color: '#0ca9f2' },
  { label: 'Munka', value: 'work', color: '#111111' },
  { label: 'AI tool', value: 'ai-tool', color: '#7c3aed' },
  { label: 'Tárhely', value: 'hosting', color: '#f97316' },
  { label: 'Mobil', value: 'mobile', color: '#10b981' },
  { label: 'Bank', value: 'bank', color: '#64748b' },
  { label: 'Játék', value: 'gaming', color: '#ef4444' },
  { label: 'Egyéb', value: 'other', color: '#f59e0b' }
];

const isActive = [
  { label: 'Aktív', value: true },
  { label: 'Inaktív', value: false }
]


const SubscriptionForm = ({ onSuccess, onClose, subscriptionId }) => {
  const { profileId } = useAuth();
  // const [subscriptionId, setSubscriptionId] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(subscriptionId));
  const [formData, setFormData] = useState({});
  const [currency, setCurrency] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedShareUserIds, setSelectedShareUserIds] = useState([]);
  const [shareMessage, setShareMessage] = useState("");
  const [isNextBillingDateDisabled, setIsNextBillingDateDisabled] = useState(true);
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };
  const changeNextBillingDateState=()=>{
    setIsNextBillingDateDisabled(!isNextBillingDateDisabled);
  }
  // const [nextBillingDate, setNextBillingDate] = useState(
  //   (subscriptionId?.next_billing_date || '')
  // );

  // const CATEGORY_META = [{
  //   label: 'Streaming', value: 'streaming', color: '#0ca9f2'
  // }, {
  //   label: 'Munka', value: 'work', color: '#111111'
  // }, {
  //   label: 'AI tool', value: 'ai-tool', color: '#7c3aed'
  // }, {
  //   label: 'Tárhely', value: 'hosting', color: '#f97316'
  // }, {
  //   label: 'Mobil', value: 'mobile', color: '#10b981'
  // }, {
  //   label: 'Bank', value: 'bank', color: '#64748b'
  // }, {
  //   label: 'Játék', value: 'gaming', color: '#ef4444'
  // }, {
  //   label: 'Egyéb', value: 'other', color: '#f59e0b'
  // }];

  addLocale('hu', {
    firstDayOfWeek: 1, // Hétfő az első nap
    dayNames: ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'],
    dayNamesShort: ['Vas', 'Hét', 'Kedd', 'Sze', 'Csüt', 'Pén', 'Szo'],
    dayNamesMin: ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'],
    monthNames: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szept', 'Okt', 'Nov', 'Dec'],
    today: 'Ma',
    clear: 'Törlés'
  });
  
  const formatDateToLocalISO = (dateValue) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const syncShareInvites = async (savedSubscriptionId, isShared) => {
    if (!isShared || selectedShareUserIds.length === 0) {
      return;
    }

    await Promise.all(
      selectedShareUserIds.map((receiverId) =>
        axios.post(
          import.meta.env.VITE_API_HOST + `/subscriptions/${savedSubscriptionId}/share/invite`,
          { receiver_id: receiverId },
          {
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
          }
        )
      )
    );
  };

  const toggleShareUser = (userId) => {
    const normalizedId = String(userId);

    setSelectedShareUserIds((currentIds) =>
      currentIds.includes(normalizedId)
        ? currentIds.filter((id) => id !== normalizedId)
        : [...currentIds, normalizedId]
    );
  };

  const onSubmit = (data) => {
    setLoading(true);
    setShareMessage("");
    if (subscriptionId) {
      const payload = {
        ...data,
        start_date: formatDateToLocalISO(data.start_date), 
        user_id: profileId
      }
      axios.patch(import.meta.env.VITE_API_HOST + `/subscriptions/${subscriptionId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      })
        .then(async (response) => {
          const savedSubscriptionId = response.data.data.id;
          await syncShareInvites(savedSubscriptionId, data.is_shared);
          if (data.is_shared && selectedShareUserIds.length > 0) {
            setShareMessage("A megosztási meghívók elküldve.");
          }
          if (onSuccess) {
            onSuccess();
          }
          if (onClose) {
            onClose();
          }
          setLoading(false);
        })
        .catch(error => {
          console.log("Error updating subscription:", error);
          setLoading(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      axios.post(import.meta.env.VITE_API_HOST + `/subscriptions`, { ...data, user_id: profileId, start_date: formatDateToLocalISO(data.start_date)}, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      })
        .then(async (response) => {
          const savedSubscriptionId = response.data.data.id;
          await syncShareInvites(savedSubscriptionId, data.is_shared);
          if (data.is_shared && selectedShareUserIds.length > 0) {
            setShareMessage("A megosztási meghívók elküldve.");
          }
          if (onSuccess) {
            onSuccess();
          }
          if (onClose) {
            onClose();
          }
          setLoading(false);
        })
        .catch(error => {
          setLoading(false);
          console.log("Error creating subscription:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_HOST + `/dictionary/currency`)
      .then((response) => {
        setCurrency(response.data.data);
      })
      .catch(error => {
        console.log("Error fetching currency data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_HOST + `/friends`, {
      headers: authHeaders,
    })
      .then((response) => {
        setFriends(response.data?.data || []);
      })
      .catch(error => {
        console.log("Error fetching friends:", error);
      });
  }, []);

  useEffect(() => {
    if (!subscriptionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axios.get(import.meta.env.VITE_API_HOST + `/subscriptions/${subscriptionId}`)
      .then((response) => {
        const subscription = response.data.data;
        setFormData(subscription);
        setSelectedShareUserIds(
          (subscription.participants || [])
            .filter((participant) => !participant.is_owner)
            .map((participant) => String(participant.user_id))
        );
      })
      .catch(error => {
        console.log("Error fetching subscription data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [subscriptionId]);

  return (
    <div className="ml-10 mr-10">
      <PageLoadingBar show={loading} />
      <div className="font-bold text-2xl text-black">
        {subscriptionId ? "Előfizetés szerkesztése" : "Új előfizetés hozzáadása"}
      </div>
      <Form onSubmit={onSubmit} initialValues={formData} render={({ handleSubmit, values }) => (
        <form onSubmit={handleSubmit} className="p-fluid mt-10">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="name" render={({ input, meta }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="name" className="block mb-2">Előfizetés neve</label>
                  <span className="p-d-block">
                    <InputText id="name" {...input}
                                // onChange={(e) => {
                                //   setFormData({
                                //     ...formData,
                                //     name: e.target.value
                                //   })
                                //   setNewFormData({
                                //     ...newFormData,
                                //     name: e.target.value
                                //   })
                                // })
                                // value={formData.name || ''}
                                // value={subscriptionId && subscriptionId.name ? subscriptionId.name : ''}
                                placeholder="Pl. Netflix" />
                  </span>
                </div>
              )} />
            </div>

            <div className="md:col-span-10">
              <Field name="category" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="category" className="block mb-2">Kategória</label>
                  <span className="p-d-block">
                    <Dropdown id="category" 
                              {...input} 
                              options={categoryMeta} 
                              optionLabel="label" 
                              optionValue="value" 
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz kategóriát" />
                  </span>
                </div>
              )} />
            </div>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-10 gap-4">
            <div className="md:col-span-5">
              <Field name="price" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="price" className="block mb-2">Összeg</label>
                  <span className="p-d-block">
                    <InputNumber id="price" {...input}
                                // onChange={(e) => {
                                //   setFormData({
                                //     ...formData,
                                //     name: e.target.value
                                //   })
                                //   setNewFormData({
                                //     ...newFormData,
                                //     name: e.target.value
                                //   })
                                // })
                                // value={formData.name || ''}
                                locale="hu-HU"
                                onChange={(e) => {
                                  input.onChange(e.value);
                                }}
                                placeholder="Pl. 2990" />
                  </span>
                </div>
              )} />
            </div>

            <div className="md:col-span-5 mb-5">
              <Field name="currency" render={({ input, meta }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="currency" className="block mb-2">Valuta</label>
                  <span className="p-d-block">
                    <Dropdown id="currency" 
                              {...input} 
                              options={currency} 
                              optionLabel="name" 
                              optionValue="code" 
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz valutát" />
                  </span>
                </div>
              )} />
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="billing_cycle" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="billing_cycle" className="block mb-2">Számlázási ciklus</label>
                  <span className="p-d-block">
                    <Dropdown id="billing_cycle" 
                              {...input} 
                              options={billingCycles} 
                              optionLabel="name" 
                              optionValue="id" 
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz számlázási ciklust" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="start_date" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="start_date" className="block mb-2">Kezdő nap</label>
                  <span className="p-d-block">
                    <Calendar id="start_date" 
                              {...input} 
                              value={input.value ? new Date(input.value) : null}
                              showIcon={true}
                              locale="hu"
                              dateFormat="yy-mm-dd"
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz kezdő napot" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="next_billing_date" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="next_billing_date" className="mb-2"><div className="text-black ">
                      Következő fizetés dátuma
                    </div>
                    <div className="text-sm text-gray-400">
                      Csak akkor módosítsd, ha a fizetési időszak elcsúszott.
                      <div className="text-blue-600 font-bold italic" onClick={changeNextBillingDateState} style={{cursor: 'pointer'}}>
                        {isNextBillingDateDisabled ? "Módosítás" : "Automatikus beállítás"}
                      </div>
                    </div>
                  </label>
                  <span className="p-d-block">
                    <Calendar id="next_billing_date" 
                              {...input} 
                              disabled={isNextBillingDateDisabled}
                              value={input.value ? new Date(input.value) : null}
                              showIcon={true}
                              locale="hu"
                              dateFormat="yy-mm-dd"
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Automatikusan beállítva" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="is_active" render={({ input }) => (
                <div className="p-field p-fluid">
                  <label htmlFor="is_active" className="block mb-2">Állapot</label>
                  <span className="p-d-block">
                    <Dropdown id="is_active" 
                              {...input} 
                              options={isActive} 
                              optionLabel="label" 
                              optionValue="value" 
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz számlázási ciklust" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="is_shared" render={({ input }) => (
                <div className="flex justify-between items-center">
                  <label htmlFor="is_shared" className="mb-2">
                    <div className="text-black ">
                      Megosztott előfizetés
                    </div>
                    <div className="text-sm text-gray-400">
                      Több ember használja
                    </div>
                  </label>
                  <span className="p-d-block mr-2">
                    <InputSwitch id="is_shared" className="mr-0" 
                              checked={input.value}
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz számlázási ciklust" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          {values.is_shared && (
            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
              <div className="md:col-span-10">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="font-bold text-black">Résztvevők meghívása</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Csak barátokat tudsz meghívni. Elfogadás után a költség egyenlően oszlik meg.
                  </div>

                  {friends.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {friends.map((friendship) => {
                        const friend = friendship.friend || {};
                        const friendName = friend.full_name || friend.username || friend.email || "Barát";
                        const checked = selectedShareUserIds.includes(String(friend.id));

                        return (
                          <button
                            key={friendship.id || friend.id}
                            type="button"
                            onClick={() => toggleShareUser(friend.id)}
                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                              checked
                                ? "border-blue-400 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-blue-200"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              {friend.avatar_url ? (
                                <img
                                  src={friend.avatar_url}
                                  alt={friendName}
                                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                  {friendName.charAt(0)}
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate font-bold text-slate-950">{friendName}</span>
                                <span className="block truncate text-sm text-slate-500">@{friend.username || friend.id}</span>
                              </span>
                            </span>
                            <span className={`h-5 w-5 rounded-full border ${
                              checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-medium text-slate-500">
                      Még nincs barátod, akit meghívhatnál.
                    </div>
                  )}

                  {shareMessage && (
                    <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
                      {shareMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-5">
            <div className="md:col-span-10">
              <Field name="trial_enabled" render={({ input }) => (
                <div className="flex justify-between items-center">
                  <label htmlFor="trial_enabled" className="mb-2">
                    <div className="text-black ">
                      Próbaidőszak
                    </div>
                    <div className="text-sm text-gray-400">
                      Jelöld, ha ingyenes próbaidőszak
                    </div>
                  </label>
                  <span className="p-d-block mr-2">
                    <InputSwitch id="trial_enabled" className="mr-0" 
                              checked={input.value}
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Válassz számlázási ciklust" />
                  </span>
                </div>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-10 gap-5 items-center">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="bg-gray-100 rounded-2xl py-4 md:col-span-5 flex items-center justify-center text-black font-medium border-none cursor-pointer"
            >
              Mégse
            </button>

            <button 
              type="submit" 
              disabled={loading}
              className="bg-black rounded-2xl py-4 md:col-span-5 flex items-center justify-center text-white font-medium border-none cursor-pointer disabled:opacity-50"
            >
              {loading ? "Mentés..." : "Mentés"}
            </button>
          </div>
        </form>
      )} />

      
    </div>
  )

}

export default SubscriptionForm;
