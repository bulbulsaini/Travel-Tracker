
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  ArrowRight,
  Search,
  Plane,
  ClipboardList,
  FileText,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { TravelRequest } from "../../types";
import { StatusBadge } from "../ui/Badges";
import { format } from "date-fns";

export default function TravelHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [showSort, setShowSort] = useState(false);

  const showEmployeeColumn = user?.role !== "EMPLOYEE";

  // Keep the empty-state shortcuts within routes available to each role.
  const requestsPath =
    user?.role === "ADMIN" || user?.role === "DIRECTOR"
      ? "/dashboard/all-requests"
      : user?.role === "TRAVEL_MANAGER"
        ? "/dashboard/pending"
        : "/dashboard/my-requests";

  const fetchHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<TravelRequest[]>("/travel/history");
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error("Failed to load travel history:", err);
      setHistory([]);
      setError(
        err.response?.data?.error ||
          "Unable to load travel history. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = history.filter((r) => {
      if (!query) return true;

      return [
        r.employeeName,
        r.department,
        r.fromLocation,
        r.toLocation,
        r.purposeOfVisit,
      ].some((value) => value?.toLowerCase().includes(query));
    });

    return [...result].sort((a, b) => {
      const aDate = new Date(a.toDate).getTime();
      const bDate = new Date(b.toDate).getTime();
      return sort === "latest" ? bDate - aDate : aDate - bDate;
    });
  }, [history, search, sort]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F0F5FF] border border-[#DCE7F8] flex items-center justify-center">
              <History size={16} className="text-[#4F83F1]" />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Travel History
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Review completed business travel and past requests.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {history.length} completed record
          {history.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search and sort controls */}
      {!loading && history.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by route, employee, department or purpose..."
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#4F83F1] focus:ring-2 focus:ring-[#DCE7F8]"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSort((v) => !v)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-600 hover:border-gray-300"
            >
              <SlidersHorizontal size={14} />
              {sort === "latest" ? "Latest first" : "Oldest first"}
              <ChevronDown size={13} />
            </button>

            {showSort && (
              <div className="absolute right-0 mt-2 z-10 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSort("latest");
                    setShowSort(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md ${
                    sort === "latest"
                      ? "bg-[#F0F5FF] text-[#3F73DF]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Latest first
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSort("oldest");
                    setShowSort(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md ${
                    sort === "oldest"
                      ? "bg-[#F0F5FF] text-[#3F73DF]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Oldest first
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="px-6 py-20 text-center">
            <div className="w-9 h-9 mx-auto border-2 border-[#DCE7F8] border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">
              Loading travel history...
            </p>
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <History size={28} className="mx-auto text-rose-400" />
            <p className="mt-3 text-sm font-semibold text-gray-700">Travel history could not be loaded</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => void fetchHistory()}
              className="mt-4 rounded-lg bg-[#4F83F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3F73DF]"
            >
              Try again
            </button>
          </div>
        ) : history.length === 0 ? (
          <section className="relative isolate overflow-hidden rounded-xl bg-[linear-gradient(112deg,#F8FAFF_0%,#F0F5FF_54%,#E7EFFF_100%)] px-5 py-7 sm:px-8 sm:py-9 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#E5EEFF]/50 blur-3xl dark:bg-blue-900/20" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl dark:bg-sky-900/10" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
              <div className="max-w-lg py-2">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE7F8] bg-white text-[#4F83F1] shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
                  <History size={19} />
                </div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4F83F1] dark:text-blue-300">
                  Travel history
                </p>
                <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[34px] dark:text-white">
                  No completed trips yet
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Once a travel request is completed, your business travel records will appear here. You can then review past trips, destinations and travel details anytime.
                </p>
                {(user?.role === "EMPLOYEE" || user?.role === "HOD") && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/new-request")}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#4F83F1] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3F73DF] focus:outline-none focus:ring-2 focus:ring-[#4F83F1] focus:ring-offset-2"
                  >
                    <span aria-hidden="true">+</span>
                    Create Travel Request
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>

              <div className="relative mx-auto w-full max-w-[470px]">
                <div className="absolute bottom-10 left-[25px] top-10 border-l-2 border-dashed border-[#DCE7F8] dark:border-blue-800" aria-hidden="true" />
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate((user?.role === "EMPLOYEE" || user?.role === "HOD") ? "/dashboard/new-request" : requestsPath)}
                    className="group relative flex w-full items-center gap-4 rounded-xl border border-[#DCE7F8]/80 bg-white/90 px-4 py-4 text-left shadow-[0_5px_18px_rgba(35,83,145,0.06)] transition hover:-translate-y-0.5 hover:border-[#DCE7F8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-blue-700"
                  >
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] ring-4 ring-[#f4f8ff] dark:bg-blue-950 dark:text-blue-300 dark:ring-slate-900">
                      <Plane size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">Plan Trip</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Submit a travel request for your business visit</span>
                    </span>
                    <span className="text-sm font-semibold text-blue-200 transition group-hover:text-[#4F83F1]">01</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(requestsPath)}
                    className="group relative flex w-full items-center gap-4 rounded-xl border border-[#DCE7F8]/80 bg-white/90 px-4 py-4 text-left shadow-[0_5px_18px_rgba(35,83,145,0.06)] transition hover:-translate-y-0.5 hover:border-[#DCE7F8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-blue-700"
                  >
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] ring-4 ring-[#f4f8ff] dark:bg-blue-950 dark:text-blue-300 dark:ring-slate-900">
                      <ClipboardList size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">Travel</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">View and manage your travel requests</span>
                    </span>
                    <span className="text-sm font-semibold text-blue-200 transition group-hover:text-[#4F83F1]">02</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/history")}
                    className="group relative flex w-full items-center gap-4 rounded-xl border border-[#DCE7F8]/80 bg-white/90 px-4 py-4 text-left shadow-[0_5px_18px_rgba(35,83,145,0.06)] transition hover:-translate-y-0.5 hover:border-[#DCE7F8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-blue-700"
                  >
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] ring-4 ring-[#f4f8ff] dark:bg-blue-950 dark:text-blue-300 dark:ring-slate-900">
                      <FileText size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">View History</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Access your completed travel records here</span>
                    </span>
                    <span className="text-sm font-semibold text-blue-200 transition group-hover:text-[#4F83F1]">03</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : filteredHistory.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Search size={26} className="mx-auto text-gray-300" />
            <p className="text-sm font-medium text-gray-600 mt-3">
              No matching records
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-[#4F83F1] hover:underline mt-1"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {showEmployeeColumn && (
                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                      Employee
                    </th>
                  )}

                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Route
                  </th>

                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Dates
                  </th>

                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Purpose
                  </th>

                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>

                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/dashboard/request/${r.id}`)}
                    className="group border-b border-gray-50 last:border-0 hover:bg-[#F0F5FF]/30 cursor-pointer transition"
                  >
                    {showEmployeeColumn && (
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-800">
                          {r.employeeName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {r.department}
                        </div>
                      </td>
                    )}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        {r.fromLocation}
                        <ArrowRight size={13} className="text-[#6B96E8]" />
                        {r.toLocation}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(r.fromDate), "dd MMM")} –{" "}
                      {format(new Date(r.toDate), "dd MMM yyyy")}
                    </td>

                    <td className="px-5 py-4 max-w-[240px]">
                      <p className="text-sm text-gray-600 truncate">
                        {r.purposeOfVisit}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-600">
                          {r.estimatedCost
                            ? `₹${r.estimatedCost.toLocaleString("en-IN")}`
                            : "—"}
                        </span>

                        <ArrowRight
                          size={13}
                          className="text-gray-300 group-hover:text-[#6B96E8] transition"
                        />
                      </div>
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
