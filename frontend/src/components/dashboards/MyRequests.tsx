import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlusCircle,
  Search,
  ArrowRight,
  Paperclip,
  RefreshCw,
  MapPin,
  Plane,
  CalendarDays,
  Briefcase,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import api from "../../lib/api";
import { TravelRequest, RequestStatus } from "../../types";
import { StatusBadge } from "../ui/Badges";
import { format, isValid } from "date-fns";

const FILTERS: { value: RequestStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING_HOD", label: "Pending HOD" },
  { value: "PENDING_DIRECTOR", label: "Pending Director" },
  { value: "PENDING_TRAVEL_MANAGER", label: "With Travel Mgr" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function getInitialFilter(status: string | null): RequestStatus | "ALL" {
  if (!status) return "ALL";
  if (status === "PENDING") return "PENDING_HOD";

  const match = FILTERS.find((filter) => filter.value === status);
  return match?.value ?? "ALL";
}

function safeFormatDate(value: string | Date | undefined, pattern: string) {
  if (!value) return "—";

  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : "—";
}

export default function MyRequests() {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<RequestStatus | "ALL">(() =>
    getInitialFilter(searchParams.get("status"))
  );
  const navigate = useNavigate();

  const fetchRequests = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const response = await api.get("/travel/my");
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load travel requests:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Keep the selected filter in sync when a card changes the URL.
  useEffect(() => {
    setFilter(getInitialFilter(searchParams.get("status")));
  }, [searchParams]);

  // Fetch on entry and refresh periodically without reloading the page.
  useEffect(() => {
    void fetchRequests();
    const intervalId = window.setInterval(() => {
      void fetchRequests(true);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchRequests]);

  const filtered =
    filter === "ALL"
      ? requests
      : filter === "PENDING_HOD"
        ? requests.filter((request) =>
            String(request.status ?? "").startsWith("PENDING")
          )
        : requests.filter((request) => request.status === filter);

  const requestSummary = [
    {
      label: "Pending",
      count: requests.filter((request) => String(request.status ?? "").startsWith("PENDING")).length,
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
    },
    {
      label: "Approved",
      count: requests.filter((request) => request.status === "APPROVED").length,
      icon: CheckCircle2,
      iconStyle: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    {
      label: "Rejected",
      count: requests.filter((request) => request.status === "REJECTED").length,
      icon: XCircle,
      iconStyle: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
    },
  ];

  const selectFilter = (value: RequestStatus | "ALL") => {
    setFilter(value);

    if (value === "ALL") {
      navigate("/dashboard/my-requests");
    } else if (value.startsWith("PENDING")) {
      navigate("/dashboard/my-requests?status=PENDING");
    } else {
      navigate(`/dashboard/my-requests?status=${value}`);
    }
  };

  const thCls =
    "bg-slate-50/90 px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400";
  const tdCls =
    "border-t border-slate-100 px-4 py-3.5 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300";

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-4 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE7F8] pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            My Travel Requests
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {requests.length} total request
            {requests.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchRequests(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Refresh travel requests"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/new-request")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3F73DF]"
          >
            <PlusCircle size={14} /> New Request
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>Unable to refresh requests. Please try again.</span>
          <button
            type="button"
            onClick={() => void fetchRequests(true)}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
              filter === item.value
                ? "border-[#4F83F1] bg-[#4F83F1] text-white shadow-sm"
                : "border-[#DCE7F8] bg-white text-slate-600 hover:border-[#B9CEF5] hover:text-[#3F73DF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {requestSummary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-[#DCE7F8]/90 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(25,65,120,0.035)] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconStyle}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">{item.count}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DCE7F8] bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
            <RefreshCw size={16} className="animate-spin" />
            Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden bg-gradient-to-r from-slate-50/80 via-white to-[#F0F5FF]/70 px-5 py-7 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20">
            <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#E5EEFF]/40 blur-3xl dark:bg-blue-900/10" />
            <div className="relative flex w-full max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm dark:border-blue-900 dark:bg-slate-800 dark:text-blue-300">
                <Plane size={25} strokeWidth={1.7} />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#4F83F1] text-white dark:border-slate-800">
                  <Search size={10} strokeWidth={2.5} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  {requests.length === 0 ? "Your travel journey starts here" : "No requests found"}
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                  {requests.length === 0
                    ? "You haven't submitted any travel requests yet. Create your first request to get started."
                    : `There are no requests in the ${FILTERS.find((item) => item.value === filter)?.label ?? "selected"} category.`}
                </p>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 sm:justify-start">
                  <CalendarDays size={13} className="shrink-0 text-[#6B96E8]" />
                  Your submitted requests and approval updates will appear here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard/new-request")}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#4F83F1] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3F73DF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1] focus-visible:ring-offset-2"
              >
                <PlusCircle size={14} />
                New Request
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Route</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Dates</th>
                  <th className={thCls}>Purpose</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Ticket</th>
                  <th className={thCls}>Submitted</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((request) => (
                  <tr
                    key={request.id}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer transition hover:bg-[#F0F5FF]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4F83F1] dark:hover:bg-slate-800/50"
                    onClick={() => navigate(`/dashboard/request/${request.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/dashboard/request/${request.id}`);
                      }
                    }}
                  >
                    <td className={tdCls}>
                      <div className="flex min-w-0 items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                        <MapPin size={17} className="shrink-0 fill-blue-600 text-[#4F83F1]" />
                        <span className="max-w-[105px] truncate">{request.fromLocation}</span>
                        <span className="flex shrink-0 items-center gap-0.5 text-[#6B96E8]">
                          <span className="w-3 border-t-2 border-dotted border-[#9CB9EF]" />
                          <Plane size={16} className="fill-blue-500" />
                          <span className="w-3 border-t-2 border-dotted border-[#9CB9EF]" />
                        </span>
                        <MapPin size={17} className="shrink-0 fill-blue-600 text-[#4F83F1]" />
                        <span className="max-w-[105px] truncate">{request.toLocation}</span>
                      </div>
                    </td>

                    <td className={tdCls}>
                      <span className="inline-flex whitespace-nowrap rounded-xl bg-[#F0F5FF] px-3 py-2 text-xs font-normal text-[#4F83F1] dark:bg-blue-950 dark:text-blue-300">
                        {request.travelType === "INTER_COMPANY"
                          ? "Inter Co."
                          : "Outside"}
                      </span>
                    </td>

                    <td className={tdCls}>
                      <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        <CalendarDays size={17} className="shrink-0 text-slate-500" />
                        {safeFormatDate(request.fromDate, "dd MMM yyyy")} –{" "}
                        {safeFormatDate(request.toDate, "dd MMM yyyy")}
                      </div>
                    </td>

                    <td className={`${tdCls} max-w-[180px] truncate text-slate-500 dark:text-slate-400`}>
                      <span className="block max-w-[180px] truncate" title={request.purposeOfVisit}>
                        {request.purposeOfVisit}
                      </span>
                    </td>

                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#F0F5FF] px-3 py-2 text-xs font-medium text-[#3F73DF] dark:bg-blue-950 dark:text-blue-300">
                        <Briefcase size={15} />
                        <StatusBadge status={request.status} />
                      </span>
                    </td>

                    <td className={tdCls}>
                      {request.ticketFile ? (
                        <div className="flex w-fit items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                          <Paperclip size={11} />
                          Available
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className={`${tdCls} whitespace-nowrap text-xs text-slate-500 dark:text-slate-400`}>
                      {safeFormatDate(request.createdAt, "dd MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
