

// import { useState, useEffect } from "react";
// import axios from "axios";
// 
// import SubscriptionTable from "../../components/SubscriptionTable";
// import { PieChart } from '@mui/x-charts/PieChart';
// import { AiOutlineEdit } from "react-icons/ai";
// import { AiOutlineCalendar } from "react-icons/ai";
// import { AiOutlineStar } from 'react-icons/ai';
// import { HiOutlineWallet } from 'react-icons/hi2';
// import { FaArrowRight } from 'react-icons/fa';
// import { CiBellOn } from 'react-icons/ci';
// import { MdOutlineKeyboardArrowRight } from 'react-icons/md';
// import { HiOutlineCalendar } from 'react-icons/hi2';
// import { HiOutlineStar } from 'react-icons/hi2';
// import { FiBookmark, FiMessageCircle, FiStar } from "react-icons/fi";
// import { LuLightbulb } from "react-icons/lu";
// import { useAuth } from "../../auth/UseAuth";
// 
// const getAuthHeaders = () => ({
//   Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
// });
// 
// const formatCurrency = (value) =>
//   Math.round(Number(value) || 0).toLocaleString("hu-HU", {
//     style: "currency",
//     currency: "HUF",
//     maximumFractionDigits: 0,
//   });
// 
// const formatRelativeDate = (value) => {
//   if (!value) return "most";
// 
//   const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);
//   if (Number.isNaN(date.getTime())) return "most";
// 
//   const diffDays = Math.floor((new Date() - date) / 86400000);
// 
//   if (diffDays <= 0) return "ma";
//   if (diffDays === 1) return "tegnap";
//   if (diffDays < 30) return `${diffDays} napja`;
// 
//   return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
// };
// 
// const getProfilePath = (user) => `/${user?.username || user?.id}`;
// 
// const feedMeta = {
//   recommendation: {
//     label: "Ajánlás",
//     color: "bg-blue-50 text-blue-600",
//     icon: <FiStar />,
//   },
//   tip: {
//     label: "Tipp",
//     color: "bg-orange-50 text-orange-600",
//     icon: <LuLightbulb />,
//   },
//   list: {
//     label: "Lista",
//     color: "bg-violet-50 text-violet-600",
//     icon: <FiBookmark />,
//   },
//   post: {
//     label: "Bejegyzés",
//     color: "bg-slate-100 text-slate-600",
//     icon: <FiMessageCircle />,
//   },
//   cancelled_subscription: {
//     label: "Lemondás",
//     color: "bg-red-50 text-red-600",
//     icon: <FiBookmark />,
//   },
// };
// 
// const FeedActivityCard = ({ activity }) => {
//   const meta = feedMeta[activity.type] || feedMeta.post;
//   const author = activity.author || {};
//   const authorName = author.full_name || author.username || "SpendFox felhasználó";
//   const title = activity.title || activity.subscription_name || activity.body || "Profil aktivitás";
//   const description = activity.body === title ? "" : activity.body;
// 
//   return (
//     <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
//       <div className="flex items-start gap-4">
//         <button
//           type="button"
//           onClick={() => {
//             window.location.href = getProfilePath(author);
//           }}
//           className="shrink-0"
//         >
//           {author.avatar_url ? (
//             <img
//               src={author.avatar_url}
//               alt={authorName}
//               className="h-12 w-12 rounded-full object-cover"
//             />
//           ) : (
//             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-black text-blue-600">
//               {authorName.charAt(0)}
//             </div>
//           )}
//         </button>
// 
//         <div className="min-w-0 flex-1">
//           <div className="flex flex-wrap items-center gap-2">
//             <button
//               type="button"
//               onClick={() => {
//                 window.location.href = getProfilePath(author);
//               }}
//               className="font-black text-slate-950 transition hover:text-blue-600"
//             >
//               {authorName}
//             </button>
//             <span className="text-sm text-slate-400">·</span>
//             <span className="text-sm text-slate-500">{formatRelativeDate(activity.created_at)}</span>
//             <span className={`ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${meta.color}`}>
//               {meta.icon}
//               {meta.label}
//             </span>
//           </div>
// 
//           <div className="mt-3 text-xl font-black text-slate-950">{title}</div>
//           {description && (
//             <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
//               {description}
//             </p>
//           )}
// 
//           {activity.subscription_name && (
//             <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
//               <div className="flex min-w-0 items-center gap-3">
//                 <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
//                   {activity.logo_url ? (
//                     <img
//                       src={activity.logo_url}
//                       alt={activity.subscription_name}
//                       className="h-full w-full object-contain p-2"
//                     />
//                   ) : (
//                     <FiBookmark className="text-blue-600" />
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <div className="truncate font-black text-slate-950">{activity.subscription_name}</div>
//                   <div className="mt-1 text-xs font-bold text-slate-500">
//                     {activity.category || "egyéb"}
//                   </div>
//                 </div>
//               </div>
// 
//               {activity.price_huf !== null && activity.price_huf !== undefined && (
//                 <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
//                   <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
//                     HUF érték
//                   </div>
//                   <div className="text-base font-black text-slate-950">
//                     {formatCurrency(activity.price_huf)}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
// 
// 
// 
// const HomeScreen = () => {
//   const {profileId} = useAuth();
//   const [firstName, setFirstName] = useState("");
//   const [createdAt, setCreatedAt] = useState("");
//   const [monthlyTotal, setMonthlyTotal] = useState(0);
//   const [activeSubscriptions, setActiveSubscriptions] = useState([]);
//   const [subscriptionsIn7Days, setSubscriptionsIn7Days] = useState([]);
//   const [mostExpensiveSubscription, setMostExpensiveSubscription] = useState(null);
//   const [mostExpensiveSubscriptionPrice, setMostExpensiveSubscriptionPrice] = useState(0);
//   const [allSubscriptions, setAllSubscriptions] = useState(0);
//   const [categoryCount, setCategoryCount] = useState({});
//   const [feedActivities, setFeedActivities] = useState([]);
// 
// 
//   
// 
//   const CHART_DATA = [
//     { id: 1, label: 'Streaming', value: categoryCount.streaming || 0, color: '#0ca9f2' },
//     { id: 2, label: 'Munka', value: categoryCount.work || 0, color: '#111111' },
//     { id: 3, label: 'AI tool', value: categoryCount['ai-tool'] || 0, color: '#7c3aed' },
//     { id: 4, label: 'Tárhely', value: categoryCount.hosting || 0, color: '#f97316' },
//     { id: 5, label: 'Mobil', value: categoryCount.mobile || 0, color: '#10b981' },
//     { id: 6, label: 'Bank', value: categoryCount.bank || 0, color: '#64748b' },
//     { id: 7, label: 'Játék', value: categoryCount.gaming || 0, color: '#ef4444' },
//     { id: 8, label: 'Egyéb', value: categoryCount.other || 0, color: '#f59e0b' },
//   ];
// 
//   const CHART_SETTINGS = {
//     margin: { right: 5 },
//     width: 200,
//     height: 200,
//     hideLegend: true,
//   };
//   // const monthlyPrice =
//   //   item.billing_cycle === 'yearly'
//   //     ? price / 12
//   //     : item.billing_cycle === 'weekly'
//   //       ? price * 4
//   //       : price;
// 
//   // const categoryCode = item.category || 'other';
//   // const categoryTotal = summary.categoryTotals[categoryCode] || 0;
// 
//   const monthlyPrice = (item) => {
//     const price = item.price;
//     return item.billing_cycle === 'yearly'
//       ? price / 12
//       : item.billing_cycle === 'weekly'
//         ? price * 4
//         : price;
//   }
// 
//   useEffect(() => {
//     axios.get(import.meta.env.VITE_API_HOST + "/profile", {
//       headers: {
//         "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
//       },
//     })
//       .then((response) => {
//         setFirstName(response.data.data.full_name.split(" ")[1]);
//         setCreatedAt(response.data.data.created_at);
//       })
//       .catch((error) => {
//         console.error("Error fetching user profile:", error);
//       })
//     
//     axios.get(import.meta.env.VITE_API_HOST + "/subscriptions?userId=" + profileId, {
//       headers: {
//         "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
//       },
//     })
//       .then((response) => {
//         const subscriptions = response.data.data;
//         setAllSubscriptions(subscriptions.length);
//         const activeSubscriptionsList = subscriptions.filter(item => item.is_active === true);
//         setActiveSubscriptions(activeSubscriptionsList);
//         const subscriptionsIn7DaysList = activeSubscriptionsList.filter(item => {
//           const nextBillingDate = new Date(item.next_billing_date);
//           const today = new Date();
//           const sevenDaysFromNow = new Date(today);
//           sevenDaysFromNow.setDate(today.getDate() + 7);
//           return nextBillingDate <= sevenDaysFromNow;
//         });
//         setSubscriptionsIn7Days(subscriptionsIn7DaysList);
//         const totalMonthlyPrice = activeSubscriptionsList.reduce((total, item) => {
//           const monthlyPriceValue = monthlyPrice(item);
//           return total + monthlyPriceValue;
//         }, 0);
//         setMonthlyTotal(totalMonthlyPrice);
//         const mostExpensiveSubscription = activeSubscriptionsList.reduce((max, item) => {
//           return monthlyPrice(item) > monthlyPrice(max) ? item : max;
//         }, activeSubscriptionsList[0]);
//         setMostExpensiveSubscription(mostExpensiveSubscription);
//         setMostExpensiveSubscriptionPrice(monthlyPrice(mostExpensiveSubscription));
//         
// 
//         const categoryCount = activeSubscriptionsList.reduce((acc, item) => {
//           const cat = item.category || "other";
//           acc[cat] = (acc[cat] || 0) + 1;
//           return acc;
//         }, {});
//         setCategoryCount(categoryCount);
//       })
//       .catch(error => {
//         console.error("Error fetching subscriptions:", error);
//       });
// 
//     axios.get(import.meta.env.VITE_API_HOST + "/feed", {
//       headers: getAuthHeaders(),
//       params: { limit: 8 },
//     })
//       .then((response) => {
//         setFeedActivities(response.data.data || []);
//       })
//       .catch((error) => {
//         console.error("Error fetching feed:", error);
//       });
//   }, [profileId]);
// 
// 
//   return (
//     <>
//       <div className="flex w-full flex-col items-center gap-6 px-4 py-12">
//         <div className="w-full max-w-7xl space-y-8 rounded-3xl bg-black p-8 shadow-2xl border border-zinc-800 gap-y-2">
//           <div className="relative">
//             {/* <div className="flex items-center rounded-3xl">
//               <img src={avatar} alt="Avatar" className="w-40 h-40 rounded-full" />
//             </div> */}
// 
//             <div className="flex flex-col ml-0 text-white">
//               <div className="text-3xl font-bold">
//                 Szia, {firstName}!
//               </div>
//               <div className="mt-2 text-lg">
//                 Itt láthatod az előfizetéseid összesítését.
//               </div>
//             </div>
//             
//             <div className="border border-zinc-400 rounded-2xl py-2 px-4 absolute top-0 right-0">
//               <div className="cursor-pointer flex flex-row justify-center items-center text-center text-white text-md">
//                 <AiOutlineEdit className="text-2xl mr-2 text-white items-center justify-center" /> Profil szerkesztése
//               </div>
//             </div>
//           </div>
// 
//           <div className="flex flex-row items-center">
//             <AiOutlineCalendar className="text-3xl mr-3 text-white shrink-0" /> 
//             <div className="flex flex-col text-gray-300">
//               <div className=" text-gray-300 text-md mt-2 tracking-wider">
//                 Csatlakozott
//               </div>
//               <div className="text-white text-lg font-bold tracking-wider">
//                 {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
//               </div>
//             </div>
//             <div className="mx-6 h-10 w-[1px] bg-zinc-700 mt-2" />
// 
//             <AiOutlineStar className="text-3xl mr-3 text-white shrink-0" /> 
//             <div className="flex flex-col text-gray-300">
//               <div className=" text-gray-300 text-md mt-2 tracking-wider">
//                 Státusz
//               </div>
//               <div className="text-white text-lg font-bold tracking-wider">
//                 Felhasználó
//               </div>
//             </div>
//             
//           </div>
//         </div>
//         
//         <div className="w-full max-w-7xl grid grid-cols-1 gap-4 md:grid-cols-10">
//           <div className="md:col-span-4 rounded-3xl border border-zinc-300 bg-gray-900 p-6 text-white shadow-md">
//             {/* <h3 className="mb-2 text-xl font-bold">1. Oszlop</h3>
//             <p>Ide jöhet az első ablak tartalma.</p> */}
//             <div className="text-gray-300 text-md">
//               Ebben a hónapban 
//               {/* {monthlyTotal}  */}
//             </div>
//             <div className="text-5xl font-bold mt-4">
//               {monthlyTotal.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
//             </div>
//             <div className="text-white text-xl mt-3">
//               havi előfizetési költség
//             </div>
//             <svg viewBox="0 0 150 40" className="w-28 h-8 overflow-visible mt-7">
//               <polyline
//                 fill="none"
//                 stroke="#27272a"
//                 strokeWidth="2.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 points="0,30 40,28 80,18 120,18"
//               />
// 
//               <polyline
//                 fill="none"
//                 stroke="#818cf8"
//                 strokeWidth="2.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 points="80,18 120,8"
//               />
//             </svg>
//             <div className="text-gray-300 text-md mt-2 flex-row grid grid-cols-2">
//               <div className="mr-2 text-left">
//                 Éves becslés
//               </div>
//               <div className="text-right">
//                 <div className="text-gray-300 text-md">
//                   Éves becslés
//                 </div>
//                 <div className="font-bold">
//                   {(monthlyTotal * 12).toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
//                 </div>
//               </div>
//               {/* <div className="text-right font-bold">
//                 {(monthlyTotal * 12).toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
//               </div> */}
// 
//             </div>
//           </div>
// 
// 
//           <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md">
//             <div className="flex h-16 w-16 bg-purple-100 rounded-2xl items-center justify-center">
//               {HiOutlineWallet && <HiOutlineWallet className="text-4xl text-purple-500 " />}
//             </div>
//             <div className="text-lg font-bold mt-8">
//               Aktív előfizetések
//             </div>
//             <div className="text-4xl font-bold mt-4">
//               {activeSubscriptions.length} db
//             </div>
//             <div className="text-gray-500 text-md mt-4">
//               összes aktív előfizetés
//             </div>
//           </div>
// 
//           <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md">
//             <div className="flex h-16 w-16 bg-orange-100 rounded-2xl items-center justify-center">
//               {HiOutlineCalendar && <HiOutlineCalendar className="text-4xl text-orange-500 " />}
//             </div>
//             <div className="text-lg font-bold mt-8">
//               7 napon belül
//             </div>
//             <div className="text-4xl font-bold mt-4">
//               {subscriptionsIn7Days.length} db
//             </div>
//             <div className="text-gray-500 text-md mt-4">
//               következő fizetések
//             </div>
//           </div>
//           
//           <div className="md:col-span-2 rounded-2xl border border-zinc-300 bg-white p-6 text-black shadow-md break-words">
//             <div className="flex h-16 w-16 bg-green-100 rounded-2xl items-center justify-center">
//               {HiOutlineStar && <HiOutlineStar className="text-4xl text-green-500 " />}
//             </div>
//             <div className="text-lg font-bold mt-8">
//               Legdrágább előfizetés
//             </div>
//             <div className="text-4xl font-bold mt-4">
//               {mostExpensiveSubscription ? mostExpensiveSubscription.name : "N/A"}
//             </div>
//             <div className="text-gray-500 text-md mt-4">
//               {mostExpensiveSubscriptionPrice.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })} / hó
//             </div>
//           </div>
//         </div>
// 
//         <div className="w-full max-w-7xl gap-4 grid grid-cols-2 md:grid-cols-10 ">
//           <div className="md:col-span-6 rounded-3xl border border-zinc-300 shadow-md bg-white p-6">
//             <div className="text-xl font-bold">
//               Következő fizetések
//             </div>
//             <div className="mt-5">
//               <SubscriptionTable subscriptions={activeSubscriptions} view={"home"} />
//             </div>
//             <div className="mx-auto max-w-xs mt-5 items-center justify-center flex bg-gray-100 hover:bg-gray-200 rounded-2xl py-2 px-4 cursor-pointer text-black font-bold"
//               onClick={() => window.location.href = "/subscriptions"}
//             >
//               Összes megtekintése
//               <FaArrowRight className="text-md ml-4 text-black shrink-0" /> 
//             </div>
//           </div>
//           <div className="md:col-span-4 rounded-3xl border border-zinc-300 shadow-md bg-white p-6">
//             <div className="text-xl font-bold">
//               Kiadások kategóriánként
//             </div>
//             <div className="mt-5 relative flex items-center justify-center">
//               <PieChart
//                 series={[{ innerRadius: 50, outerRadius: 100, data:CHART_DATA, }]}
//                 {...CHART_SETTINGS}
//               />
//               <div className="absolute flex flex-col items-center justify-center pointer-events-none">
//                 <div className="font-bold text-xl ">
//                   {monthlyTotal.toLocaleString('hu-HU', { style: 'currency', currency: 'HUF' })}
//                 </div>
//                 <div className="text-sm font-light text-gray-500">
//                   összesen
//                 </div>
//               </div>
//             </div>
//             <div className="mt-6 flex flex-col gap-3">
//               {CHART_DATA.map((data) => (
//                 data.value > 0 && (
//                   <div key={data.id} className="flex items-center justify-between text-sm">
//                     <div className="flex items-center gap-2">
//                       <span className="inline-block shrink-0 h-4 w-4 rounded-md" style={{ backgroundColor: data.color }} />
//                       <span className="font-medium">
//                         {data.label}
//                       </span>
//                     </div>
//                     <div className="flex items-center gap-4">
//                       <span className="font-semibold">
//                         {data.value} db
//                       </span>
//                       <span className="w-10 text-right text-gray-400">
//                         {allSubscriptions > 0 ? Math.round((data.value / allSubscriptions) * 100) : 0}%
//                       </span>
//                     </div>
//                   </div>
//                 )
//               ))}
//             </div>
//           </div>
//         </div>
// 
//         <div className="w-full max-w-7xl gap-4 grid grid-cols-1 md:grid-cols-10 ">
//           <div className="md:col-span-6 rounded-3xl border border-amber-100 bg-amber-50 p-6 flex flex-row items-center">
//             <div className="flex h-13 w-13 bg-amber-100 items-center justify-center rounded-2xl">
//               <CiBellOn className="text-4xl text-amber-500 items-center justify-center font-bold-4xl" />
//             </div>
//             <div className="ml-7">
//               <div className="font-bold text-black">
//                 előfizetésed X nap múlva megújul.
//               </div>
//               <div className="text-sm text-gray-600 mt-1">
//                 Augusztus valahányadika
//               </div>
//             </div>
//             <div className="ml-auto justify-end-safe cursor-pointer py-1 px-5 bg-orange-50 rounded-2xl font-bold ">
//               <div className="max-w-xl items-center justify-end flex text-orange-400 ">
//                 Részletek
//                 <MdOutlineKeyboardArrowRight className="ml-2 text-2xl" />
//               </div>
//             </div>
//           </div>
//         </div>
// 
//         <div className="w-full max-w-7xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-md">
//           <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
//             <div>
//               <div className="text-xl font-black text-slate-950">
//                 Barátaid aktivitásai
//               </div>
//               <div className="mt-1 text-sm text-slate-500">
//                 Ajánlások, tippek és listák a SpendFox körödből.
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={() => {
//                 window.location.href = "/profile";
//               }}
//               className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
//             >
//               Saját ajánlás írása
//             </button>
//           </div>
// 
//           <div className="mt-6 grid gap-4 lg:grid-cols-2">
//             {feedActivities.length > 0 ? (
//               feedActivities.map((activity) => (
//                 <FeedActivityCard key={activity.id} activity={activity} />
//               ))
//             ) : (
//               <div className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-slate-50 p-8 text-center">
//                 <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
//                   <FiMessageCircle />
//                 </div>
//                 <div className="mt-4 text-xl font-black text-slate-950">
//                   Még nincs aktivitás a feedben
//                 </div>
//                 <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
//                   Küldj barátkérést, vagy ossz meg egy ajánlást a profilodon. Itt fog
//                   megjelenni, mit használnak és mit ajánlanak a barátaid.
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
// 
//     </>
//   );
// }
// 
// export default HomeScreen;

export default function HomeScreenOld() {
  return null;
}
