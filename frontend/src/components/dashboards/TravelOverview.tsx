import { useEffect, useMemo, useState } from "react";
import {
  Users, Search, Plane, Filter, RotateCcw,
  MapPin, CalendarDays, ArrowRight, X, ClipboardList,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { format, isValid } from "date-fns";

type TravelRecord = {
  id: string;
  employeeId?: string | null;
  employeeName: string;
  department?: string | null;
  fromLocation: string;
  toLocation: string;
  fromDate: string;
  toDate: string;
  status: string;
  hodApprovedAt?: string | null;
  employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string | null;
    grade?: number | null;
  };
  hod?: { name: string };
};

const inputClass =
  "w-full rounded-xl border border-[#DCE7F8] bg-white/90 py-2.5 pl-11 pr-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#6B96E8] focus:ring-4 focus:ring-[#DCE7F8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/30";

const dateLabel = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return isValid(date) ? format(date, "dd MMM yyyy") : "—";
};

const roleLabel = (role?: string) =>
  (role || "EMPLOYEE").replace(/_/g, " ");

const statusStyle = (status: string) => {
  if (status.includes("REJECT")) return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  if (status.includes("APPROV")) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status.includes("TRAVEL_MANAGER")) return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
};

export default function DirectorTravelOverview() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadRecords = () => {
    setLoading(true);
    setError("");
    api.get("/travel/director/all")
      .then(({ data }) => setRecords(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load Director travel overview:", err);
        setError("Unable to load travel records. Please retry.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    api.get("/travel/director/all")
      .then(({ data }) => {
        if (active) setRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load Director travel overview:", err);
        if (active) setError("Unable to load travel records. Please retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const approvedByHod = useMemo(
    () => records.filter((record) => Boolean(record.hodApprovedAt)),
    [records]
  );

  // One search field filters only the four requested employee attributes.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return approvedByHod;

    return approvedByHod.filter((record) => {
      const role = roleLabel(record.employee?.role).toLowerCase();
      const department = record.department || record.employee?.department || "";
      const grade = record.employee?.grade;
      const values = [
        record.employeeId,
        role,
        role.replace(/\s+/g, "_"),
        department,
        grade,
        grade == null ? "" : `G${grade}`,
        grade == null ? "" : `Grade ${grade}`,
      ];
      return values.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );
    });
  }, [approvedByHod, search]);

  const hasSearch = Boolean(search.trim());

  return (
    <div className="space-y-3.5 text-slate-800 dark:text-slate-100">
      {/* Travel overview banner */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#E8F0FF] via-[#F5F8FF] to-[#DCE7F8] px-5 py-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute -right-8 -top-16 -z-10 h-64 w-64 rounded-full bg-white/50 blur-2xl dark:bg-[#6B96E8]/5" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 -z-10 h-48 w-72 rounded-full bg-[#B8CCF3]/30 blur-3xl dark:bg-[#6B96E8]/10" />
        <div className="pointer-events-none absolute right-[27%] top-1/2 hidden -translate-y-1/2 items-center gap-3 text-[#9DB9ED]/70 lg:flex">
          <span className="h-px w-16 border-t-2 border-dashed border-[#9DB9ED]/70" />
          <Plane size={34} className="-rotate-12" />
          <span className="h-px w-16 border-t-2 border-dashed border-[#9DB9ED]/70" />
          <MapPin size={23} />
        </div>

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4F83F1] dark:text-[#6B96E8]">
              Director Workspace
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Travel Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Review travel requests that have passed HOD approval.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <div className="flex min-w-[142px] items-center gap-3 rounded-xl border border-white/80 bg-white/85 px-3.5 py-2.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950/60 dark:text-[#9DB9ED]">
                <Users size={20} />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-white">{filtered.length}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">HOD-approved trips</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Single unified search */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950/60 dark:text-[#9DB9ED]">
              <Filter size={17} />
            </span>
            Filter Travel Records
          </h2>
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#4F83F1] transition hover:bg-[#E8F0FF] dark:text-[#6B96E8] dark:hover:bg-blue-950/40"
            >
              <RotateCcw size={13} /> Clear filters
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search by employee ID, request type, department or grade"
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Employee ID, Request Type, Department or Grade..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          <span>
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</strong> of {approvedByHod.length} HOD-approved requests
            {user?.name ? ` · ${user.name}` : ""}
          </span>
          {hasSearch && <span className="rounded-full bg-[#E8F0FF] px-2.5 py-1 font-medium text-[#3F73DF] dark:bg-blue-950/50 dark:text-[#9DB9ED]">Search active</span>}
        </div>
      </section>

      {/* Travel records table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950/60 dark:text-[#9DB9ED]">
              <ClipboardList size={19} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Travel Records</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">HOD-approved employee journeys</p>
            </div>
          </div>
          <span className="rounded-full bg-[#E8F0FF] px-3 py-1.5 text-xs font-semibold text-[#3F73DF] dark:bg-blue-950/50 dark:text-[#9DB9ED]">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>
        </div>

        {error ? (
          <div className="p-7 text-center" role="alert">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
            <button type="button" onClick={loadRecords} className="mt-3 rounded-lg bg-[#4F83F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3F73DF]">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-7 text-center" role="status" aria-live="polite">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#DCE7F8] border-t-[#4F83F1] dark:border-slate-700 dark:border-t-[#6B96E8]" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading travel records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50/90 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                <tr>
                  {["Requester", "Employee ID", "Type", "Department", "Grade", "Route", "HOD", "Date", "Status"].map((heading) => (
                    <th key={heading} scope="col" className="whitespace-nowrap border-b border-slate-100 px-4 py-2.5 font-bold dark:border-slate-700">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DCE7F8] bg-[#E8F0FF] text-[#6B96E8] dark:border-slate-700 dark:bg-slate-800 dark:text-[#9DB9ED]">
                        <Plane size={25} />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {hasSearch ? "No matching travel records" : "No HOD-approved travel records yet"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {hasSearch ? "Try another Employee ID, Request Type, Department or Grade." : "Approved travel requests will appear here."}
                      </p>
                      {hasSearch && (
                        <button type="button" onClick={() => setSearch("")} className="mt-3 text-xs font-semibold text-[#4F83F1] hover:underline dark:text-[#6B96E8]">
                          Clear search
                        </button>
                      )}
                    </td>
                  </tr>
                ) : filtered.map((record) => {
                  const name = record.employeeName || record.employee?.name || "Employee";
                  const department = record.department || record.employee?.department || "—";
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-[#E8F0FF]/40 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE7F8] text-sm font-bold text-[#3F73DF] dark:bg-blue-950 dark:text-[#9DB9ED]">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
                            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Employee</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[170px] truncate px-4 py-3 font-medium text-slate-600 dark:text-slate-300" title={record.employeeId || ""}>
                        {record.employeeId || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-lg bg-[#E8F0FF] px-2.5 py-1.5 text-[10px] font-semibold text-[#3F73DF] dark:bg-blue-950/50 dark:text-[#9DB9ED]">
                          {roleLabel(record.employee?.role)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{department}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                        {record.employee?.grade != null ? `G${record.employee.grade}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                          <MapPin size={14} className="shrink-0 text-[#4F83F1]" />
                          {record.fromLocation || "—"}
                          <Plane size={14} className="shrink-0 text-[#6B96E8]" />
                          <MapPin size={14} className="shrink-0 text-[#4F83F1]" />
                          {record.toLocation || "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{record.hod?.name || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <CalendarDays size={13} className="text-slate-400" />
                          {dateLabel(record.fromDate)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${statusStyle(record.status)}`}>
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                          {record.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 sm:px-5">
            <span>Showing {filtered.length} of {approvedByHod.length} HOD-approved requests</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
              <ArrowRight size={13} className="text-[#6B96E8]" /> Latest travel records
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
