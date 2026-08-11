import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import axios from 'axios';
import { Column } from 'primereact/column';
import { useAuth } from "../auth/UseAuth";
import { Badge } from 'primereact/badge';
import { Sidebar } from 'primereact/sidebar';
import { Calendar } from 'primereact/calendar';

import SubscriptionForm from '../screens/SubscriptionScreen/SubscriptionForm';
import SubscriptionLogo from './SubscriptionLogo';

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

const SubscriptionTable = (props) => {
  const [loading, setLoading] = useState(false);
  const { profileId } = useAuth();
  const [subscriptions, setSubscriptions] = useState(null);
  const categoryOptions = Object.values(CATEGORY_META);
  const [visibleForm, setVisibleForm] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(null);


  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

  const actionBodyTemplate = (rowData) => {
    return (
      <>
        <div className="flex justify-center gap-2">
          <button className="p-button p-component p-button-text p-button-plain" onClick={() => {
            if (props.onEdit) {
              props.onEdit(rowData.id);
            }
          }}>
            <span className="p-button-icon p-c pi pi-pencil" title="Szerkesztés" tooltip="Szerkesztés">

            </span>
          </button>
          <button className="p-button p-component p-button-text p-button-plain" onClick={() => {
            window.confirm("Biztosan törölni szeretnéd az előfizetést?") &&
            axios.delete(import.meta.env.VITE_API_HOST + "/subscriptions/" + rowData.id, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            })
              .then(response => {
                props.onRefresh();
                // setVisibleForm(true);
            }) 
              .catch(error => {
                console.error("Error fetching subscription:", error);
              })
          }}>
            <span className="p-button-icon p-c pi pi-trash" title="Törlés" tooltip="Törlés"></span>
          </button>
        </div>
      </>
    )
  }

  const fetchSubscriptions = () => {
    axios.get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + profileId, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
    .then(response => {
      setSubscriptions(response.data.data);
      // setAllSubscriptions(response.data.data.length);
      // const activeSubscriptionsList = response.data.data.filter(item => item.is_active === true);
      // setActiveSubscriptions(activeSubscriptionsList);
      // const subscriptionsInLastMonthList = activeSubscriptionsList.filter(item => {
      //     const last30days = new Date();
      //     last30days.setDate(last30days.getDate() - 30);
      //     return last30days <= new Date(item.next_billing_date) && new Date(item.next_billing_date) <= new Date();
      //   });
      // setSubscriptionsInLastMonth(subscriptionsInLastMonthList);
      
      // const today = new Date();
      // today.setHours(0, 0, 0, 0);
      // const sevenDaysFromNow = new Date();
      // sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      // sevenDaysFromNow.setHours(23, 59, 59, 999);
      // const subscriptionsIn7DaysList = activeSubscriptionsList.filter(item => {
      //   const nextBillingDate = new Date(item.next_billing_date);
      //   return nextBillingDate >= today && nextBillingDate <= sevenDaysFromNow;
      // });
      // setSubscriptionsIn7Days(subscriptionsIn7DaysList);
      //   const totalMonthlyPrice = activeSubscriptionsList.reduce((total, item) => {
      //     const monthlyPriceValue = monthlyPrice(item);
      //     return total + monthlyPriceValue;
      //   }, 0);
      // const totalMonthlyPrice = activeSubscriptionsList.reduce((total, item) => {
      //     const monthlyPriceValue = monthlyPrice(item);
      //     return total + monthlyPriceValue;
      //   }, 0);
      // setMonthlyTotal(totalMonthlyPrice);
      // const mostExpensiveSubscription = activeSubscriptionsList.reduce((max, item) => {
      //   return monthlyPrice(item) > monthlyPrice(max) ? item : max;
      // }, activeSubscriptionsList[0]);
      // setMostExpensiveSubscription(mostExpensiveSubscription);
      // setMostExpensiveSubscriptionPrice(monthlyPrice(mostExpensiveSubscription));
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching subscriptions:", error);
      setLoading(false);
    });
  }; 

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + profileId, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
    .then(response => {
      setSubscriptions(response.data.data);
      setSubscriptionId(response.data.data.id);
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching subscriptions:", error);
      setLoading(false);
    });
  }, [profileId]); 


  return (
        <>
        {/* <Sidebar visible={visibleForm} position="right" onHide={() => setVisibleForm(false)} className="mt-40 rounded-3xl mr-10 mb-30" style={{width: '30%'}}>
          <SubscriptionForm onSuccess={fetchSubscriptions} onClose={() => setVisibleForm(false)} subscriptionId={subscriptionId} />
        </Sidebar> */}


        <DataTable
          value={props.view !== "home" ? (props.subscriptions || subscriptions) : props.subscriptions?.slice(0, 3)}
          showHeader={props.view !== "home"}
          paginator={props.view !== "home"}
          loading={loading}
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          filterDisplay={props.view !== "home" ? "row" : undefined}
          responsiveLayout="scroll"
          emptyMessage="Nincs előfizetés"
          // stripedRows
          selectionMode={"single"}  
          className={
            props.view === "home" 
              ? "[&_.p-datatable-thead]:!hidden [&_.p-datatable-tbody>tr:last-child>td]:!border-b-0" 
              : ""
          }
        >
          <Column field="name" header="Szolgáltatás" sortable filter showFilterMenu={false} className="text-black font-bold" body={(rowData) => {
            const logoUrl = resolveBrandLogoUrl(rowData.name);
            return (
              <SubscriptionLogo logoUrl={logoUrl} name={rowData.name} />
            );
          }}></Column>
          <Column field="category" header="Kategória" sortable filter filterElement={dropdownFilterTemplate} showFilterMenu={false} body={(rowData) => {
            const meta = (rowData.category && CATEGORY_META[rowData.category]) || CATEGORY_META.other;
            return (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                ></span>
                {meta.label}
              </span>
            );
          }}></Column>
          {/* <Column field="start_date" header="Előfizetés kezdete" sortable body={(rowData) => formatDate(rowData.start_date)}></Column> */}
          <Column field="next_billing_date" header="Következő előfizetés kezdete" sortable body={(rowData) => formatDate(rowData.next_billing_date)}></Column>
          
          {props.view !== "home" && (
            <Column field="is_active" header="Állapot" sortable body={(rowData) => 
              (rowData.is_active ? <Badge value="Sikeres" severity="success" /> : <Badge value="Függőben" severity="warning" />)
            }></Column>
          )}
          <Column field="price_huf" header="Összeg" sortable bodyClassName="font-bold text-black"></Column>
          <Column body={actionBodyTemplate} header="Műveletek" className="text-center"></Column>
        </DataTable>
        </>
  );
}

export default SubscriptionTable