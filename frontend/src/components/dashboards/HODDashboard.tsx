import { Fragment, useEffect, useState } from "react";
import {
  CheckCircle, XCircle, Clock, Users, MapPin, BedDouble, Mail, Eye, Filter,
  Search, Trash2, X, LayoutDashboard, ClipboardList, PlusCircle, RefreshCw,
  Sun, CalendarDays, ArrowRight,
} from "lucide-react";
import api from "../../lib/api";
import { TravelRequest } from "../../types";
import { StatusBadge } from "../ui/Badges";
import { useAuth } from "../../hooks/useAuth";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return null;

  const cls =
    grade >= 7 ? "bg-purple-100 text-purple-700" :
    grade >= 5 ? "bg-[#DCE7F8] text-[#3F73DF]" :
    grade >= 3 ? "bg-green-100 text-green-700" :
    "bg-gray-100 text-gray-600";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cls}`}>
      G{grade}
    </span>
  );
}

type StatusFilter =
  | "ALL"
  | "PENDING_HOD"
  | "PENDING_DIRECTOR"
  | "PENDING_TRAVEL_MANAGER"
  | "APPROVED"
  | "REJECTED";

type DashTab = "dashboard" | "history" | "pending";

export default function HODDashboard() {
  const [dashTab, setDashTab] = useState<DashTab>("dashboard");
  const [pending, setPending] = useState<TravelRequest[]>([]);
  const [all, setAll] = useState<TravelRequest[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    req: TravelRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TravelRequest | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isHistory = location.pathname.includes("all-requests");
    const isPendingPage = location.pathname.endsWith("/pending");
    setDashTab(isHistory ? "history" : isPendingPage ? "pending" : "dashboard");

    const params = new URLSearchParams(location.search);
    const requestedStatus = params.get("status") as StatusFilter | null;

    const validStatuses: StatusFilter[] = [
      "ALL",
      "PENDING_HOD",
      "PENDING_DIRECTOR",
      "PENDING_TRAVEL_MANAGER",
      "APPROVED",
      "REJECTED",
    ];

    setStatusFilter(
      requestedStatus && validStatuses.includes(requestedStatus)
        ? requestedStatus
        : "ALL",
    );
  }, [location.pathname, location.search]);

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);

    try {
      const [pendingResponse, allResponse] = await Promise.all([
        api.get("/travel/hod/pending"),
        api.get("/travel/hod/all"),
      ]);

      setPending(Array.isArray(pendingResponse.data) ? pendingResponse.data : []);
      setAll(Array.isArray(allResponse.data) ? allResponse.data : []);
    } catch (err: any) {
      if (showSpinner) {
        toast.error(err.response?.data?.error || "Could not refresh requests");
      }
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const intervalId = window.setInterval(() => void fetchData(), 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleAction = async () => {
    if (!modal) return;

    setLoading(true);

    try {
      await api.patch(`/travel/${modal.req.id}/hod-action`, {
        action: modal.action,
        comment,
      });

      toast.success(
        modal.action === "approve"
          ? "Approved & sent to Director"
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);

    try {
      await api.delete(`/travel/${deleteConfirm.id}`);
      toast.success("Request deleted");
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => prev === id ? null : id);

  const filteredAll = all.filter(r => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

    const matchSearch = search === "" ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.fromLocation.toLowerCase().includes(search.toLowerCase()) ||
      r.toLocation.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase()) ||
      (r.employee?.email || "").toLowerCase().includes(search.toLowerCase());

    return matchStatus && matchSearch;
  });

  const filteredPending = pending.filter((r) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      r.employeeName,
      r.employee?.email,
      r.department,
      r.fromLocation,
      r.toLocation,
      r.purposeOfVisit,
      format(new Date(r.fromDate), "dd MMM yyyy"),
      format(new Date(r.toDate), "dd MMM yyyy"),
    ].some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "PENDING_HOD", label: "Pending HOD" },
    { value: "PENDING_DIRECTOR", label: "Pending Director" },
    { value: "PENDING_TRAVEL_MANAGER", label: "With Travel Manager" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="min-w-0 w-full space-y-6">
      {/* Welcome banner - main dashboard only */}
      {dashTab === "dashboard" && (
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#F0F5FF] via-[#F0F5FF] to-[#DCE7F8] px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0 135 L110 65 L190 118 L310 30 L405 122 L520 58 L625 132 L760 48 L870 125 L990 35 L1100 112 L1200 60 L1200 180 L0 180 Z" fill="#C6D8F4" opacity=".38" />
            <path d="M0 155 L135 100 L250 145 L370 75 L485 150 L610 92 L735 150 L865 78 L990 145 L1110 90 L1200 130 L1200 180 L0 180 Z" fill="#A9C4EC" opacity=".22" />
            <path d="M420 45 C510 0 570 0 650 48 S790 82 865 42 S1010 0 1090 35" fill="none" stroke="#A9C4EC" strokeWidth="2" strokeDasharray="5 8" />
            <circle cx="420" cy="45" r="7" fill="#C6D8F4" />
            <circle cx="865" cy="42" r="7" fill="#C6D8F4" />
          </svg>
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Sun size={31} className="shrink-0 text-amber-500" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, HOD
              </h1>
              <p className="mt-1 truncate text-sm text-slate-600">
                {user?.department || "Department"}{user?.email ? ` · ${user.email}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
              <CalendarDays size={14} className="text-slate-500" />
              <span className="font-medium">{format(new Date(), "EEE, dd MMM yyyy")}</span>
              <span className="mx-1 h-4 border-l border-slate-200" />
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setDashTab("pending");
                  navigate("/dashboard/pending");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3F73DF]"
              >
                <CheckCircle size={15} />
                Review Pending
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/new-request")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white/90 px-3.5 py-2.5 text-sm font-medium text-[#3F73DF] shadow-sm transition hover:bg-white"
              >
                <PlusCircle size={15} />
                New Request
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Tabs - visible on Dashboard and All Requests, hidden on standalone Pending page */}
      {dashTab !== "pending" && (
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setDashTab("dashboard");
            navigate("/dashboard");
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            dashTab === "dashboard"
              ? "border-[#4F83F1] text-[#4F83F1]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <LayoutDashboard size={14} /> Dashboard
          {pending.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setDashTab("history");
            navigate("/dashboard/all-requests");
          }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            dashTab === "history"
              ? "border-[#4F83F1] text-[#4F83F1]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ClipboardList size={14} /> All Requests
          <span className="ml-1 bg-gray-100 text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {all.length}
          </span>
        </button>
      </div>
      )}

      {/* Dashboard and standalone Pending Approvals page */}
      {(dashTab === "dashboard" || dashTab === "pending") && (
        <div className="space-y-6">
          {dashTab === "pending" && (
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Pending Approvals</h1>
              <p className="mt-0.5 text-sm text-slate-500">Review travel requests awaiting your decision.</p>
            </div>
          )}

          {/* Statistics cards - main dashboard only */}
          {dashTab === "dashboard" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Requests",
                value: all.length,
                icon: ClipboardList,
                iconStyle: "bg-[#DCE7F8] text-[#4F83F1]",
                filter: "ALL" as StatusFilter,
              },
              {
                label: "Pending Approval",
                value: pending.length,
                icon: Clock,
                iconStyle: "bg-amber-100 text-amber-600",
                filter: "PENDING_HOD" as StatusFilter,
              },
              {
                label: "Approved",
                value: all.filter((r) => r.status === "APPROVED").length,
                icon: CheckCircle,
                iconStyle: "bg-emerald-100 text-emerald-600",
                filter: "APPROVED" as StatusFilter,
              },
              {
                label: "Rejected",
                value: all.filter((r) => r.status === "REJECTED").length,
                icon: XCircle,
                iconStyle: "bg-rose-100 text-rose-600",
                filter: "REJECTED" as StatusFilter,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(card.filter);
                    navigate(`/dashboard/all-requests?status=${card.filter}`);
                  }}
                  className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#C6D8F4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1] dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconStyle}`}>
                      <Icon size={18} />
                    </span>
                    <ArrowRight size={18} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#4F83F1]" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-300">{card.label}</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-slate-950 dark:text-white">
                    {card.value}
                  </p>
                </button>
              );
            })}
          </div>
          )}

          {/* Main dashboard: wide approvals area with compact Quick Actions sidebar */}
          {dashTab === "dashboard" ? (
            <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)] xl:gap-5">
              <div className="min-w-0">
          {/* Pending approvals */}
          <section id="hod-pending-approvals" className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pending Approvals
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                  {pending.length} request{pending.length !== 1 ? "s" : ""} awaiting your decision
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee, route, date..."
                  className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7FA6E8] focus:ring-2 focus:ring-[#F0F5FF] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-[#244A91]/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-slate-50 dark:bg-gray-800/70">
                  <tr>
                    {["#", "Employee", "Destination", "Travel Dates", "Purpose", "Submitted On", "Actions"].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-gray-800 dark:text-gray-400"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12">
                        {pending.length === 0 ? (
                          <div className="flex min-h-[118px] w-full items-center justify-center bg-gradient-to-r from-slate-50/80 via-white to-[#F0F5FF]/40 px-5 py-4 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
                            <div className="flex w-full max-w-2xl items-center gap-4 sm:gap-5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm dark:border-[#244A91] dark:bg-gray-800 dark:text-[#7FA6E8]">
                                <CheckCircle size={21} strokeWidth={2} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                                    No pending decisions
                                  </h3>
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                    {pending.length} Requests Awaiting
                                  </span>
                                </div>

                                <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-gray-300">
                                  All caught up! There are currently no travel requests awaiting your approval.
                                </p>

                                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                                  <Clock size={13} className="shrink-0 text-[#4F83F1]" />
                                  New requests will appear here when they are ready for your decision.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto flex max-w-md flex-col items-center text-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-300">
                              <Search size={18} />
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              No matching requests
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                              Try a different employee name, destination or travel date.
                            </p>
                            <button
                              type="button"
                              onClick={() => setSearch("")}
                              className="mt-3 text-xs font-semibold text-[#4F83F1] hover:underline dark:text-[#7FA6E8]"
                            >
                              Clear search
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPending.map((r, index) => (
                      <Fragment key={r.id}>
                        <tr className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-gray-800 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white">
                              {r.employeeName || "—"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
                              {r.department || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <MapPin size={12} className="text-slate-400" />
                              {r.fromLocation || "—"} → {r.toLocation || "—"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                            {format(new Date(r.fromDate), "dd MMM yyyy")} – {format(new Date(r.toDate), "dd MMM yyyy")}
                          </td>

                          <td
                            className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-600 dark:text-gray-300"
                            title={r.purposeOfVisit || ""}
                          >
                            {r.purposeOfVisit || "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
                            {format(new Date(r.createdAt), "dd MMM yyyy")}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpand(r.id)}
                                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#C6D8F4] hover:bg-[#F0F5FF] hover:text-[#3F73DF] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-blue-950/30"
                              >
                                {expanded === r.id ? "Hide" : "View"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setModal({ req: r, action: "approve" });
                                  setComment("");
                                }}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setModal({ req: r, action: "reject" });
                                  setComment("");
                                }}
                                className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded === r.id && (
                          <tr className="bg-[#F0F5FF]/40 dark:bg-blue-950/10">
                            <td colSpan={7} className="border-b border-[#DCE7F8] px-5 py-4 dark:border-gray-700">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Employee details
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-white">
                                    {r.employeeName}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                                    <Mail size={12} />{r.employee?.email || "—"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                    {r.department || "—"} · Grade {r.employee?.grade ?? "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Travel information
                                  </p>
                                  <p className="mt-1 text-xs text-slate-700 dark:text-gray-200">
                                    {r.fromLocation || "—"} → {r.toLocation || "—"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                    {format(new Date(r.fromDate), "dd MMM yyyy")} – {format(new Date(r.toDate), "dd MMM yyyy")}
                                  </p>
                                  {r.accommodation && (
                                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#F0F5FF] px-2 py-1 text-xs text-[#3F73DF] dark:bg-blue-950/40 dark:text-[#A9C4EC]">
                                      <BedDouble size={12} /> Accommodation required
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Purpose & notes
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700 dark:text-gray-200">
                                    {r.purposeOfVisit || "—"}
                                  </p>
                                  {r.additionalNotes && (
                                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500 dark:text-gray-400">
                                      {r.additionalNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
              </div>
              <div className="flex min-w-0">
            <section className="flex h-full w-full flex-col rounded-xl border border-[#DCE7F8] bg-white p-4 shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950">
                  <ArrowRight size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Shortcuts to common travel tasks</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/my-requests")}
                  className="group flex min-h-[76px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#DCE7F8] bg-[#F8FAFF] p-3 text-left transition hover:border-[#AFC7F2] hover:bg-[#F0F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#4F83F1]">
                    <ClipboardList size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">My Requests</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Track and manage requests</span>
                  </span>
                  <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/new-request")}
                  className="group flex min-h-[76px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#DCE7F8] bg-[#F8FAFF] p-3 text-left transition hover:border-[#AFC7F2] hover:bg-[#F0F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E5EEFF] text-[#4F83F1]">
                    <PlusCircle size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">New Request</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Raise a travel request</span>
                  </span>
                  <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" />
                </button>
              </div>
            </section>
              </div>
            </div>
          ) : (
            <>
          {/* Pending approvals */}
          <section id="hod-pending-approvals" className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pending Approvals
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                  {pending.length} request{pending.length !== 1 ? "s" : ""} awaiting your decision
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee, route, date..."
                  className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7FA6E8] focus:ring-2 focus:ring-[#F0F5FF] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-[#244A91]/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 dark:bg-gray-800/70">
                  <tr>
                    {["#", "Employee", "Destination", "Travel Dates", "Purpose", "Submitted On", "Actions"].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-gray-800 dark:text-gray-400"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12">
                        {pending.length === 0 ? (
                          <div className="flex min-h-[118px] w-full items-center justify-center bg-gradient-to-r from-slate-50/80 via-white to-[#F0F5FF]/40 px-5 py-4 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
                            <div className="flex w-full max-w-2xl items-center gap-4 sm:gap-5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm dark:border-[#244A91] dark:bg-gray-800 dark:text-[#7FA6E8]">
                                <CheckCircle size={21} strokeWidth={2} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                                    No pending decisions
                                  </h3>
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                    {pending.length} Requests Awaiting
                                  </span>
                                </div>

                                <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-gray-300">
                                  All caught up! There are currently no travel requests awaiting your approval.
                                </p>

                                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                                  <Clock size={13} className="shrink-0 text-[#4F83F1]" />
                                  New requests will appear here when they are ready for your decision.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto flex max-w-md flex-col items-center text-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-300">
                              <Search size={18} />
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              No matching requests
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                              Try a different employee name, destination or travel date.
                            </p>
                            <button
                              type="button"
                              onClick={() => setSearch("")}
                              className="mt-3 text-xs font-semibold text-[#4F83F1] hover:underline dark:text-[#7FA6E8]"
                            >
                              Clear search
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPending.map((r, index) => (
                      <Fragment key={r.id}>
                        <tr className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-gray-800 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white">
                              {r.employeeName || "—"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
                              {r.department || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <MapPin size={12} className="text-slate-400" />
                              {r.fromLocation || "—"} → {r.toLocation || "—"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                            {format(new Date(r.fromDate), "dd MMM yyyy")} – {format(new Date(r.toDate), "dd MMM yyyy")}
                          </td>

                          <td
                            className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-600 dark:text-gray-300"
                            title={r.purposeOfVisit || ""}
                          >
                            {r.purposeOfVisit || "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-gray-400">
                            {format(new Date(r.createdAt), "dd MMM yyyy")}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpand(r.id)}
                                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#C6D8F4] hover:bg-[#F0F5FF] hover:text-[#3F73DF] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-blue-950/30"
                              >
                                {expanded === r.id ? "Hide" : "View"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setModal({ req: r, action: "approve" });
                                  setComment("");
                                }}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setModal({ req: r, action: "reject" });
                                  setComment("");
                                }}
                                className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded === r.id && (
                          <tr className="bg-[#F0F5FF]/40 dark:bg-blue-950/10">
                            <td colSpan={7} className="border-b border-[#DCE7F8] px-5 py-4 dark:border-gray-700">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Employee details
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-white">
                                    {r.employeeName}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                                    <Mail size={12} />{r.employee?.email || "—"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                    {r.department || "—"} · Grade {r.employee?.grade ?? "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Travel information
                                  </p>
                                  <p className="mt-1 text-xs text-slate-700 dark:text-gray-200">
                                    {r.fromLocation || "—"} → {r.toLocation || "—"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                    {format(new Date(r.fromDate), "dd MMM yyyy")} – {format(new Date(r.toDate), "dd MMM yyyy")}
                                  </p>
                                  {r.accommodation && (
                                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#F0F5FF] px-2 py-1 text-xs text-[#3F73DF] dark:bg-blue-950/40 dark:text-[#A9C4EC]">
                                      <BedDouble size={12} /> Accommodation required
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Purpose & notes
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700 dark:text-gray-200">
                                    {r.purposeOfVisit || "—"}
                                  </p>
                                  {r.additionalNotes && (
                                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500 dark:text-gray-400">
                                      {r.additionalNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
            </>
          )}
        </div>
      )}

      {/* History tab */}
      {dashTab === "history" && (
        <div className="bg-white border border-[#DCE7F8] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  All Requests History
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredAll.length} of {all.length} request
                  {all.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="relative max-w-sm">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#4F83F1] focus:ring-2 focus:ring-[#DCE7F8] transition"
                placeholder="Search by name, email, route, department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={12} className="text-gray-400 flex-shrink-0" />
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md border transition ${
                    statusFilter === opt.value
                      ? "bg-[#4F83F1] text-white border-[#4F83F1]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-[#A9C4EC] hover:text-[#4F83F1]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    "Employee",
                    "Grade",
                    "Email",
                    "Route",
                    "Date",
                    "Status",
                    "Actions",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 bg-gray-50 border-b border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredAll.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                      No requests match this filter
                    </td>
                  </tr>
                ) : (
                  filteredAll.map(r => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800">
                          {r.employeeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.department}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <GradeBadge grade={r.employee?.grade} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail size={11} className="text-gray-400" />
                          {r.employee?.email || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-gray-600">
                        {r.fromLocation} → {r.toLocation}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {format(new Date(r.createdAt), "dd MMM yyyy")}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard/request/${r.id}`)}
                            className="flex items-center gap-1.5 text-xs font-medium text-[#4F83F1] bg-[#F0F5FF] hover:bg-[#DCE7F8] border border-[#C6D8F4] px-3 py-1.5 rounded-md transition"
                          >
                            <Eye size={11} /> View
                          </button>

                          {r.status === "REJECTED" && (
                            <button
                              onClick={() => setDeleteConfirm(r)}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-md transition"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800 mb-1">
              Delete Request
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this rejected request?
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-md px-3.5 py-3 mb-5">
              <div className="text-sm font-semibold text-gray-800">
                {deleteConfirm.employeeName}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {deleteConfirm.fromLocation} → {deleteConfirm.toLocation} ·{" "}
                {format(new Date(deleteConfirm.fromDate), "dd MMM yyyy")}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve / Reject modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {modal.action === "approve"
                ? "✅ Approve Request"
                : "❌ Reject Request"}
            </h3>

            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 mb-4">
              <div className="w-8 h-8 bg-[#4F83F1] rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {modal.req.employeeName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {modal.req.employeeName}
                  </span>
                  <GradeBadge grade={modal.req.employee?.grade} />
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Mail size={10} />
                  {modal.req.employee?.email || "—"}
                </div>
              </div>

              <div className="text-xs text-gray-500 text-right flex-shrink-0">
                <div>
                  {modal.req.fromLocation} → {modal.req.toLocation}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Comment{" "}
                {modal.action === "reject" ? "(required)" : "(optional)"}
              </label>

              <textarea
                className="w-full max-w-6xl mx-auto px-4"
                placeholder="Add your remarks…"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Cancel
              </button>

              <button
                onClick={handleAction}
                disabled={loading || (modal.action === "reject" && !comment)}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-md transition disabled:opacity-50 ${
                  modal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {loading
                  ? "Processing…"
                  : modal.action === "approve"
                    ? "Approve"
                    : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}