import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, CalendarDays, CheckCircle2, PlusCircle, Clock3,
  FileText, MapPin, Plane, RefreshCw, Sun, Moon as MoonIcon, XCircle, Briefcase, Bell,
} from "lucide-react";
import { format } from "date-fns";
import api from "../../lib/api";
import { TravelRequest } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

function TravelBanner({ children }: { children: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[142px] items-center overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#F0F5FF] via-[#F7FAFF] to-[#EAF1FF] px-4 py-3 sm:px-6 sm:py-4">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.22]" aria-hidden="true">
        <svg viewBox="0 0 1200 180" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#C9DAF8"/><stop offset="1" stopColor="#f5faff"/></linearGradient></defs>
          <rect width="1200" height="180" fill="url(#sky)" />
          <path d="M0 145 110 72 180 119 265 54 350 132 445 78 530 135 640 65 735 128 835 77 935 136 1040 64 1200 128V180H0Z" fill="#C6D8F2" opacity=".65" />
          <path d="M0 160 150 112 260 150 390 100 500 157 640 111 760 154 910 106 1040 151 1150 103 1200 125V180H0Z" fill="#E1EBF9" />
          <path d="M470 70 Q560 20 650 76 T835 66 T1000 58" fill="none" stroke="#4F83F1" strokeWidth="2" strokeDasharray="5 8" />
          <g fill="#4F83F1"><circle cx="470" cy="70" r="8"/><circle cx="835" cy="66" r="8"/><path d="M646 60l32 11-32 11 6-11z"/></g>
          <g fill="#fff" opacity=".75"><ellipse cx="1010" cy="32" rx="40" ry="12"/><ellipse cx="1035" cy="24" rx="22" ry="16"/><ellipse cx="1060" cy="34" rx="30" ry="10"/></g>
          <g transform="translate(1080 40)" fill="#8EACDE"><rect x="0" y="42" width="90" height="98" rx="2"/><rect x="14" y="23" width="62" height="25"/><rect x="25" y="0" width="40" height="25"/><rect x="32" y="-10" width="26" height="12"/><path d="M-8 54h108v8H-8z" fill="#e7f3ff"/>{Array.from({length:4},(_,i)=><rect key={i} x={10+i*20} y="70" width="9" height="12" fill="#d5eaff"/> )}</g>
        </svg>
      </div>
      <div className="relative z-10 flex w-full flex-col justify-center gap-3 md:flex-row md:items-center md:justify-between">
        {children}
      </div>
      <Plane className="pointer-events-none absolute right-[28%] top-8 z-[1] hidden h-7 w-7 rotate-[-12deg] text-[#3F73DF]/40 sm:block" />
    </section>
  );
}

export default function EmployeeDashboard() {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const navigate = useNavigate();

  const loadRequests = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/travel/my");
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError("Could not load your travel requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    const timer = window.setInterval(() => void loadRequests(), 15000);
    return () => window.clearInterval(timer);
  }, [loadRequests]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status.startsWith("PENDING")).length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length,
  }), [requests]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
  const cards = [
    { label: "Total Requests", value: stats.total, color: "blue", Icon: FileText, filter: "all" },
    { label: "Pending Approval", value: stats.pending, color: "amber", Icon: Clock3, filter: "pending" },
    { label: "Approved", value: stats.approved, color: "emerald", Icon: CheckCircle2, filter: "approved" },
    { label: "Rejected", value: stats.rejected, color: "rose", Icon: XCircle, filter: "rejected" },
  ];
  const colorClasses: Record<string, { icon: string }> = {
    blue: { icon: "bg-[#E5EEFF] text-[#4F83F1] shadow-blue-100" },
    amber: { icon: "bg-amber-100 text-amber-600 shadow-amber-100" },
    emerald: { icon: "bg-emerald-100 text-emerald-600 shadow-emerald-100" },
    rose: { icon: "bg-rose-100 text-rose-600 shadow-rose-100" },
  };
  const openRequests = (filter = "all") => navigate(`/dashboard/my-requests${filter === "all" ? "" : `?status=${filter}`}`);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 text-slate-900 dark:text-slate-100">
      <TravelBanner>
        <div className="min-w-0 flex-1 rounded-xl px-1 py-2 sm:px-2">
          <div className="flex items-start gap-3">
            <Sun className="mt-1 h-8 w-8 shrink-0 fill-amber-400 text-amber-500" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {greeting}, {user?.name?.split(" ")[0] || "there"}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-600">
                {user?.department || "Employee"}<span className="px-2">·</span>{user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex w-full shrink-0 flex-col items-stretch gap-2 md:ml-auto md:w-auto md:min-w-[290px] md:items-end">
          <div className="flex items-center justify-end gap-2 rounded-lg border border-white/70 bg-white/45 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-[2px]">
            <CalendarDays size={15} className="shrink-0 text-slate-500" />
            <span className="whitespace-nowrap">{today}</span>
            <span className="mx-1 h-4 w-px bg-slate-300/80" />
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-md p-1.5 text-slate-600 transition hover:bg-white hover:text-[#3F73DF]"
            >
              {theme === "dark" ? <Sun size={16} /> : <MoonIcon size={16} />}
            </button>
            <span
              title={isOnline ? "Online" : "Offline"}
              aria-label={isOnline ? "Online" : "Offline"}
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/new-request")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#3F73DF]"
            >
              <PlusCircle size={18} />
              New Travel Request
            </button>
          </div>
        </div>
      </TravelBanner>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, color, Icon, filter }) => (
          <button key={label} onClick={() => openRequests(filter)} className="group min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-[0_3px_12px_rgba(25,65,120,0.06)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${colorClasses[color].icon}`}><Icon size={20} /></span><ArrowRight size={20} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" /></div>
            <p className="mt-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
            <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-slate-900 dark:text-white">{loading ? "—" : value}</p>
          </button>
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(275px,1fr)] xl:gap-5">
        <div className="flex min-w-0 flex-col gap-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-950">
            <Bell size={19} />
          </span>
          <div>
            <h2 className="text-base font-semibold">Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Updates based on your travel request statuses
            </p>
          </div>
        </div>
        {requests.length === 0 ? (
          <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
            {loading ? "Checking for updates…" : "No request updates yet."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests
              .filter((request) => ["APPROVED", "REJECTED"].includes(request.status) || request.status.startsWith("PENDING"))
              .slice(0, 3)
              .map((request) => {
                const approved = request.status === "APPROVED";
                const rejected = request.status === "REJECTED";
                const statusText = approved
                  ? "Your travel request has been approved."
                  : rejected
                    ? "Your travel request was rejected."
                    : request.status === "PENDING_HOD"
                      ? "Your travel request is awaiting HOD approval."
                      : request.status === "PENDING_DIRECTOR"
                        ? "Your travel request is awaiting Director approval."
                        : "Your travel request is awaiting Travel Manager processing.";
                return (
                  <button
                    type="button"
                    key={request.id}
                    onClick={() => navigate(`/dashboard/request/${request.id}`)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${approved ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : rejected ? "bg-rose-50 text-rose-600 dark:bg-rose-950" : "bg-amber-50 text-amber-600 dark:bg-amber-950"}`}>
                      {approved ? <CheckCircle2 size={17} /> : rejected ? <XCircle size={17} /> : <Clock3 size={17} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{statusText}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {request.fromLocation} → {request.toLocation}
                      </span>
                    </span>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400" />
                  </button>
                );
              })}
          </div>
        )}
      </section>


      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-950"><FileText size={22} /></span><div><h2 className="text-base font-semibold">Recent Travel Requests</h2><p className="text-sm text-slate-500 dark:text-slate-400">{requests.length} total submission{requests.length !== 1 ? "s" : ""}</p></div></div>
          <button onClick={() => navigate("/dashboard/my-requests")} className="inline-flex items-center gap-2 self-start text-sm font-medium text-[#4F83F1] hover:text-[#3F73DF] sm:self-auto">View all <ArrowRight size={17} /></button>
        </div>
        {error && <div className="mx-5 mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error} <button onClick={() => void loadRequests()} className="ml-2 font-bold underline">Retry</button></div>}
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading travel requests…</div> : requests.length === 0 ? (
          <div className="px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-950"><FileText size={22} /></span><p className="mt-3 font-medium">No requests submitted yet</p><p className="mt-1 text-sm text-slate-500">Submit your first travel request to begin the approval process.</p><button onClick={() => navigate("/dashboard/new-request")} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4F83F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3F73DF]"><PlusCircle size={16} /> Submit Request</button></div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto"><div className="min-w-[700px]"><div className="grid grid-cols-[2.15fr_1.1fr_1.95fr_1.35fr_44px] items-center gap-3 bg-slate-50/90 px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400"><span>Route</span><span>Travel type</span><span>Travel dates</span><span>Status</span><span className="text-center">Actions</span></div>
            {requests.slice(0, 6).map(r => {
              const statusLabel = r.status === "PENDING_HOD" ? "With HOD" : r.status === "PENDING_DIRECTOR" ? "With Director" : r.status === "PENDING_TRAVEL_MANAGER" ? "With Travel Mgr" : r.status === "APPROVED" ? "Approved" : "Rejected";
              const statusStyle = r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : r.status === "REJECTED" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-[#F0F5FF] text-[#3F73DF] dark:bg-blue-950 dark:text-blue-300";
              return <button key={r.id} onClick={() => navigate(`/dashboard/request/${r.id}`)} className="grid w-full grid-cols-[2.15fr_1.1fr_1.95fr_1.35fr_44px] items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left transition hover:bg-[#F0F5FF]/50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                <span className="min-w-0"><span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white"><MapPin size={18} className="shrink-0 fill-blue-600 text-[#4F83F1]" /><span className="truncate">{r.fromLocation}</span><span className="flex shrink-0 items-center gap-0.5 text-[#4F83F1]"><span className="w-3 border-t-2 border-dotted border-[#8EACDE]"/><Plane size={18} className="fill-blue-500"/><span className="w-3 border-t-2 border-dotted border-[#8EACDE]"/></span><MapPin size={18} className="shrink-0 fill-blue-600 text-[#4F83F1]" /><span className="truncate">{r.toLocation}</span></span><span className="mt-1 block truncate pl-6 text-xs text-slate-500 dark:text-slate-400">{r.purposeOfVisit}</span></span>
                <span><span className="inline-flex whitespace-nowrap rounded-xl bg-[#F0F5FF] px-3 py-2 text-xs font-normal text-[#4F83F1] dark:bg-blue-950 dark:text-blue-300">{r.travelType === "INTER_COMPANY" ? "Inter Company" : "Outside"}</span></span>
                <span className="flex items-center gap-2 whitespace-nowrap text-sm font-normal text-slate-700 dark:text-slate-300"><CalendarDays size={18} className="shrink-0 text-slate-500" />{format(new Date(r.fromDate), "dd MMM yyyy")} – {format(new Date(r.toDate), "dd MMM yyyy")}</span>
                <span><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium ${statusStyle}`}><Briefcase size={16}/>{statusLabel}</span></span><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[#4F83F1] transition hover:bg-[#E5EEFF] dark:border-slate-700 dark:bg-slate-800"><ArrowRight size={19} /></span>
              </button>;
            })}</div></div>
        )}
      </section>
        </div>
        <div className="flex min-w-0">
      <section className="flex h-full w-full flex-col rounded-xl border border-[#DCE7F8] bg-white p-4 shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950">
            <PlusCircle size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Common travel request actions</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/my-requests")}
            className="group flex min-h-[76px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#DCE7F8] bg-[#F8FAFF] px-3 py-3 text-left transition hover:border-[#B8CCF3] hover:bg-[#F0F5FF] dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] transition group-hover:bg-[#DCE8FF] dark:bg-blue-950">
              <FileText size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">My Requests</span>
              <span className="mt-0.5 block text-xs leading-4 text-slate-500 dark:text-slate-400">Track and manage requests</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/new-request")}
            className="group flex min-h-[76px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#DCE7F8] bg-[#F8FAFF] px-3 py-3 text-left transition hover:border-[#B8CCF3] hover:bg-[#F0F5FF] dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] transition group-hover:bg-[#DCE8FF] dark:bg-blue-950">
              <PlusCircle size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">New Request</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Raise a travel request</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" />
          </button>
        </div>
      </section>


        </div>
      </div>
    </div>
  );
}
