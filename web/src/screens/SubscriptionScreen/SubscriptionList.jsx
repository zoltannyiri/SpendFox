import React, { useEffect, useState } from 'react';
import axios from "axios";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from 'primereact/dropdown';
import { AiOutlineCalendar } from "react-icons/ai";
import { AiOutlineUpload } from "react-icons/ai";
import { FiCheckCircle } from "react-icons/fi";
import { LuClock } from "react-icons/lu";
import { FiRefreshCw } from "react-icons/fi";
import { PieChart } from '@mui/x-charts/PieChart';
import { RiSecurePaymentLine } from "react-icons/ri";
import { IoMdAdd } from "react-icons/io";

import SubscriptionLogo from '../../components/SubscriptionLogo';
import SubscriptionTable from '../../components/SubscriptionTable';
import SubscriptionForm from './SubscriptionForm';
import { useAuth } from "../../auth/UseAuth";
import PageLoadingBar from '../../components/PageLoadingBar';
import { Badge } from 'primereact/badge';
import { Sidebar } from 'primereact/sidebar';

const CATEGORY_META = {
  streaming: { label: 'Streaming', value: 'streaming', color: '#0ca9f2' },
  work: { label: 'Munka', value: 'work', color: '#111111' },
  'ai-tool': { label: 'AI tool', value: 'ai-tool', color: '#7c3aed' },
  hosting: { label: 'Tárhely', value: 'hosting', color: '#f97316' },
  mobile: { label: 'Mobil', value: 'mobile', color: '#10b981' },
  bank: { label: 'Bank', value: 'bank', color: '#64748b' },
  gaming: { label: 'Játék', value: 'gaming', color: '#ef4444' },
  other: { label: 'Egyéb', value: 'other', color: '#f59e0b' },
};

const SubscriptionList = () => {
  const {profileId} = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const categoryOptions = Object.values(CATEGORY_META);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [mostExpensiveSubscription, setMostExpensiveSubscription] = useState(null);
  const [mostExpensiveSubscriptionPrice, setMostExpensiveSubscriptionPrice] = useState(0);
  const [subscriptionsIn7Days, setSubscriptionsIn7Days] = useState([]);
  const [subscriptionsInLastMonth, setSubscriptionsInLastMonth] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState(0);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [visible, setVisible] = useState(false);
  const [shareInvites, setShareInvites] = useState({ incoming: [], outgoing: [] });

  

  const CHART_DATA = [
    { id: 1, label: 'Sikeres', value: activeSubscriptions.length, color: '#10b981' },
    { id: 2, label: 'Függőben', value: (allSubscriptions) - (activeSubscriptions.length), color: '#f97316' },
    { id: 3, label: 'Közelgő', value: subscriptionsIn7Days.length, color: '#3b82f6' },
  ];

  const CHART_SETTINGS = {
    margin: { right: 5 },
    width: 200,
    height: 200,
    hideLegend: true,
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  const dropdownFilterTemplate = (options) => {
    return (
      <Dropdown 
                value={options.value} 
                label={options.label ? CATEGORY_META[options.value].label : 'Kategória'}
                options={categoryOptions} 
                onChange={(e) => options.filterApplyCallback(e.value)} 
                showClear={true}
                placeholder="Válassz..." 
                showFilterMenu={false}
                className="w-full" />
    );
  };

  const resolveBrandLogoUrl = (name) => {
    const normalizedName = normalizeBrandName(name);
    const brandDomains = {
      netflix: 'netflix.com',
      spotify: 'spotify.com',
      disney: 'disneyplus.com',
      disneyplus: 'disneyplus.com',
      youtube: 'youtube.com',
      hbo: 'max.com',
      max: 'max.com',
      skyshowtime: 'skyshowtime.com',
      facebook: 'facebook.com',
      twitter: 'x.com',
      instagram: 'instagram.com',
      github: 'github.com',
      openai: 'openai.com',
      chatgpt: 'openai.com',
      google: 'google.com',
      apple: 'apple.com',
      microsoft: 'microsoft.com',
      steam: 'steampowered.com',
      nordvpn: 'nordvpn.com',
      expressvpn: 'expressvpn.com',
      surfshark: 'surfshark.com',
      ssh: 'ssh.com',
    };
    const matchingBrand = Object.keys(brandDomains)
      .sort((a, b) => b.length - a.length)
      .find((brandName) => normalizedName.includes(normalizeBrandName(brandName)));
    const domain = matchingBrand ? brandDomains[matchingBrand] : null;

    return domain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
      : null;
  }

  const normalizeBrandName = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\+/g, ' plus ')
      .replace(/[^\w\s.-]/g, ' ')
      .replace(/\s+/g, '');
  }

  const monthlyPrice = (item) => {
    const price = Number(item.my_share_price_huf ?? item.price_huf ?? item.price ?? 0);
    return item.billing_cycle === 'yearly'
      ? price / 12
      : item.billing_cycle === 'weekly'
        ? price * 4
        : price;
  }

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  };

  const fetchShareInvites = () => {
    return axios.get(import.meta.env.VITE_API_HOST + "/subscriptions/share-invites", {
      headers: authHeaders,
    })
    .then(response => {
      setShareInvites(response.data?.data || { incoming: [], outgoing: [] });
    })
    .catch(error => {
      console.error("Error fetching share invites:", error);
    });
  };

  const respondToShareInvite = (inviteId, action) => {
    axios.post(import.meta.env.VITE_API_HOST + `/subscriptions/share-invites/${inviteId}/${action}`, null, {
      headers: authHeaders,
    })
    .then(() => {
      fetchShareInvites();
      fetchSubscriptions();
    })
    .catch(error => {
      console.error("Error responding to share invite:", error);
    });
  };

  const fetchSubscriptions = () => {
    axios.get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + profileId, {
      headers: authHeaders,
    })
    .then(response => {
      setSubscriptions(response.data.data);
      setSubscriptionId(response.data.data.id);
      setAllSubscriptions(response.data.data.length);
      const activeSubscriptionsList = response.data.data.filter(item => item.is_active === true);
      setActiveSubscriptions(activeSubscriptionsList);
      const subscriptionsInLastMonthList = activeSubscriptionsList.filter(item => {
          const last30days = new Date();
          last30days.setDate(last30days.getDate() - 30);
          return last30days <= new Date(item.next_billing_date) && new Date(item.next_billing_date) <= new Date();
        });
      setSubscriptionsInLastMonth(subscriptionsInLastMonthList);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999);
      const subscriptionsIn7DaysList = activeSubscriptionsList.filter(item => {
        const nextBillingDate = new Date(item.next_billing_date);
        return nextBillingDate >= today && nextBillingDate <= sevenDaysFromNow;
      });
      setSubscriptionsIn7Days(subscriptionsIn7DaysList);
        const totalMonthlyPrice = activeSubscriptionsList.reduce((total, item) => {
          const monthlyPriceValue = monthlyPrice(item);
          return total + monthlyPriceValue;
        }, 0);
      // const totalMonthlyPrice = activeSubscriptionsList.reduce((total, item) => {
      //     const monthlyPriceValue = monthlyPrice(item);
      //     return total + monthlyPriceValue;
      //   }, 0);
      setMonthlyTotal(totalMonthlyPrice);
      const mostExpensiveSubscription = activeSubscriptionsList.reduce((max, item) => {
        return monthlyPrice(item) > monthlyPrice(max) ? item : max;
      }, activeSubscriptionsList[0]);
      setMostExpensiveSubscription(mostExpensiveSubscription);
      setMostExpensiveSubscriptionPrice(monthlyPrice(mostExpensiveSubscription));
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching subscriptions:", error);
      setLoading(false);
    });
  }; 

  useEffect(() => {
    if (profileId) {
      fetchSubscriptions();
      fetchShareInvites();
    }
  }, [profileId]);

  return (
    <>
      <PageLoadingBar show={loading} />
      <Sidebar visible={visible} position="right" onHide={() => setVisible(false)} className="mt-40 rounded-3xl mr-10 mb-30" style={{width: '30%'}}>
        <SubscriptionForm subscriptionId={subscriptionId} onSuccess={fetchSubscriptions} onClose={() => setVisible(false)} />
      </Sidebar>


      <div className="flex w-full flex-col items-center gap-6 px-4 py-12 xl:px-8">
        <div className="sf-dark-panel w-full max-w-[1700px] space-y-8 rounded-3xl p-8 gap-y-2">
          <div className="relative">

            <div className="flex flex-col ml-0 text-white">
              <div className="text-3xl font-bold">
                Fizetések
              </div>
              <div className="mt-2 text-lg">
                Itt láthatod az összes sikeres, függőben lévő és közelgő terhelést.
              </div>
            </div>
                        
            <div className="cursor-pointer border border-zinc-400 rounded-2xl py-2 px-4 absolute top-0 right-0">
              <div className="flex flex-row justify-center items-center text-center text-white text-md">
                <AiOutlineUpload className="text-2xl mr-2 text-white items-center justify-center" /> Exportálás
              </div>
            </div>
          </div>

          {/* <div className="flex flex-row items-center">
            <AiOutlineCalendar className="text-3xl mr-3 text-white shrink-0" /> 
            <div className="flex flex-col text-gray-300">
              <div className=" text-gray-300 text-md mt-2 tracking-wider">
                Adatok frissítve
              </div>
              <div className="text-white text-lg font-bold tracking-wider">
                {new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
            
          </div> */}
        </div>

        <div className="w-full max-w-[1700px] grid grid-cols-1 gap-4 md:grid-cols-10">
          {shareInvites.incoming?.length > 0 && (
            <div className="md:col-span-10 rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <div className="text-lg font-bold text-slate-950">Megosztott előfizetés meghívók</div>
              <div className="mt-1 text-sm text-slate-600">
                Ezek akkor kerülnek bele a havi költségedbe, ha elfogadod őket.
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {shareInvites.incoming.map((invite) => {
                  const ownerName = invite.owner?.full_name || invite.owner?.username || "Egy barátod";
                  const subscription = invite.subscription || {};

                  return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-950">
                          {subscription.name || "Előfizetés"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {ownerName} meghívott közös fizetésre
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => respondToShareInvite(invite.id, "accept")}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          Elfogadás
                        </button>
                        <button
                          type="button"
                          onClick={() => respondToShareInvite(invite.id, "decline")}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                        >
                          Elutasítás
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sf-dark-panel md:col-span-4 rounded-3xl p-6 text-white">
            <div className="text-gray-300 text-md">
              Ebben a hónapban 
              {/* {monthlyTotal}  */}
              {/* {subscriptionsInLastMonth.length} */}
            </div>
            <div className="text-5xl font-bold mt-4">
              {monthlyTotal.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
            </div>
            <div className="text-white text-xl mt-3">
              összesen
            </div>
            <svg viewBox="0 0 150 40" className="w-28 h-8 overflow-visible mt-7">
              <polyline
                fill="none"
                stroke="#27272a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,30 40,28 80,18 120,18"
              />

              <polyline
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="80,18 120,8"
              />
            </svg>
            <div className="text-gray-300 text-md mt-2 flex-row grid grid-cols-1">
              {/* <div className="mr-2 text-left">
                Éves becslés
              </div> */}
              <div className="text-right">
                <div className="text-gray-300 text-md">
                  Előző hónap
                </div>
                <div className="font-bold">
                  {(monthlyTotal * 12).toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
                </div>
              </div>
              {/* <div className="text-right font-bold">
                {(monthlyTotal * 12).toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
              </div> */}

            </div>
          </div>


          <div className="sf-card md:col-span-2 rounded-2xl p-6 text-black">
            <div className="flex h-16 w-16 bg-green-100 rounded-2xl items-center justify-center">
              {FiCheckCircle && <FiCheckCircle className="text-4xl text-green-500 " />}
            </div>
            <div className="text-lg font-bold mt-8">
              Sikeres fizetések
            </div>
            <div className="text-4xl font-bold mt-4">
              {activeSubscriptions.length} db
            </div>
            <div className="text-gray-500 text-md mt-4">
              ebben a hónapban
            </div>
          </div>

          <div className="sf-card md:col-span-2 rounded-2xl p-6 text-black">
            <div className="flex h-16 w-16 bg-orange-100 rounded-2xl items-center justify-center">
              {LuClock && <LuClock className="text-4xl text-orange-500 " />}
            </div>
            <div className="text-lg font-bold mt-8">
              Inaktív
            </div>
            <div className="text-4xl font-bold mt-4">
              {subscriptionsIn7Days.length} db
            </div>
            <div className="text-gray-500 text-md mt-4">
              összesen
            </div>
          </div>
          
          <div className="sf-card md:col-span-2 rounded-2xl p-6 text-black break-words">
            <div className="flex h-16 w-16 bg-green-100 rounded-2xl items-center justify-center">
              {FiRefreshCw && <FiRefreshCw className="text-4xl text-green-500 " />}
            </div>
            <div className="text-lg font-bold mt-8">
              Legdrágább előfizetés
            </div>
            <div className="text-4xl font-bold mt-4">
              {mostExpensiveSubscription ? mostExpensiveSubscription.name : "N/A"}
            </div>
            <div className="text-gray-500 text-md mt-4">
              {mostExpensiveSubscriptionPrice.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })} / hó
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-[1700px] grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="sf-card w-full space-y-8 rounded-3xl p-8 gap-y-2 xl:col-span-9">
            <h1 className="text-xl font-bold">Fizetések</h1>
            <SubscriptionTable 
              subscriptions={subscriptions} 
              subscriptionId={subscriptionId} 
              onRefresh={fetchSubscriptions} 
              onEdit={(id) => {
                setSubscriptionId(id);
                setVisible(true);
            }}/>
          </div>
          <div className="w-full space-y-8 rounded-3xl gap-y-2 xl:col-span-3">
            <div className="sf-card rounded-3xl p-6 text-black">
              <div className="text-lg font-bold">
                Állapot szerinti bontás
              </div>
              <div className="mt-5 relative flex items-center justify-center">
                <PieChart
                  series={[{ innerRadius: 50, outerRadius: 100, data:CHART_DATA, }]}
                  {...CHART_SETTINGS}
                />
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <div className="font-bold text-xl ">
                    {allSubscriptions} db
                  </div>
                  <div className="text-sm font-light text-gray-500">
                    összesen
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                {CHART_DATA.map((data) => (
                  <div key={data.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block shrink-0 h-4 w-4 rounded-md" style={{ backgroundColor: data.color }} />
                      <span className="font-medium">
                        {data.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        {data.value} db
                      </span>
                      <span className="w-10 text-right text-gray-400">
                        {allSubscriptions > 0 ? Math.round((data.value / allSubscriptions) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sf-card rounded-3xl p-6 text-black">
              <div className="text-lg font-bold">
                Közelgő fizetések
              </div>
              <div className="mt-4">
                <DataTable
                  value={subscriptionsIn7Days.slice(0, 3)}
                  loading={loading}
                  // rows={3}
                  showHeader={false}
                  sortField="next_billing_date"
                  sortOrder={1}
                  emptyMessage="Nincs közelgő fizetés"
                  className="[&_.p-datatable-thead]:!hidden [&_.p-datatable-tbody>tr:last-child>td]:!border-b-0"
                >
                  <Column field="name" body={(rowData) => {
                    const logoUrl = resolveBrandLogoUrl(rowData.name);
                    return (
                      <>
                      <div className="flex flex-row">
                        <SubscriptionLogo logoUrl={logoUrl} />
                        <div className="items-center justify-center">
                          <div className="font-bold mt-0 text-black">
                            {rowData.name}
                          </div>
                          <div className="font-light text-sm mt-2">
                            {formatDate(rowData.next_billing_date)}
                          </div>
                        </div>
                      </div>
                      </>
                    );
                  }}></Column>
                  <Column field="price_huf" className="font-bold text-black"></Column>

                </DataTable>
              </div>
            </div>
            <div className="sf-card rounded-3xl p-6 text-black">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-10">
                <div className="md:col-span-3">
                  <RiSecurePaymentLine className="text-7xl text-green-500" />
                </div>
                <div className="md:col-span-7">
                  <div className="font-bold text-lg text-left">
                    Új fizetés rögzítése
                  </div>
                  <div className="font-light text-sm text-gray-600 text-left mt-3">
                    Rögzíts új egyszeri vagy rendszeres fizetést a jobb áttekintés érdekében.
                  </div>
                </div>
              </div>
              <div className="bg-black cursor-pointer border border-zinc-400 rounded-2xl py-4 px-4 mt-3" 
                onClick={() => {
                  setSubscriptionId(null);
                  setVisible(true);
                }}>
                <div className="flex flex-row justify-center items-center text-center text-white text-md">
                  <IoMdAdd className="text-2xl mr-2 text-white items-center justify-center" /> Új fizetés hozzáadása
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionList;
