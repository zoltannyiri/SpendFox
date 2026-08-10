import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/UseAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {ProgressBar} from 'primereact/progressbar';
import { Form, Field } from 'react-final-form';
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {InputNumber} from "primereact/inputnumber";
import {Dropdown} from "primereact/dropdown";
import {Calendar} from "primereact/calendar";
import { addLocale, locale } from 'primereact/api';
import {Checkbox} from "primereact/checkbox";
import {InputSwitch} from "primereact/inputswitch";



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


const SubscriptionForm = ({ onSuccess, onClose }) => {
  const { profileId } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState();
  const [formData, setFormData] = useState({});
  const [currency, setCurrency] = useState([]);
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

  const onSubmit = (data) => {
    setLoading(true);
    if (subscriptionId) {
      const payload = {
        ...data,
        start_date: formatDateToLocalISO(data.start_date), 
        user_id: profileId
      }
      axios.patch(import.meta.env.VITE_API_HOST + `/subscriptions/${subscriptionId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          const subscriptionData = response.data.data.id;
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
        },
      })
        .then((response) => {
          const subscriptionData = response.data.data.id;
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
    if (!subscriptionId) {
      return;
    }
    axios.get(import.meta.env.VITE_API_HOST + `/subscriptions/${subscriptionId}`)
      .then((response) => {
        setFormData(response.data.data);
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
      {loading &&
        <ProgressBar mode="indeterminate"
                     style={{height: '5px', position: "absolute", top: 0, left: 0, borderRadius: 0,}}></ProgressBar>
      }
      <div className="font-bold text-2xl text-black">
        {subscriptionId ? "Előfizetés szerkesztése" : "Új előfizetés hozzáadása"}
      </div>
      <Form onSubmit={onSubmit} initialValues={formData} render={({ handleSubmit }) => (
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
                    </div></label>
                  <span className="p-d-block">
                    <Calendar id="next_billing_date" 
                              {...input} 
                              showIcon={true}
                              locale="hu"
                              dateFormat="yy-mm-dd"
                              onChange={(e) => {
                                input.onChange(e.value);
                              }}
                              placeholder="Automatikus beállítás" />
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