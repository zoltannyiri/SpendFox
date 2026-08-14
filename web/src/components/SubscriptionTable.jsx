import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import axios from 'axios';
import { Column } from 'primereact/column';
import { useAuth } from "../auth/UseAuth";
import { Badge } from 'primereact/badge';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState(null);
  const [expandedRows, setExpandedRows] = useState(null);
  const categoryOptions = Object.values(CATEGORY_META);


  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }

    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  const formatMoney = (value, currency = 'HUF') => {
    return Number(value || 0).toLocaleString('hu-HU', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'HUF' ? 0 : 2,
    });
  };

  const formatBillingCycle = (value) => {
    const labels = {
      monthly: 'Havi',
      yearly: 'Éves',
      weekly: 'Heti',
    };

    return labels[value] || value || '-';
  };

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
          <button className="p-button p-component p-button-text p-button-plain cursor-pointer" onClick={(event) => {
            event.stopPropagation();
            if (props.onEdit) {
              props.onEdit(rowData.id);
            }
          }}>
            <span className="p-button-icon p-c pi pi-pencil" title="Szerkesztés" tooltip="Szerkesztés">

            </span>
          </button>
          <button className="p-button p-component p-button-text p-button-plain cursor-pointer" onClick={(event) => {
            event.stopPropagation();
            window.confirm("Biztosan törölni szeretnéd az előfizetést?") &&
            axios.delete(import.meta.env.VITE_API_HOST + "/subscriptions/" + rowData.id, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            })
              .then(() => {
                props.onRefresh();
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

  const priceBodyTemplate = (rowData) => {
    const amount = Number(rowData.my_share_price_huf ?? rowData.price_huf ?? rowData.price ?? 0);

    return (
      <div className="font-bold text-black">
        {amount.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
        {rowData.is_shared && (
          <div className="mt-1 text-xs font-medium text-blue-600">
            Saját részed
          </div>
        )}
      </div>
    );
  };

  const detailItem = (label, value) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 break-words text-base font-extrabold text-slate-950">
        {value}
      </div>
    </div>
  );

  const rowExpansionTemplate = (rowData) => {
    const fullPrice = Number(rowData.price_huf ?? rowData.price ?? 0);
    const ownShare = Number(rowData.my_share_price_huf ?? rowData.price_huf ?? rowData.price ?? 0);
    const categoryMeta = (rowData.category && CATEGORY_META[rowData.category]) || CATEGORY_META.other;
    const participants = rowData.participants || [];
    const acceptedParticipants = participants.filter((participant) => participant.status === 'accepted' || participant.is_owner);

    return (
      <div className="rounded-b-3xl bg-slate-50 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {detailItem('Számlázási ciklus', formatBillingCycle(rowData.billing_cycle))}
          {detailItem('Következő fizetés', formatDate(rowData.next_billing_date))}
          {detailItem('Teljes összeg', formatMoney(fullPrice))}
          {detailItem(rowData.is_shared ? 'Saját részed' : 'Fizetendő összeg', formatMoney(ownShare))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Kategória
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: categoryMeta.color }}
              />
              <span className="font-bold text-slate-950">
                {categoryMeta.label}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Állapot
            </div>
            <div className="mt-3">
              {rowData.is_active ? (
                <Badge value="Aktív" severity="success" />
              ) : (
                <Badge value="Inaktív" severity="warning" />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Próbaidő
            </div>
            <div className="mt-2 font-bold text-slate-950">
              {rowData.trial_enabled ? `Vége: ${formatDate(rowData.trial_end_date)}` : 'Nincs beállítva'}
            </div>
          </div>
        </div>

        {rowData.is_shared && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-slate-950">
                  Megosztott előfizetés
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Elfogadott résztvevők: {acceptedParticipants.length || rowData.accepted_participant_count || 1} fő
                </div>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm">
                {formatMoney(ownShare)} / fő
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/subscriptions/${rowData.id}/share`);
              }}
              className="mt-4 cursor-pointer rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Közös oldal megnyitása
            </button>

            {participants.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <span
                    key={`${rowData.id}-${participant.user_id || participant.id || participant.email}`}
                    className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    {participant.full_name || participant.username || participant.email || 'Résztvevő'}
                    {participant.is_owner ? ' · tulaj' : ''}
                    {!participant.is_owner && participant.status === 'pending' ? ' · függőben' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const toggleExpandedRow = (rowData) => {
    if (props.view === 'home') {
      return;
    }

    setExpandedRows((currentRows) => {
      const nextRows = { ...(currentRows || {}) };

      if (nextRows[rowData.id]) {
        delete nextRows[rowData.id];
      } else {
        nextRows[rowData.id] = true;
      }

      return nextRows;
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
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching subscriptions:", error);
      setLoading(false);
    });
  }, [profileId]); 


  return (
        <>
        <DataTable
          value={props.view !== "home" ? (props.subscriptions || subscriptions) : props.subscriptions?.slice(0, 3)}
          dataKey="id"
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
          expandedRows={props.view !== "home" ? expandedRows : null}
          onRowToggle={(event) => setExpandedRows(event.data)}
          rowExpansionTemplate={props.view !== "home" ? rowExpansionTemplate : undefined}
          onRowClick={(event) => {
            const target = event.originalEvent?.target;

            if (target?.closest?.('button, a, input, .p-row-toggler')) {
              return;
            }

            toggleExpandedRow(event.data);
          }}
          className={
            props.view === "home" 
              ? "[&_.p-datatable-thead]:!hidden [&_.p-datatable-tbody>tr:last-child>td]:!border-b-0" 
              : "[&_.p-datatable-tbody>tr]:cursor-default [&_.p-row-toggler]:cursor-pointer"
          }
        >
          {props.view !== "home" && (
            <Column expander className="w-12" />
          )}
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
          <Column field="is_shared" header="Megosztás" body={(rowData) => (
            rowData.is_shared ? (
              <Badge
                value={`${rowData.accepted_participant_count || 1} fő`}
                severity="info"
              />
            ) : (
              <span className="text-sm text-slate-400">-</span>
            )
          )}></Column>
          
          {props.view !== "home" && (
            <Column field="is_active" header="Állapot" sortable body={(rowData) => 
              (rowData.is_active ? <Badge value="Sikeres" severity="success" /> : <Badge value="Függőben" severity="warning" />)
            }></Column>
          )}
          <Column field="price_huf" header="Összeg" sortable body={priceBodyTemplate}></Column>
          <Column body={actionBodyTemplate} header="Műveletek" className="text-center"></Column>
        </DataTable>
        </>
  );
}

export default SubscriptionTable
