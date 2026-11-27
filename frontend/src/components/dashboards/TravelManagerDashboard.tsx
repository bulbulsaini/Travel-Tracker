import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  FileText,
  BedDouble,
  User,
  Mail,
  Download,
  Eye,
  Paperclip,
  RefreshCw,
  Search,
  X,
  ClipboardList,
  Sun,
  Plane,
  Bell,
  PlusCircle,
} from "lucide-react";
import { format, isValid } from "date-fns";
import toast from "react-hot-toast";

import api from "../../lib/api";
import { TravelRequest } from "../../types";
import { useAuth } from "../../hooks/useAuth";

type DashTab = "pending" | "tickets";

function safeFormat(value: unknown, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  const date = new Date(value as string | number | Date);
  return isValid(date) ? format(date, pattern) : "—";
}

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return null;

  const cls =
    grade >= 7
      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
      : grade >= 5
        ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        : grade >= 3
          ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";

  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}>
      G{grade}
    </span>
  );
}

export default function TravelManagerDashboard() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isProcessPage = pathname === "/dashboard/pending";

  const [dashTab, setDashTab] = useState<DashTab>("pending");
  const [pending, setPending] = useState<TravelRequest[]>([]);
  const [approved, setApproved] = useState<TravelRequest[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<TravelRequest | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (pathname === "/dashboard/pending") {
      const tab = new URLSearchParams(search).get("tab");
      setDashTab(tab === "tickets" ? "tickets" : "pending");
    }
  }, [pathname, search]);

  const fetchData = useCallback(async () => {
    setError("");
    setRefreshing(true);

    const [pendingResult, approvedResult] = await Promise.allSettled([
      api.get("/travel/manager/pending"),
      api.get("/travel/manager/all"),
    ]);

    if (pendingResult.status === "fulfilled") {
      setPending(pendingResult.value.data ?? []);
    } else {
      setError("Failed to load pending requests.");
    }

    if (approvedResult.status === "fulfilled") {
      setApproved(approvedResult.value.data ?? []);
    } else {
      setError((previous) =>
        previous
          ? `${previous} Failed to load processed requests.`
          : "Failed to load processed requests."
      );
    }

    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchData();

    // Keep pending requests and ticket information up to date without reloading.
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  const handleProcess = async () => {
    if (!modal) return;

    setLoading(true);

    try {
      await api.patch(`/travel/${modal.id}/manager-action`, { comment });

      toast.success("Request processed and marked as approved!");
      setModal(null);
      setComment("");
      setExpanded(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((previous) => (previous === id ? null : id));
  };

  const ticketsUploaded = approved.filter((r) => Boolean(r.ticketFile)).length;

  const rejectedCount = approved.filter((r) =>
    String((r as any).status ?? "").toLowerCase().includes("reject")
  ).length;
  const explicitlyApprovedCount = approved.filter((r) => {
    const status = String((r as any).status ?? "").toLowerCase();
    return status.includes("approv") || status === "processed" || status === "completed";
  }).length;
  // The manager/all endpoint may return processed records without a status value.
  // In that case, treat non-rejected records as approved to keep the chart consistent
  // with the existing Approved summary card.
  const approvedCount = explicitlyApprovedCount + (
    approved.some((r) => Boolean((r as any).status))
      ? 0
      : Math.max(0, approved.length - rejectedCount)
  );
  const awaitingCount = pending.length;
  const totalRequests = awaitingCount + approvedCount + rejectedCount;
  const awaitingShare = totalRequests ? (awaitingCount / totalRequests) * 100 : 0;
  const approvedShare = totalRequests ? (approvedCount / totalRequests) * 100 : 0;
  const rejectedShare = totalRequests ? (rejectedCount / totalRequests) * 100 : 0;
  const statusDonut = totalRequests
    ? `conic-gradient(#f59e0b 0% ${awaitingShare}%, #10b981 ${awaitingShare}% ${awaitingShare + approvedShare}%, #f43f5e ${awaitingShare + approvedShare}% 100%)`
    : "conic-gradient(#e2e8f0 0% 100%)";
  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  })();
  const todayLabel = format(new Date(), "EEE, dd MMM yyyy");
  const managerDepartment = (user as any)?.department;
  const managerEmail = (user as any)?.email;

  const filteredPending = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return pending;

    return pending.filter((r) =>
      [
        r.employeeName,
        r.employee?.email,
        r.department,
        r.fromLocation,
        r.toLocation,
        r.purposeOfVisit,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [pending, searchText]);

  const filteredTicketRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return pending.filter((r) => !query || [
      r.employeeName, r.employee?.email, r.department, r.fromLocation,
      r.toLocation, r.purposeOfVisit,
    ].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [pending, searchText]);

  const selectTab = (tab: DashTab) => {
    setDashTab(tab);
    setSearchText("");
    navigate(`/dashboard/pending?tab=${tab}`);
  };


  return (
    <div className="space-y-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
      {/* Error message */}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-white dark:bg-gray-900 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
          <p className="text-xs text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={refreshing}
            className="ml-auto text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Travel Manager dashboard overview */}
      {!isProcessPage && (
        <>
          <section className="relative isolate min-h-[142px] overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#F7FAFF] via-[#F0F5FF] to-[#E8F0FF] px-5 py-5 shadow-sm dark:border-blue-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 sm:px-7">
            {/* Decorative route artwork */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="h-full w-full opacity-70">
                <path d="M0 132 L150 45 L255 118 L390 58 L520 140 L670 48 L805 122 L930 52 L1080 128 L1200 68 V180 H0Z" fill="#DCE7F8" opacity=".38" />
                <path d="M0 155 L175 88 L300 150 L455 88 L590 160 L760 82 L900 150 L1050 88 L1200 145 V180 H0Z" fill="#B8CCF3" opacity=".22" />
                <path d="M430 45 C520 -10 585 15 650 56 S770 93 850 42 S1000 6 1090 50" fill="none" stroke="#6B96E8" strokeWidth="2" strokeDasharray="5 8" opacity=".65" />
                <circle cx="430" cy="45" r="6" fill="#6B96E8" opacity=".55" />
                <circle cx="850" cy="42" r="6" fill="#6B96E8" opacity=".55" />
              </svg>
              <Plane className="absolute right-[29%] top-7 h-7 w-7 -rotate-12 text-[#6B96E8]/70" />
            </div>

            <div className="relative flex h-full flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-500 shadow-sm dark:bg-amber-400/10">
                  <Sun size={27} strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {greeting}, {user?.name || "Travel Manager"}
                  </h1>
                  <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
                    {[managerDepartment, managerEmail].filter(Boolean).join(" · ") || "Travel operations and ticket management"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <div className="inline-flex items-center gap-3 rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    {todayLabel}
                  </span>
                  <span className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchData()}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab("pending")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-[#3F73DF]"
                  >
                    <CheckCircle size={14} />
                    Review Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab("tickets")}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white/90 px-4 py-2.5 text-xs font-semibold text-[#3F73DF] shadow-sm transition hover:bg-[#F0F5FF] dark:border-blue-900 dark:bg-slate-800 dark:text-[#6B96E8] dark:hover:bg-slate-700"
                  >
                    <PlusCircle size={14} />
                    Upload Tickets
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Four compact overview cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Requests",
                value: totalRequests,
                icon: ClipboardList,
                iconClass: "bg-[#E8F0FF] text-[#6B96E8] dark:bg-sky-400/10 dark:text-sky-300",
                onClick: () => selectTab("pending"),
              },
              {
                label: "Pending Approval",
                value: pending.length,
                icon: Clock,
                iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300",
                onClick: () => selectTab("pending"),
              },
              {
                label: "Approved",
                value: approvedCount,
                icon: CheckCircle,
                iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
                onClick: () => selectTab("tickets"),
              },
              {
                label: "Rejected",
                value: rejectedCount,
                icon: X,
                iconClass: "bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
                onClick: () => selectTab("tickets"),
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`group min-h-[126px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#DCE7F8] hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800 ${index === 0 ? "ring-1 ring-[#E8F0FF] dark:ring-blue-900/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconClass}`}>
                      <Icon size={18} />
                    </span>
                    <span className="text-xl text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]">→</span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">{item.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold leading-none tracking-tight text-slate-950 dark:text-white">{item.value}</p>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <section aria-label="Quick actions" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Quickly access travel request options.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/new-request")}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#DCE7F8] bg-white p-4 text-left shadow-sm transition hover:border-[#B8CCF3] hover:bg-[#F7FAFF] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B96E8] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-slate-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                  <PlusCircle size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">New Request</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Create a new travel request</span>
                </span>
                <span className="text-lg text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]">→</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/my-requests")}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#DCE7F8] bg-white p-4 text-left shadow-sm transition hover:border-[#B8CCF3] hover:bg-[#F7FAFF] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B96E8] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-slate-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                  <ClipboardList size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">My Requests</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">View and track travel requests</span>
                </span>
                <span className="text-lg text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]">→</span>
              </button>
            </div>
          </section>

          {/* Notifications + live request status overview */}
          <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[0.82fr_1.18fr]">
            <section className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                  <Bell size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Live travel request updates</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-[#F0F5FF] px-2.5 py-1 text-[10px] font-semibold text-[#3F73DF] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                  {pending.length} new
                </span>
              </div>

              {pending.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pending.slice(0, 2).map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => selectTab("pending")}
                      className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                        <Clock size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {request.employeeName || "A travel request"} is awaiting processing.
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {request.fromLocation || "—"} → {request.toLocation || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-400">→</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[104px] items-center gap-3 px-4 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <CheckCircle size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">You're all caught up!</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">New requests will appear here when they are ready for processing.</p>
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Request Status Overview</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Current request distribution</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[128px_minmax(0,1fr)] sm:items-center sm:gap-4">
                <div className="flex min-h-[128px] items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div
                    className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full"
                    style={{ background: statusDonut }}
                    role="img"
                    aria-label={`Request status: ${awaitingCount} awaiting, ${approvedCount} approved, ${rejectedCount} rejected`}
                  >
                    <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                      <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Total</span>
                      <span className="text-2xl font-semibold leading-7 text-slate-900 dark:text-white">{totalRequests}</span>
                      <span className="text-[9px] text-slate-400">requests</span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>Status breakdown</span>
                    <span>Count · Share</span>
                  </div>
                  {[
                    { label: "Awaiting", count: awaitingCount, share: awaitingShare, color: "#f59e0b", bar: "bg-amber-400" },
                    { label: "Approved", count: approvedCount, share: approvedShare, color: "#10b981", bar: "bg-emerald-500" },
                    { label: "Rejected", count: rejectedCount, share: rejectedShare, color: "#f43f5e", bar: "bg-rose-500" },
                  ].map((item) => (
                    <div key={item.label} className="mb-1.5 last:mb-0 rounded-lg border border-slate-100 px-2.5 py-1.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="min-w-0 flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                        <span className="w-6 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{item.count}</span>
                        <span className="w-8 text-right text-[9px] tabular-nums text-slate-400">{Math.round(item.share)}%</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${item.bar} transition-all duration-500`} style={{ width: `${item.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

        </>
      )}

      {/* Processing page */}
      {isProcessPage && (
        <>
          <div className="relative isolate flex min-h-[104px] flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#F7FAFF] via-[#F0F5FF] to-[#E8F0FF] px-5 py-4 shadow-sm dark:border-blue-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 sm:px-6">
            {/* Subtle travel-route decoration */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <svg viewBox="0 0 1000 130" preserveAspectRatio="none" className="h-full w-full opacity-60">
                <path d="M360 38 C430 -5 500 8 560 42 S680 82 745 35 S875 8 960 44" fill="none" stroke="#6B96E8" strokeWidth="1.8" strokeDasharray="5 7" />
                <path d="M0 105 L110 65 L210 108 L320 58 L430 112 L540 70 L650 112 L760 62 L870 108 L1000 68 V130 H0Z" fill="#DCE7F8" opacity=".28" />
                <circle cx="360" cy="38" r="5" fill="#6B96E8" />
                <circle cx="745" cy="35" r="5" fill="#6B96E8" />
              </svg>
              <Plane className="absolute right-[28%] top-5 h-6 w-6 -rotate-12 text-[#6B96E8]/70" />
            </div>

            <div className="relative flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/75 text-[#4F83F1] shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-[#6B96E8]">
                <Paperclip size={21} strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Process Requests
                </h1>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Process approved requests and manage ticket documents.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="relative inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/90 bg-white/90 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
            <button
              type="button"
              onClick={() => selectTab("pending")}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                dashTab === "pending"
                  ? "border-[#4F83F1] text-[#4F83F1]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}
            >
              <Clock size={14} />
              Pending Requests
              {pending.length > 0 && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
                  {pending.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => selectTab("tickets")}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                dashTab === "tickets"
                  ? "border-[#4F83F1] text-[#4F83F1]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}
            >
              <Paperclip size={14} />
              Upload Tickets
              {ticketsUploaded > 0 && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
                  {ticketsUploaded}
                </span>
              )}
            </button>
          </div>

          {/* Pending requests tab */}
          {dashTab === "pending" && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Awaiting Processing
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {pending.length} {pending.length === 1 ? "request" : "requests"} approved by the Director and awaiting travel arrangements.
                  </p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search employee, route, date..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#6B96E8] focus:ring-2 focus:ring-[#E8F0FF] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-blue-900/40"
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      title="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {filteredPending.length === 0 ? (
                pending.length === 0 ? (
                  <div className="flex min-h-[150px] items-center justify-center bg-gradient-to-r from-white via-slate-50 to-[#F0F5FF]/50 px-5 py-6 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20">
                    <div className="flex w-full max-w-xl items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm dark:border-blue-900 dark:bg-slate-800 dark:text-[#6B96E8]">
                        <CheckCircle size={23} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            No pending decisions
                          </h3>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                            0 Requests Awaiting
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          All caught up! There are currently no travel requests awaiting your processing.
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <Clock size={12} className="text-[#6B96E8]" />
                          New requests will appear here when they are ready for processing.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[145px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <Search size={24} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No matching requests</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Try a different employee, route or date.</p>
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/70">
                      <tr>
                        {["Route", "Employee", "Type", "Dates", "Purpose", "Status", "Ticket", "Submitted", "Actions"].map((heading) => (
                          <th key={heading} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPending.map((r, index) => (
                        <Fragment key={r.id}>
                          <tr className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                                <MapPin size={13} className="shrink-0 text-[#4F83F1]" />
                                <span className="max-w-[105px] truncate">{r.fromLocation || "—"}</span>
                                <Plane size={13} className="shrink-0 text-[#6B96E8]" />
                                <MapPin size={13} className="shrink-0 text-[#4F83F1]" />
                                <span className="max-w-[105px] truncate">{r.toLocation || "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="whitespace-nowrap text-xs font-medium text-slate-800 dark:text-slate-100">{r.employeeName || "—"}</p>
                              <p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-400">{r.department || r.employee?.email || "—"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex whitespace-nowrap rounded-full bg-[#F0F5FF] px-2.5 py-1 text-[10px] font-medium text-[#3F73DF] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                                {r.transportMode || "—"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-400" />
                                {safeFormat(r.fromDate, "dd MMM yyyy")} – {safeFormat(r.toDate, "dd MMM yyyy")}
                              </span>
                            </td>
                            <td className="max-w-[170px] px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                              <span className="block truncate" title={r.purposeOfVisit || ""}>{r.purposeOfVisit || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                                <Clock size={12} />
                                Ready to Process
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {r.ticketFile ? (
                                <span className="whitespace-nowrap text-emerald-600 dark:text-emerald-400">Uploaded</span>
                              ) : (
                                <span className="whitespace-nowrap text-slate-400">Not uploaded</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                              {safeFormat(r.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(r.id)}
                                  className="whitespace-nowrap rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[#DCE7F8] hover:bg-[#F0F5FF] hover:text-[#3F73DF] dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-400/10"
                                >
                                  {expanded === r.id ? "Hide" : "Details"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setModal(r); setComment(""); }}
                                  className="whitespace-nowrap rounded-md bg-[#4F83F1] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3F73DF]"
                                >
                                  Process
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expanded === r.id && (
                            <tr className="bg-[#F0F5FF]/40 dark:bg-blue-950/20">
                              <td colSpan={9} className="px-5 py-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  {[
                                    ["Employee", r.employeeName || "—"],
                                    ["Department", r.department || "—"],
                                    ["Email", r.employee?.email || "—"],
                                    ["Travel mode", r.transportMode || "—"],
                                    ["Departure", safeFormat(r.fromDate)],
                                    ["Return", safeFormat(r.toDate)],
                                    ["Submitted", safeFormat(r.createdAt)],
                                    ["Accommodation", r.accommodation ? "Required" : "Not required"],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                                      <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-100">{value}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Purpose of visit</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-200">{r.purposeOfVisit || "—"}</p>
                                </div>
                                {r.hodComment && (
                                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/20">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">HOD comment</p>
                                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{r.hodComment}</p>
                                  </div>
                                )}
                                {r.directorComment && (
                                  <div className="mt-3 rounded-lg border border-[#DCE7F8] bg-[#F0F5FF] px-3 py-2.5 dark:border-blue-900/60 dark:bg-blue-950/20">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3F73DF] dark:text-[#6B96E8]">Director comment</p>
                                    <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">{r.directorComment}</p>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                    Showing {filteredPending.length} of {pending.length} pending requests
                  </div>
                </div>
              )}
            </section>
          )}
          {/* Employee-uploaded tickets: Travel Manager can only view/download and process. */}
          {dashTab === "tickets" && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Employee Uploaded Tickets</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Review tickets uploaded by employees. You can view or download the document and then process the request.</p>
                </div>
                <div className="relative min-w-0">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search employee or destination..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#6B96E8] focus:ring-2 focus:ring-[#E8F0FF] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-blue-900/40" />
                  {searchText && <button type="button" onClick={() => setSearchText("")} title="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={13} /></button>}
                </div>
              </div>
              {filteredTicketRequests.length === 0 ? (
                <div className="flex min-h-[170px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                  <Paperclip size={26} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No requests awaiting ticket review</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Requests will appear here after the employee uploads a ticket.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/70"><tr>
                      {["Employee", "Route", "Travel Dates", "Ticket Status", "Ticket", "Action"].map((heading) => <th key={heading} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">{heading}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTicketRequests.map((r) => {
                        const ticketName = r.ticketFile?.split("/").pop()?.split("?")[0] || "ticket";
                        return <tr key={r.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{r.employeeName || "—"}</p><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{r.department || "—"}</p></td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700 dark:text-slate-200">{r.fromLocation || "—"} <Plane size={12} className="mx-1 inline text-[#6B96E8]" /> {r.toLocation || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{safeFormat(r.fromDate, "dd MMM")} – {safeFormat(r.toDate, "dd MMM yyyy")}</td>
                          <td className="px-4 py-3">{r.ticketFile ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><CheckCircle size={12} /> Uploaded</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Clock size={12} /> Awaiting employee</span>}</td>
                          <td className="px-4 py-3">{r.ticketFile ? <a href={r.ticketFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[#4F83F1] hover:text-[#3F73DF] dark:text-[#6B96E8]"><FileText size={14} /> {ticketName}</a> : <span className="text-xs text-slate-400">Not uploaded</span>}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2">{r.ticketFile && <><a href={r.ticketFile} target="_blank" rel="noopener noreferrer" title="View ticket" aria-label={`View ${ticketName}`} className="rounded-md border border-slate-200 p-2 text-[#4F83F1] transition hover:bg-[#F0F5FF] dark:border-slate-700 dark:text-[#6B96E8] dark:hover:bg-slate-800"><Eye size={14} /></a><a href={r.ticketFile} download={ticketName} title="Download ticket" aria-label={`Download ${ticketName}`} className="rounded-md border border-slate-200 p-2 text-[#4F83F1] transition hover:bg-[#F0F5FF] dark:border-slate-700 dark:text-[#6B96E8] dark:hover:bg-slate-800"><Download size={14} /></a></>}<button type="button" onClick={() => { setModal(r); setComment(""); }} disabled={!r.ticketFile} className="whitespace-nowrap rounded-md bg-[#4F83F1] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#3F73DF] disabled:cursor-not-allowed disabled:opacity-40">Process</button></div></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Showing {filteredTicketRequests.length} of {pending.length} requests awaiting Travel Manager processing</p></div>
            </section>
          )}
        </>
      )}

      {/* Mark as Processed modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-5"
          onClick={() => !loading && setModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="process-request-title"
            className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#DCE7F8] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Travel-themed modal header */}
            <div className="relative isolate overflow-hidden border-b border-[#DCE7F8] bg-gradient-to-r from-[#F7FAFF] via-[#F0F5FF] to-[#E8F0FF] px-4 py-3 dark:border-blue-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 sm:px-5">
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <svg viewBox="0 0 900 170" preserveAspectRatio="none" className="h-full w-full opacity-60">
                  <path d="M500 42 C570 -2 620 110 700 62 S810 15 890 58" fill="none" stroke="#6B96E8" strokeWidth="2" strokeDasharray="6 8" />
                  <path d="M430 145 L540 92 L625 145 L735 95 L835 145 L900 120 V170 H430Z" fill="#DCE7F8" opacity=".28" />
                  <circle cx="500" cy="42" r="5" fill="#6B96E8" />
                  <circle cx="700" cy="62" r="5" fill="#6B96E8" />
                </svg>
                <Plane className="absolute right-[18%] top-5 h-8 w-8 -rotate-12 text-[#6B96E8]/60" />
              </div>
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-[#4F83F1] shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-[#6B96E8]">
                    <Plane size={24} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <h3 id="process-request-title" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                      Mark as Processed
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Confirm the travel arrangement details.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !loading && setModal(null)}
                  disabled={loading}
                  aria-label="Close dialog"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DCE7F8] bg-white/70 text-[#4F83F1] transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#6B96E8]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(88vh-92px)] space-y-3 overflow-y-auto p-3 sm:p-4">
              {/* Employee details and route */}
              <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                    <User size={20} />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Employee Details</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Basic information about the travel request.</p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-[#F0F5FF]/50 p-3 dark:border-slate-800 dark:from-slate-800/70 dark:to-blue-950/20 md:grid-cols-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-xl font-semibold text-[#3F73DF] dark:bg-blue-400/15 dark:text-[#6B96E8]">
                      {(modal.employeeName || "U").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{modal.employeeName || "—"}</p>
                        <GradeBadge grade={modal.employee?.grade} />
                      </div>
                      <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Mail size={14} /> <span className="truncate">{modal.employee?.email || "—"}</span>
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Briefcase size={14} /> {modal.department || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center border-t border-slate-200 pt-3 dark:border-slate-700 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <MapPin size={15} className="text-[#4F83F1]" /> Travel Route
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <MapPin size={14} className="text-[#4F83F1]" /> {modal.fromLocation || "—"}
                      </span>
                      <span className="flex items-center gap-1 text-[#6B96E8]">
                        <span className="w-3 border-t-2 border-dashed border-[#B8CCF3]" />
                        <Plane size={20} />
                        <span className="w-3 border-t-2 border-dashed border-[#B8CCF3]" />
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <MapPin size={14} className="text-[#4F83F1]" /> {modal.toLocation || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Approval progress */}
              <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <CheckCircle size={21} />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Approval Status</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">This request has been approved by the previous levels.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-4 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/20">
                  <div className="relative space-y-3">
                    <div className="absolute bottom-7 left-[15px] top-7 w-px bg-emerald-300 dark:bg-emerald-800" />
                    <div className="relative flex items-start gap-3">
                      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                        <CheckCircle size={18} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">HOD Review</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Approved by {modal.hod?.name || "HOD"}</p>
                          {modal.hodComment && <p className="mt-2 rounded-lg border border-emerald-100 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-emerald-900/50 dark:bg-slate-900/50 dark:text-slate-300">{modal.hodComment}</p>}
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">Completed</span>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{safeFormat((modal as any).hodApprovedAt, "dd MMM yyyy, hh:mm a")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-3">
                      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                        <CheckCircle size={18} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Director Review</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Approved by Director</p>
                          {modal.directorComment && <p className="mt-2 rounded-lg border border-emerald-100 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-emerald-900/50 dark:bg-slate-900/50 dark:text-slate-300">{modal.directorComment}</p>}
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">Completed</span>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{safeFormat((modal as any).directorApprovedAt, "dd MMM yyyy, hh:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Arrangement notes */}
              <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-400/10 dark:text-[#6B96E8]">
                    <FileText size={20} />
                  </span>
                  <div>
                    <label htmlFor="travel-arrangement-notes" className="text-sm font-semibold text-slate-900 dark:text-white">
                      Travel Arrangement Notes <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enter booking reference, flight details, hotel information or any other arrangement details.</p>
                  </div>
                </div>
                <textarea
                  id="travel-arrangement-notes"
                  className="min-h-[72px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#6B96E8] focus:bg-white focus:ring-2 focus:ring-[#E8F0FF] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-[#4F83F1] dark:focus:ring-blue-900/40"
                  placeholder="e.g. Flight booked, hotel details, booking reference..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </section>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={loading}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleProcess()}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3F73DF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle size={17} />
                  {loading ? "Processing..." : "Confirm & Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}