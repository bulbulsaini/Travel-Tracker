
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plane,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  BedDouble,
  User,
  Mail,
  Eye,
  Sun,
  Moon,
  ArrowRight,
  Search,
  X,
  CalendarDays,
  RefreshCw,
  CheckCircle2,
  Clock3,
  PlusCircle,
  ClipboardList,
} from "lucide-react";
import api from "../../lib/api";
import { TravelRequest } from "../../types";
import { StatusBadge } from "../ui/Badges";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

type ChartStat = {
  label: string;
  value: number;
  accent: string;
};

function DirectorStatsChart({ items }: { items: ChartStat[] }) {
  const statusItems = items.filter((item) => item.label !== "Total");
  const total = items.find((item) => item.label === "Total")?.value ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-800">
            Request Status Overview
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Current request distribution</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
        </span>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(96px,0.7fr)_minmax(0,1.3fr)] items-center gap-2 p-2.5 sm:p-3">
        <div className="flex min-w-0 items-center justify-center rounded-xl bg-slate-50 px-1.5 py-2">
          <div className="relative h-28 w-28 shrink-0">
            <svg
              viewBox="0 0 160 160"
              role="img"
              aria-label={`Request status donut chart. ${total} total requests`}
              className="h-full w-full -rotate-90"
            >
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#e9eef5" strokeWidth="17" />
              {statusItems.map((item) => {
                const segmentLength = total > 0 ? (item.value / total) * circumference : 0;
                const offset = accumulated;
                accumulated += segmentLength;
                return segmentLength > 0 ? (
                  <circle
                    key={item.label}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={item.accent}
                    strokeWidth="17"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(0, segmentLength - 2)} ${circumference}`}
                    strokeDashoffset={-offset}
                  />
                ) : null;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Total</span>
              <span className="mt-0.5 text-3xl font-semibold leading-none text-slate-900">{total}</span>
              <span className="mt-1 text-[10px] text-slate-500">requests</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status breakdown</h3>
            <span className="hidden text-[10px] text-slate-400 sm:inline">Count · Share</span>
          </div>
          <div className="space-y-1.5">
            {statusItems.map((item) => {
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label} className="rounded-lg border border-slate-100 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.accent }} />
                      <span className="truncate text-xs font-medium text-slate-700">{item.label}</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{item.value}</span>
                      <span className="w-8 text-right text-[10px] tabular-nums text-slate-500">{percentage}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: item.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DirectorDashboard() {
  const [pending, setPending] = useState<TravelRequest[]>([]);
  const [all, setAll] = useState<TravelRequest[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<TravelRequest | null>(null);

  const [modal, setModal] = useState<{
    req: TravelRequest;
    action: "approve" | "reject";
  } | null>(null);

  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();

  const isPendingPage = location.pathname.endsWith("/pending");
  const isAllRequestsPage = location.pathname.endsWith("/all-requests");

  const queryParams = new URLSearchParams(location.search);
  const selectedStatus = queryParams.get("status") || "ALL";

  const filteredRequests = all.filter(
    (request) => selectedStatus === "ALL" || request.status === selectedStatus
  );

  const filteredPending = pending.filter((request) => {
    const query = pendingSearch.trim().toLowerCase();
    if (!query) return true;

    return [
      request.employeeName,
      request.department,
      request.employee?.email,
      request.fromLocation,
      request.toLocation,
      request.purposeOfVisit,
      request.hod?.name,
      request.fromDate ? format(new Date(request.fromDate), "dd MMM yyyy") : "",
      request.toDate ? format(new Date(request.toDate), "dd MMM yyyy") : "",
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const requestTabs = [
    { label: "All", value: "ALL" },
    { label: "Pending HOD", value: "PENDING_HOD" },
    { label: "Pending Director", value: "PENDING_DIRECTOR" },
    { label: "With Travel Mgr", value: "PENDING_TRAVEL_MANAGER" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const fetchData = () => {
    setError("");

    api
      .get("/travel/director/pending")
      .then((response) => setPending(response.data))
      .catch((err) => {
        console.error("Failed to load pending:", err);
        setError("Failed to load pending requests.");
      });

    api
      .get("/travel/director/all")
      .then((response) => setAll(response.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const handleAction = async () => {
    if (!modal) return;

    setLoading(true);

    try {
      await api.patch(`/travel/${modal.req.id}/director-action`, {
        action: modal.action,
        comment,
      });

      toast.success(
        modal.action === "approve"
          ? "Approved & sent to Travel Manager!"
          : "Request rejected"
      );

      setModal(null);
      setComment("");
      setExpanded(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((previous) => (previous === id ? null : id));

  const stats = [
    {
      label: "Awaiting",
      value: pending.length,
      icon: Clock,
      grad: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-500",
      accent: "#f7a13c",
      sub: "Click to review pending approvals",
      pct: all.length
        ? Math.round((pending.length / all.length) * 100)
        : 0,
      onClick: () => navigate("/dashboard/pending"),
    },
    {
      label: "Approved",
      value: all.filter((request) =>
        ["APPROVED", "PENDING_TRAVEL_MANAGER"].includes(request.status)
      ).length,
      icon: CheckCircle,
      grad: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-500",
      accent: "#1fbf9f",
      sub: "View approved requests",
      pct: all.length
        ? Math.round(
            (all.filter((request) =>
              ["APPROVED", "PENDING_TRAVEL_MANAGER"].includes(request.status)
            ).length /
              all.length) *
              100
          )
        : 0,
      onClick: () =>
        navigate("/dashboard/all-requests?status=APPROVED"),
    },
    {
      label: "Rejected",
      value: all.filter((request) => request.status === "REJECTED").length,
      icon: XCircle,
      grad: "from-rose-50 to-red-50",
      iconBg: "bg-rose-500",
      accent: "#f0507a",
      sub: "View rejected requests",
      pct: all.length
        ? Math.round(
            (all.filter((request) => request.status === "REJECTED").length /
              all.length) *
              100
          )
        : 0,
      onClick: () =>
        navigate("/dashboard/all-requests?status=REJECTED"),
    },
    {
      label: "Total",
      value: all.length,
      icon: TrendingUp,
      grad: "from-blue-50 to-indigo-50",
      iconBg: "bg-[#F0F5FF]0",
      accent: "#4F83F1",
      sub: "View all requests",
      pct: all.length ? 100 : 0,
      onClick: () => navigate("/dashboard/all-requests?status=ALL"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard header, statistics and notifications */}
      {!isPendingPage && !isAllRequestsPage && (
        <>
          <section className="relative isolate flex min-h-[142px] flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#e8f3ff] via-[#f2f8ff] to-[#e1efff] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
              <svg viewBox="0 0 1100 170" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <path d="M0 135 110 70 190 115 285 48 370 128 470 72 560 132 665 65 770 125 875 72 980 130 1100 82V170H0Z" fill="#DCE7F8" />
                <path d="M420 58 Q510 12 600 66 T790 58 T950 48" fill="none" stroke="#8EAEF5" strokeWidth="2" strokeDasharray="5 8" />
                <circle cx="420" cy="58" r="7" fill="#B8CCF7" />
                <circle cx="790" cy="58" r="7" fill="#B8CCF7" />
              </svg>
            </div>

            <div className="relative z-10 min-w-0">
              <div className="flex items-start gap-3">
                <Sun className="mt-1 h-8 w-8 shrink-0 fill-amber-400 text-amber-500" />
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, {user?.name?.split(" ")[0] || "there"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {user?.department || "Director"}{user?.email ? ` · ${user.email}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <div className="flex items-center justify-end gap-2 rounded-lg border border-white/80 bg-white/65 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                <CalendarDays size={15} className="text-slate-500" />
                <span className="whitespace-nowrap">{format(new Date(), "EEE, dd MMM, yyyy")}</span>
                <span className="mx-1 h-4 w-px bg-slate-300" />
                <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-md p-1.5 text-slate-600 transition hover:bg-white">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={fetchData} className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white">
                  <RefreshCw size={16} /> Refresh
                </button>
                <button type="button" onClick={() => navigate("/dashboard/pending")} className="inline-flex items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#3F73DF]">
                  <CheckCircle2 size={17} /> Review Pending
                </button>
              </div>
            </div>
          </section>

          <section aria-label="Director travel request statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Requests", value: all.length, icon: FileText, iconBg: "bg-sky-100 text-sky-600", onClick: () => navigate("/dashboard/all-requests?status=ALL") },
              { label: "Pending Approval", value: pending.length, icon: Clock3, iconBg: "bg-amber-100 text-amber-600", onClick: () => navigate("/dashboard/pending") },
              { label: "Approved", value: all.filter((r) => ["APPROVED", "PENDING_TRAVEL_MANAGER"].includes(r.status)).length, icon: CheckCircle2, iconBg: "bg-emerald-100 text-emerald-600", onClick: () => navigate("/dashboard/all-requests?status=APPROVED") },
              { label: "Rejected", value: all.filter((r) => r.status === "REJECTED").length, icon: XCircle, iconBg: "bg-rose-100 text-rose-600", onClick: () => navigate("/dashboard/all-requests?status=REJECTED") },
            ].map(({ label, value, icon: Icon, iconBg, onClick }) => (
              <button key={label} type="button" onClick={onClick} className="group min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-[0_3px_12px_rgba(25,65,120,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}><Icon size={20} /></span>
                  <ArrowRight size={20} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600" />
                </div>
                <p className="mt-2.5 text-sm font-medium text-slate-700">{label}</p>
                <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
              </button>
            ))}
          </section>

          <section aria-label="Quick actions" className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
              <p className="mt-0.5 text-xs text-slate-500">Quick access to travel requests</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/new-request")}
                className="group flex items-center justify-between gap-4 rounded-xl border border-[#DCE7F8] bg-white p-4 text-left shadow-sm transition hover:border-[#B8CCF3] hover:bg-[#F0F5FF]/60 hover:shadow-md"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#4F83F1]">
                    <PlusCircle size={21} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">New Request</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Create a new travel request</span>
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#4F83F1]" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/my-requests")}
                className="group flex items-center justify-between gap-4 rounded-xl border border-[#DCE7F8] bg-white p-4 text-left shadow-sm transition hover:border-[#B8CCF3] hover:bg-[#F0F5FF]/60 hover:shadow-md"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#4F83F1]">
                    <ClipboardList size={21} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">My Requests</span>
                    <span className="mt-0.5 block text-xs text-slate-500">View your submitted requests</span>
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#4F83F1]" />
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.9fr)]">
          <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 size={19} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Pending Your Approval</h2>
                  <p className="text-sm text-slate-500">Employee travel requests awaiting your decision</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {pending.filter((request) => request.status === "PENDING_DIRECTOR").length} Pending
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard/pending")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4F83F1] transition hover:text-[#3F73DF]"
              >
                View All <ArrowRight size={15} />
              </button>
            </div>

            {pending.filter((request) => request.status === "PENDING_DIRECTOR").length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center text-sm text-slate-500">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={26} />
                No requests are waiting for your approval.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Travel Dates</th>
                      <th className="px-4 py-3">Purpose</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pending
                      .filter((request) => request.status === "PENDING_DIRECTOR")
                      .slice(0, 5)
                      .map((request) => (
                        <tr key={request.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="whitespace-nowrap font-semibold text-slate-800">{request.employeeName || "—"}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{request.department || "—"}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={14} className="shrink-0 text-blue-500" />
                              {request.fromLocation || "—"} <span className="text-slate-400">→</span> {request.toLocation || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {request.fromDate && request.toDate
                              ? `${format(new Date(request.fromDate), "dd MMM")} – ${format(new Date(request.toDate), "dd MMM yyyy")}`
                              : "—"}
                          </td>
                          <td className="max-w-[170px] px-4 py-3 text-slate-600">
                            <span className="block truncate" title={request.purposeOfVisit || "Not specified"}>
                              {request.purposeOfVisit || "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {request.createdAt && !Number.isNaN(new Date(request.createdAt).getTime())
                              ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setModal({ req: request, action: "approve" }); setComment(""); }}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => { setModal({ req: request, action: "reject" }); setComment(""); }}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => setViewModal(request)}
                                aria-label={`View ${request.employeeName || "employee"} request`}
                                title="View details"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#DCE7F8] hover:bg-[#F0F5FF] hover:text-[#3F73DF]"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <DirectorStatsChart items={stats} />
          </div>
        </>
      )}

      {/* Existing page heading for Pending Approvals and All Requests */}
      {(isPendingPage || isAllRequestsPage) && (
        <div className="pb-5 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">{isPendingPage ? "Director Approvals" : "All Requests"}</h1>
          <p className="mt-0.5 text-sm text-gray-400">{isPendingPage ? "Review and manage travel requests requiring your final decision" : "View and monitor all travel requests"}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pending approvals */}
      {isPendingPage && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                Awaiting Your Decision
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {pending.length} request{pending.length !== 1 ? "s" : ""} approved by the HOD and awaiting your final decision.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={pendingSearch}
                onChange={(event) => setPendingSearch(event.target.value)}
                placeholder="Search employee, route, date..."
                aria-label="Search pending approvals"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#8EAEF5] focus:ring-2 focus:ring-[#F0F5FF]"
              />
              {pendingSearch && (
                <button
                  type="button"
                  onClick={() => setPendingSearch("")}
                  aria-label="Clear pending search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="flex min-h-[118px] w-full items-center justify-center bg-gradient-to-r from-slate-50/80 via-white to-blue-50/40 px-5 py-4">
              <div className="flex w-full max-w-2xl items-center gap-4 sm:gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm">
                  <CheckCircle size={21} strokeWidth={2} />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-slate-900">
                      No pending decisions
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      {pending.length} Requests Awaiting
                    </span>
                  </div>

                  <p className="mt-1 text-[13px] leading-5 text-slate-500">
                    All caught up! There are currently no travel requests awaiting your approval.
                  </p>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock3 size={13} className="shrink-0 text-blue-500" />
                    New requests will appear here when they are ready for your decision.
                  </p>
                </div>
              </div>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="flex min-h-[118px] items-center justify-center px-5 py-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-800">No matching requests</p>
                <p className="mt-1 text-xs text-slate-500">Try another employee name, route, department, or date.</p>
                <button
                  type="button"
                  onClick={() => setPendingSearch("")}
                  className="mt-2 text-xs font-semibold text-[#4F83F1] hover:text-[#3F73DF]"
                >
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            <div>
              {filteredPending.map((request, index) => (
                <div
                  key={request.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    expanded === request.id ? "bg-[#F0F5FF]/30" : ""
                  }`}
                >
                  <div
                    className="group flex cursor-pointer items-center justify-between px-5 py-4 transition hover:bg-gray-50"
                    onClick={() => toggleExpand(request.id)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800">
                          {request.employeeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {request.department}
                        </div>
                      </div>

                      <div className="hidden items-center gap-1.5 text-sm text-gray-600 md:flex">
                        <MapPin size={12} className="text-gray-400" />
                        {request.fromLocation}
                        <span className="text-gray-400">→</span>
                        {request.toLocation}
                      </div>

                      <div className="hidden items-center gap-1.5 text-xs text-gray-500 lg:flex">
                        <Calendar size={11} className="text-gray-400" />
                        {format(new Date(request.fromDate), "dd MMM")} –{" "}
                        {format(new Date(request.toDate), "dd MMM yyyy")}
                      </div>

                      {request.hod?.name && (
                        <div className="hidden items-center gap-1.5 text-xs text-gray-500 lg:flex">
                          <User size={11} className="text-gray-400" />
                          HOD: {request.hod.name}
                        </div>
                      )}
                    </div>

                    
<div className="ml-4 flex flex-shrink-0 flex-wrap items-center gap-2">
  <button
    onClick={(event) => {
      event.stopPropagation();
      setModal({ req: request, action: "approve" });
      setComment("");
    }}
    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
  >
    Final Approve
  </button>

  <button
    onClick={(event) => {
      event.stopPropagation();
      setModal({ req: request, action: "reject" });
      setComment("");
    }}
    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
  >
    Reject
  </button>

  <button
    onClick={(event) => {
      event.stopPropagation();
      toggleExpand(request.id);
    }}
    className="text-xs font-medium text-[#4F83F1] hover:underline"
  >
    {expanded === request.id ? "Hide details" : "View details"}
  </button>

  {expanded === request.id ? (
    <ChevronUp size={15} className="text-gray-400" />
  ) : (
    <ChevronDown size={15} className="text-gray-400" />
  )}
</div>

                  </div>

                  {expanded === request.id && (
                    <div className="border-t border-[#DCE7F8] px-5 pb-5">
                      <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          {
                            label: "From",
                            value: request.fromLocation,
                            icon: MapPin,
                          },
                          {
                            label: "To",
                            value: request.toLocation,
                            icon: MapPin,
                          },
                          {
                            label: "Departure",
                            value: format(
                              new Date(request.fromDate),
                              "dd MMM yyyy"
                            ),
                            icon: Calendar,
                          },
                          {
                            label: "Return",
                            value: format(
                              new Date(request.toDate),
                              "dd MMM yyyy"
                            ),
                            icon: Calendar,
                          },
                          {
                            label: "Transport",
                            value: request.transportMode,
                            icon: Briefcase,
                          },
                          {
                            label: "Estimated Cost",
                            value: request.estimatedCost
                              ? `₹${request.estimatedCost.toLocaleString()}`
                              : "Not specified",
                            icon: DollarSign,
                          },
                        ].map(({ label, value, icon: Icon }) => (
                          <div
                            key={label}
                            className="rounded-md border border-gray-200 bg-white px-3 py-2.5"
                          >
                            <div className="mb-1 flex items-center gap-1.5">
                              <Icon size={12} className="text-[#4F83F1]" />
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                {label}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-gray-800">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                          Purpose of Visit
                        </h4>
                        <p className="rounded-md border border-gray-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700">
                          {request.purposeOfVisit}
                        </p>
                      </div>

                      {request.additionalNotes && (
                        <div className="mt-4">
                          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                            Additional Notes
                          </h4>
                          <p className="rounded-md border border-gray-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700">
                            {request.additionalNotes}
                          </p>
                        </div>
                      )}

                      {request.hodComment && (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                            <User size={11} />
                            HOD Comment — {request.hod?.name}
                          </div>
                          {request.hodComment}
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ req: request, action: "reject" });
                            setComment("");
                          }}
                          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Reject
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ req: request, action: "approve" });
                            setComment("");
                          }}
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle size={14} /> Final Approve
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* All requests */}
      {isAllRequestsPage && (
        <section className="space-y-4">
          <div className="border-t border-slate-200 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {requestTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => navigate(`/dashboard/all-requests?status=${tab.value}`)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-medium transition outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8CCF7] ${
                    selectedStatus === tab.value
                      ? "border-[#4F83F1] bg-[#4F83F1] text-white shadow-sm ring-0"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#DCE7F8] hover:bg-[#F0F5FF]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filteredRequests.length === 0 ? (
              <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden bg-gradient-to-br from-white via-white to-blue-50/70 px-5 py-8">
                <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#E5EEFF]/40 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sky-100/50 blur-2xl" />

                <div className="relative z-10 mx-auto max-w-md text-center">
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm">
                    <Plane size={27} strokeWidth={1.8} />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E5EEFF] text-[#3F73DF]">
                      <FileText size={12} />
                    </span>
                  </div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4F83F1]">
                    {selectedStatus === "ALL" ? "Travel requests" : requestTabs.find((tab) => tab.value === selectedStatus)?.label || "Travel requests"}
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                    {selectedStatus === "ALL" ? "No travel requests yet" : "No requests in this category"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {selectedStatus === "ALL"
                      ? "New travel requests will appear here as soon as employees submit them."
                      : `There are currently no ${requestTabs.find((tab) => tab.value === selectedStatus)?.label.toLowerCase() || "matching"} requests. Try another status filter to see more records.`}
                  </p>

                  <button
                    type="button"
                    onClick={() => selectedStatus === "ALL" ? fetchData() : navigate("/dashboard/all-requests?status=ALL")}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3F73DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8CCF7] focus-visible:ring-offset-2"
                  >
                    {selectedStatus === "ALL" ? "Refresh requests" : "View all requests"}
                    {selectedStatus === "ALL" ? <RefreshCw size={14} /> : <ArrowRight size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Purpose</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ticket</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="transition hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={16} className="shrink-0 fill-blue-600 text-[#4F83F1]" />
                            {request.fromLocation || "—"}
                            <Plane size={15} className="mx-1 shrink-0 text-blue-500" />
                            <MapPin size={16} className="shrink-0 fill-blue-600 text-[#4F83F1]" />
                            {request.toLocation || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="rounded-xl bg-[#F0F5FF] px-3 py-2 text-xs font-medium text-[#3F73DF]">
                            {request.travelType === "INTER_COMPANY" ? "Inter Co." : "Outside"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <Calendar size={15} className="text-slate-500" />
                            {request.fromDate && request.toDate
                              ? `${format(new Date(request.fromDate), "dd MMM yyyy")} – ${format(new Date(request.toDate), "dd MMM yyyy")}`
                              : "—"}
                          </span>
                        </td>
                        <td className="max-w-[190px] px-4 py-3.5 text-slate-700">
                          <span className="block truncate" title={request.purposeOfVisit || ""}>
                            {request.purposeOfVisit || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="inline-flex rounded-xl bg-slate-50 p-1">
                            <StatusBadge status={request.status} />
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                          {request.ticketFile
                            ? <span className="font-medium text-emerald-600">Uploaded</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                          {request.createdAt && !Number.isNaN(new Date(request.createdAt).getTime())
                            ? format(new Date(request.createdAt), "dd MMM yyyy")
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setViewModal(request)}
                            aria-label={`View request ${request.id}`}
                            className="inline-flex items-center gap-1.5 font-medium text-[#4F83F1] transition hover:text-[#3F73DF]"
                          >
                            <Eye size={15} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Travel request details */}
      {viewModal && (() => {
        const status = viewModal.status;
        const isRejected = status === "REJECTED";
        const isDirectorPending = status === "PENDING_DIRECTOR";
        const hodDone = ["PENDING_DIRECTOR", "PENDING_TRAVEL_MANAGER", "APPROVED"].includes(status);
        const directorDone = ["PENDING_TRAVEL_MANAGER", "APPROVED"].includes(status);
        const travelDone = status === "APPROVED";
        const steps = [
          { label: "Employee", detail: "Request submitted", done: true, active: false },
          { label: "HOD", detail: status === "PENDING_HOD" ? "Awaiting approval" : hodDone ? "Review completed" : "Upcoming", done: hodDone, active: status === "PENDING_HOD" },
          { label: "Director", detail: isDirectorPending ? "Awaiting approval" : directorDone ? "Review completed" : "Upcoming", done: directorDone, active: isDirectorPending },
          { label: "Travel Manager", detail: status === "PENDING_TRAVEL_MANAGER" ? "Processing" : travelDone ? "Completed" : "Upcoming", done: travelDone, active: status === "PENDING_TRAVEL_MANAGER" },
        ];
        const dateText = (value: string | Date | undefined) => {
          const date = value ? new Date(value) : null;
          return date && !Number.isNaN(date.getTime()) ? format(date, "dd MMM yyyy") : "—";
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
            onClick={() => setViewModal(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="travel-request-title"
              className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1]">
                    <Plane size={23} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="travel-request-title" className="text-lg font-bold text-slate-900">
                      Travel Request Details
                    </h3>
                    <p className="text-xs text-slate-500">Complete information and approval status</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={status} />
                  <button
                    type="button"
                    onClick={() => setViewModal(null)}
                    aria-label="Close request details"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1]"
                  >
                    <XCircle size={21} />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                <section className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F0F5FF] text-xl font-bold text-[#3F73DF] ring-4 ring-blue-50">
                      {(viewModal.employeeName || "E").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900">{viewModal.employeeName || "Employee"}</h4>
                      <p className="text-sm text-slate-500">{viewModal.department || "Department not specified"}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail size={12} /> {viewModal.employee?.email || "Email not available"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                    <div className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Submitted on</p>
                      <p className="text-sm font-semibold text-slate-800">{dateText(viewModal.createdAt)}</p>
                    </div>
                    <div className="rounded-xl bg-[#F0F5FF] px-3 py-2">
                      <p className="text-[11px] text-[#4F83F1]">Request ID</p>
                      <p className="max-w-36 truncate text-sm font-semibold text-slate-800" title={String(viewModal.id)}>
                        {viewModal.id}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin size={16} className="text-[#4F83F1]" /> Travel Itinerary
                  </h4>
                  <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-xl bg-[#F0F5FF]/80 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4F83F1]">From</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{viewModal.fromLocation || "—"}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar size={13} /> Departure · {dateText(viewModal.fromDate)}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 px-2 text-[#4F83F1]">
                      <span className="hidden h-px w-8 border-t border-dashed border-[#B8CCF7] sm:block" />
                      <Plane size={22} />
                      <span className="hidden h-px w-8 border-t border-dashed border-[#B8CCF7] sm:block" />
                    </div>
                    <div className="rounded-xl bg-[#F0F5FF]/80 p-4 sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4F83F1]">To</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{viewModal.toLocation || "—"}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 sm:justify-end">
                        <Calendar size={13} /> Return · {dateText(viewModal.toDate)}
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText size={16} className="text-[#4F83F1]" /> Travel Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { icon: Calendar, label: "Departure Date", value: dateText(viewModal.fromDate) },
                      { icon: Calendar, label: "Return Date", value: dateText(viewModal.toDate) },
                      { icon: Briefcase, label: "Transport", value: viewModal.transportMode || "Not specified" },
                      { icon: DollarSign, label: "Estimated Cost", value: viewModal.estimatedCost ? `₹${viewModal.estimatedCost.toLocaleString()}` : "Not specified" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                        <Icon size={17} className="mb-2 text-[#4F83F1]" />
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
                      </div>
                    ))}
                    <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <BedDouble size={17} className="text-[#4F83F1]" /> Accommodation
                      </span>
                      <span className="rounded-lg bg-[#F0F5FF] px-3 py-1 text-xs font-semibold text-[#3F73DF]">
                        {viewModal.accommodation ? "Required" : "Not required"}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3">
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <Briefcase size={17} className="text-[#4F83F1]" /> Travel Type
                      </span>
                      <span className="rounded-lg bg-[#F0F5FF] px-3 py-1 text-xs font-semibold text-[#3F73DF]">
                        {viewModal.travelType === "INTER_COMPANY" ? "Inter Company" : "Outside"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText size={16} className="text-[#4F83F1]" /> Purpose of Visit
                  </h4>
                  <p className="rounded-lg bg-[#F0F5FF]/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
                    {viewModal.purposeOfVisit || "No purpose provided."}
                  </p>
                </section>

                {viewModal.additionalNotes && (
                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-900">Additional Notes</h4>
                    <p className="text-sm leading-relaxed text-slate-600">{viewModal.additionalNotes}</p>
                  </section>
                )}

                {(viewModal.hodComment || viewModal.directorComment) && (
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {viewModal.hodComment && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                        <p className="mb-1 text-xs font-semibold text-amber-800">HOD Comment · {viewModal.hod?.name || "HOD"}</p>
                        <p className="text-sm text-amber-900">{viewModal.hodComment}</p>
                      </div>
                    )}
                    {viewModal.directorComment && (
                      <div className="rounded-xl border border-[#DCE7F8] bg-[#F0F5FF]/70 p-3">
                        <p className="mb-1 text-xs font-semibold text-[#3F73DF]">Director Comment</p>
                        <p className="text-sm text-blue-900">{viewModal.directorComment}</p>
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-4 text-sm font-semibold text-slate-900">Approval Progress</h4>
                  {isRejected ? (
                    <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                      This request has been rejected.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {steps.map((step, index) => (
                        <div key={step.label} className="relative flex flex-col items-center text-center">
                          <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                            step.done ? "border-emerald-500 bg-emerald-50 text-emerald-600" :
                            step.active ? "border-amber-500 bg-amber-50 text-amber-600" :
                            "border-slate-200 bg-slate-50 text-slate-400"
                          }`}>
                            {step.done ? <CheckCircle size={17} /> : <Clock size={17} />}
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{step.label}</p>
                          <p className={`mt-1 text-[11px] ${
                            step.active ? "text-amber-700" : step.done ? "text-emerald-700" : "text-slate-400"
                          }`}>{step.detail}</p>
                          {index < steps.length - 1 && (
                            <span className="absolute left-[calc(50%+24px)] top-4 hidden h-px w-[calc(100%-24px)] bg-slate-200 sm:block" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-4 py-2.5 sm:px-5">
                <button
                  type="button"
                  onClick={() => setViewModal(null)}
                  className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>
                {isDirectorPending && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setViewModal(null); setModal({ req: viewModal, action: "reject" }); }}
                      className="rounded-lg border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => { setViewModal(null); setModal({ req: viewModal, action: "approve" }); }}
                      className="rounded-lg bg-[#4F83F1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3F73DF]"
                    >
                      Approve
                    </button>
                  </>
                )}
              </footer>
            </div>
          </div>
        );
      })()}

      {/* Approve / Reject modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-bold text-gray-800">
              {modal.action === "approve"
                ? "✅ Final Approval"
                : "❌ Reject Request"}
            </h3>

            <div className="mb-4 flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#4F83F1] text-xs font-bold text-white">
                {modal.req.employeeName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800">
                  {modal.req.employeeName}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Mail size={10} />
                  {modal.req.employee?.email || "—"}
                </div>
              </div>

              <div className="flex-shrink-0 text-right text-xs text-gray-500">
                <div>
                  {modal.req.fromLocation} → {modal.req.toLocation}
                </div>
                <div className="mt-0.5 text-gray-400">
                  {modal.req.department}
                </div>
              </div>
            </div>

            {modal.req.hodComment && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <User size={11} className="text-amber-600" />
                  HOD Comment — {modal.req.hod?.name}
                </div>
                {modal.req.hodComment}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Your Comment (optional)
              </label>
              <textarea
                className="h-24 w-full resize-none rounded-md border border-gray-200 px-3.5 py-2.5 text-sm transition focus:border-[#4F83F1] focus:outline-none focus:ring-2 focus:ring-[#DCE7F8]"
                placeholder="Director remarks…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setModal(null)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleAction}
                disabled={loading}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  modal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {loading
                  ? "Processing…"
                  : modal.action === "approve"
                    ? "Final Approve"
                    : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
