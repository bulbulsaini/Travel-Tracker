

import { useCallback, useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

import {

  ArrowLeft, MapPin, Calendar, CalendarDays, User, Briefcase, MessageSquare,

  CheckCircle, XCircle, BedDouble, Paperclip, Download, Edit, RefreshCw,

  Plane, Building2, FileText, Network, Clock3, Upload,

} from "lucide-react";

import api from "../../lib/api";

import { TravelRequest } from "../../types";

import { useAuth } from "../../hooks/useAuth";

import toast from "react-hot-toast";

import { format, isValid } from "date-fns";

function safeDate(value?: string | Date | null, pattern = "dd MMM yyyy") {

  if (!value) return "—";

  const date = new Date(value);

  return isValid(date) ? format(date, pattern) : "—";

}

export default function RequestDetail() {

  const { id } = useParams();

  const navigate = useNavigate();

  const { user } = useAuth();

  const [req, setReq] = useState<TravelRequest | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loadError, setLoadError] = useState(false);

  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const [actionComment, setActionComment] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [ticketUploading, setTicketUploading] = useState(false);

  const fetchRequest = useCallback(async (manual = false) => {

    if (!id) {

      setReq(null);

      setLoading(false);

      return;

    }

    if (manual) setRefreshing(true);

    else setLoading(true);

    setLoadError(false);

    try {

      const { data } = await api.get(`/travel/${id}`);

      setReq(data ?? null);

    } catch (error) {

      console.error("Failed to load travel request:", error);

      setLoadError(true);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, [id]);

  useEffect(() => {

    void fetchRequest();

    const intervalId = window.setInterval(() => {

      void fetchRequest(true);

    }, 15000);

    return () => window.clearInterval(intervalId);

  }, [fetchRequest]);

  const uploadEmployeeTicket = async (file?: File) => {

    if (!file || !req) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {

      toast.error("Please upload a PDF, JPG, JPEG, or PNG file.");

      return;

    }

    if (file.size > 10 * 1024 * 1024) {

      toast.error("File size must be 10 MB or less.");

      return;

    }

    const formData = new FormData();

    formData.append("ticket", file);

    setTicketUploading(true);

    try {

      await api.post(`/travel/${req.id}/upload-ticket`, formData, {

        headers: { "Content-Type": "multipart/form-data" },

      });

      toast.success("Travel ticket uploaded successfully.");

      await fetchRequest(true);

    } catch (error: any) {

      toast.error(error.response?.data?.error || "Ticket upload failed.");

    } finally {

      setTicketUploading(false);

    }

  };

  const submitHodAction = async () => {

    if (!action || !req) return;

    if (action === "reject" && !actionComment.trim()) {

      toast.error("Please enter a reason before rejecting this request.");

      return;

    }

    setActionLoading(true);

    try {

      await api.patch(`/travel/${req.id}/hod-action`, {

        action,

        comment: actionComment.trim(),

      });

      toast.success(action === "approve" ? "Approved and sent to the next stage" : "Request rejected");

      setAction(null);

      setActionComment("");

      await fetchRequest(true);

    } catch (error: any) {

      toast.error(error.response?.data?.error || "Could not process this request");

    } finally {

      setActionLoading(false);

    }

  };

  if (loading) {

    return <div className="flex h-64 items-center justify-center gap-2 text-sm text-gray-400"><RefreshCw size={15} className="animate-spin" /> Loading…</div>;

  }

  if (!req) {

    return <div className="space-y-4 py-10 text-center text-sm text-gray-500">

      <p>{loadError ? "Unable to load this travel request." : "Travel request could not be loaded."}</p>

      <div className="flex items-center justify-center gap-3">

        <button type="button" onClick={() => void fetchRequest(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[#4F83F1] hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Try again</button>

        <button type="button" onClick={() => navigate(-1)} className="text-[#4F83F1] hover:underline">Go back</button>

      </div>

    </div>;

  }

  const canEdit = user?.role === "EMPLOYEE" && req.employeeId === user.id && req.status === "PENDING_HOD";

  const canHodReview = user?.role === "HOD" && req.status === "PENDING_HOD";

  const canUploadTicket = user?.role === "EMPLOYEE" && req.employeeId === user.id && req.status === "PENDING_TRAVEL_MANAGER";

  // Employee requests go HOD → Travel Manager. HOD-submitted requests also require Director approval.

  const requiresDirector = Boolean(

  req.status === "PENDING_DIRECTOR" ||

  req.directorApprovedAt ||

  req.director

);

  const infoItems = [

    { icon: User, label: "Employee", value: req.employeeName },

    { icon: Briefcase, label: "Department", value: req.department },

    { icon: MapPin, label: "From", value: req.fromLocation },

    { icon: MapPin, label: "To", value: req.toLocation },

    { icon: Calendar, label: "Departure", value: safeDate(req.fromDate) },

    { icon: Calendar, label: "Return", value: safeDate(req.toDate) },

  ];

  const timeline = [

    {

      step: 1,

      label: "Request Submitted",

      sublabel: "Requester",

      done: true,

      date: safeDate(req.createdAt, "dd MMM yyyy, hh:mm a"),

      comment: null as string | null,

      commentBy: null as string | null,

    },

    {

      step: 2,

      label: "HOD Review",

      sublabel: req.hod?.name || "Head of Department",

      done: req.status !== "PENDING_HOD",

      date: req.hodApprovedAt ? safeDate(req.hodApprovedAt, "dd MMM yyyy, hh:mm a") : null,

      comment: req.hodComment || null,

      commentBy: req.hod?.name || "HOD",

    },

    ...(requiresDirector ? [{

      step: 3,

      label: "Director Review",

      sublabel: req.director?.name || "Director",

      done: Boolean(req.directorApprovedAt) || ["PENDING_TRAVEL_MANAGER", "APPROVED"].includes(req.status),

      date: req.directorApprovedAt ? safeDate(req.directorApprovedAt, "dd MMM yyyy, hh:mm a") : null,

      comment: req.directorComment || null,

      commentBy: req.director?.name || "Director",

    }] : []),

    {

      step: requiresDirector ? 4 : 3,

      label: "Travel Manager",

      sublabel: req.travelManager?.name || "Travel Manager",

      done: req.status === "APPROVED",

      date: req.travelManagerProcessedAt ? safeDate(req.travelManagerProcessedAt, "dd MMM yyyy, hh:mm a") : null,

      comment: req.travelManagerComment || null,

      commentBy: req.travelManager?.name || "Travel Manager",

    },

  ];

  const statusLabel = req.status === "APPROVED"

    ? "Approved"

    : req.status === "REJECTED"

      ? "Rejected"

      : req.status === "PENDING_HOD"

        ? "Pending HOD"

        : req.status === "PENDING_DIRECTOR"

          ? "Pending Director"

          : "With Travel Manager";

  const statusTone = req.status === "APPROVED"

    ? "bg-emerald-600 text-white"

    : req.status === "REJECTED"

      ? "bg-rose-600 text-white"

      : "bg-[#4F83F1] text-white";

  // Resolve ticket paths safely. Axios baseURL may be relative (for example, "/api"),

  // so normalize it against the current site before using it as a URL base.

  const ticketUrl = (() => {

    if (!req.ticketFile) return "";

    if (/^https?:\/\//i.test(req.ticketFile)) return req.ticketFile;

    let baseOrigin = window.location.origin;

    const configuredBase = api.defaults.baseURL;

    if (configuredBase) {

      try {

        baseOrigin = new URL(configuredBase, window.location.origin).origin;

      } catch (error) {

        console.warn("Invalid API base URL; using the current site for ticket links.", error);

      }

    }

    return new URL(req.ticketFile, baseOrigin).toString();

  })();

  return (

    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-slate-900 dark:text-slate-100">

      {/* Page actions */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <button

          type="button"

          onClick={() => navigate(-1)}

          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"

        >

          <ArrowLeft size={16} /> Back

        </button>

        <div className="flex flex-wrap items-center gap-2">

          <button

            type="button"

            onClick={() => void fetchRequest(true)}

            disabled={refreshing}

            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"

          >

            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh

          </button>

          {canEdit && (

            <button

              type="button"

              onClick={() => navigate(`/dashboard/new-request?edit=${req.id}`)}

              className="inline-flex items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3F73DF]"

            >

              <Edit size={15} /> Edit Request

            </button>

          )}

        </div>

      </div>

      {/* Route summary banner */}

      <section className="relative isolate overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-r from-[#eaf3ff] via-[#f4f8ff] to-[#e2efff] px-4 py-4 shadow-[0_3px_12px_rgba(25,65,120,0.04)] sm:px-6 sm:py-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] opacity-70 sm:block" aria-hidden="true">

          <svg viewBox="0 0 620 170" className="h-full w-full" preserveAspectRatio="xMidYMid slice">

            <path d="M0 145 Q100 112 180 142 T360 132 T620 138 V170 H0Z" fill="#DCE7F8" opacity=".55" />

            <path d="M0 151 Q110 126 205 148 T410 142 T620 146" fill="none" stroke="#9DBCF4" strokeWidth="2" />

            <path d="M60 90 C150 18 220 35 300 76 S430 112 500 42" fill="none" stroke="#6B96E8" strokeWidth="2" strokeDasharray="5 8" />

            <g fill="#9DBCF4" opacity=".8">

              <rect x="350" y="92" width="34" height="58" rx="2"/><rect x="390" y="72" width="42" height="78" rx="2"/><rect x="442" y="102" width="28" height="48" rx="2"/>

              <path d="M386 72h50l-25-22z"/><rect x="500" y="86" width="54" height="64" rx="2"/><path d="M496 86h62l-31-24z"/>

              <circle cx="120" cy="65" r="5"/><circle cx="300" cy="76" r="5"/>

            </g>

            <path d="M225 42l42 12-42 12 8-12z" fill="#4F83F1" opacity=".8" />

          </svg>

        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">

            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-[#4F83F1] shadow-sm sm:flex dark:bg-slate-800">

              <MapPin size={24} />

            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{req.fromLocation} <span className="text-[#6B96E8]">→</span> {req.toLocation}</h1>

                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>

                  {req.status === "APPROVED" ? <CheckCircle size={13} /> : req.status === "REJECTED" ? <XCircle size={13} /> : <Clock3 size={13} />}

                  {statusLabel}

                </span>

              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Request details and approval progress</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">

                <span className="rounded-lg border border-white/80 bg-white/75 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{req.travelType === "INTER_COMPANY" ? "Inter Company" : "Outside Travel"}</span>

                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><CalendarDays size={14} /> Submitted {safeDate(req.createdAt)}</span>

              </div>

            </div>

          </div>

          <div className="relative z-10 hidden shrink-0 items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-medium text-slate-600 backdrop-blur-sm sm:flex dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">

            <Plane size={18} className="text-[#4F83F1]" /> Travel request

          </div>

        </div>

      </section>

      {loadError && (

        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">

          Could not refresh request details. Showing the last loaded information.

          <button type="button" onClick={() => void fetchRequest(true)} className="ml-2 font-semibold underline">Retry</button>

        </div>

      )}

      {canEdit && (

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">

          <span className="text-amber-600">⚠</span>

          <p className="flex-1 text-xs font-medium text-amber-800 dark:text-amber-300">This request is still pending HOD review. You can edit it until the HOD takes action.</p>

          <button onClick={() => navigate(`/dashboard/new-request?edit=${req.id}`)} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"><Edit size={12} /> Edit</button>

        </div>

      )}

      {canHodReview && (

        <section className="rounded-2xl border border-[#DCE7F8] bg-[#F0F5FF]/80 p-4 sm:p-5 dark:border-[#24436D] dark:bg-[#142B4D]/30">

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">HOD Approval Required</h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review this request and choose whether to approve or reject it.</p>

          {action ? (

            <div className="mt-4 space-y-3">

              <label htmlFor="hod-action-comment" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{action === "reject" ? "Reason for rejection (required)" : "Comment (optional)"}</label>

              <textarea id="hod-action-comment" value={actionComment} onChange={(event) => setActionComment(event.target.value)} rows={3} placeholder={action === "reject" ? "Enter the reason for rejecting this request" : "Add an optional approval comment"} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4F83F1] dark:border-slate-700 dark:bg-slate-900" />

              <div className="flex flex-wrap gap-2">

                <button type="button" onClick={() => void submitHodAction()} disabled={actionLoading} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{actionLoading ? "Submitting…" : action === "approve" ? "Confirm Approval" : "Confirm Rejection"}</button>

                <button type="button" onClick={() => { setAction(null); setActionComment(""); }} disabled={actionLoading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Cancel</button>

              </div>

            </div>

          ) : (

            <div className="mt-4 flex flex-wrap gap-2">

              <button type="button" onClick={() => setAction("approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"><CheckCircle size={15} /> Approve</button>

              <button type="button" onClick={() => setAction("reject")} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"><XCircle size={15} /> Reject</button>

            </div>

          )}

        </section>

      )}

      {/* Main content: information on the left, approval progress on the right */}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">

        <div className="space-y-4 lg:col-span-7">

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#142B4D]"><Building2 size={20} /></span>

              <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Travel Information</h2><p className="text-xs text-slate-500 dark:text-slate-400">Basic details of your travel request.</p></div>

            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-5 p-4 sm:grid-cols-2 sm:p-5">

              {infoItems.map(({ icon: Icon, label, value }) => (

                <div key={label} className="flex min-w-0 items-center gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#142B4D]"><Icon size={18} /></span>

                  <div className="min-w-0"><div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div><div className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{value || "—"}</div></div>

                </div>

              ))}

              {req.accommodation && <div className="sm:col-span-2"><span className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-[#F0F5FF] px-3 py-2 text-xs font-semibold text-[#3F73DF] dark:border-[#24436D] dark:bg-[#142B4D] dark:text-blue-300"><BedDouble size={15} /> Accommodation Required</span></div>}

            </div>

          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#142B4D]"><FileText size={19} /></span>

              <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Purpose of Visit</h2><p className="text-xs text-slate-500 dark:text-slate-400">Business purpose for this trip.</p></div>

            </div>

            <div className="space-y-4 p-4 sm:p-5">

              <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">{req.purposeOfVisit || "No purpose provided."}</p>

              {req.additionalNotes && <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Additional Notes</h3><p className="rounded-xl border border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">{req.additionalNotes}</p></div>}

            </div>

          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#142B4D]"><Paperclip size={19} /></span>

              <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Travel Ticket</h2><p className="text-xs text-slate-500 dark:text-slate-400">Upload your ticket after the request receives final approval.</p></div>

            </div>

            <div className="p-4 sm:p-5">

              {req.ticketFile ? (

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm dark:bg-slate-900"><FileText size={22} /></span>

                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900 dark:text-white">Travel ticket uploaded</div>{req.ticketUploadedAt && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Uploaded {safeDate(req.ticketUploadedAt, "dd MMM yyyy, hh:mm a")}</div>}</div>

                  <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7F8] bg-white px-3.5 py-2 text-xs font-semibold text-[#3F73DF] transition hover:bg-[#F0F5FF] dark:border-[#24436D] dark:bg-slate-900 dark:text-blue-300"><Download size={14} /> View / Download</a>

                  {canUploadTicket && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4F83F1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#3F73DF]"> <Upload size={14} /> Replace ticket<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" disabled={ticketUploading} onChange={(e) => { void uploadEmployeeTicket(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}

                </div>

              ) : canUploadTicket ? (

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#C6D8F8] bg-[#F0F5FF]/60 px-4 py-4 dark:border-blue-800 dark:bg-[#142B4D]/20">

                  <div><div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Your request is approved</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upload your ticket (PDF, JPG or PNG · max 10 MB).</div></div>

                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4F83F1] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3F73DF] ${ticketUploading ? "pointer-events-none opacity-60" : ""}`}><Upload size={14} /> {ticketUploading ? "Uploading..." : "Upload Ticket"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" disabled={ticketUploading} onChange={(e) => { void uploadEmployeeTicket(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>

                </div>

              ) : (

                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-900"><Paperclip size={18} /></span>

                  <div><div className="text-sm font-medium text-slate-700 dark:text-slate-200">No ticket uploaded yet</div><div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Ticket upload becomes available after HOD and Director approval.</div></div>

                </div>

              )}

            </div>

          </section>

        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(25,65,120,0.05)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">

          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#142B4D]"><Network size={19} /></span>

            <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Approval Timeline</h2><p className="text-xs text-slate-500 dark:text-slate-400">Track the current status and history of your request.</p></div>

          </div>

          <div className="p-4 sm:p-5">

            <div className="relative">

              {timeline.map((step, idx) => (

                <div key={step.step} className="flex gap-3.5">

                  <div className="flex shrink-0 flex-col items-center">

                    <div className={`z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${step.done ? "bg-emerald-600 text-white" : req.status === "REJECTED" ? "bg-rose-100 text-rose-500" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>

                      {step.done ? <CheckCircle size={18} /> : <span className="text-xs font-semibold">{step.step}</span>}

                    </div>

                    {idx < timeline.length - 1 && <div className={`my-1 min-h-[34px] w-0.5 flex-1 ${step.done ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />}

                  </div>

                  <div className={`min-w-0 flex-1 ${idx === timeline.length - 1 ? "pb-0" : "pb-5"}`}>

                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">

                      <div><div className={`text-sm font-semibold ${step.done ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{step.label}</div><div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.sublabel}</div></div>

                      {step.done && step.date && <span className="text-left text-[11px] text-slate-400 sm:text-right">{step.date}</span>}

                    </div>

                    {step.comment && <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><div className="mb-1 flex items-center gap-1.5"><MessageSquare size={12} className="opacity-70" /><span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{step.commentBy}</span></div>“{step.comment}”</div>}

                    {!step.done && req.status !== "REJECTED" && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Awaiting review</div>}

                    {req.status === "REJECTED" && !step.done && step.label !== "Travel Manager" && <div className="mt-2 text-[11px] font-medium text-rose-600">Not completed</div>}

                  </div>

                </div>

              ))}

            </div>

          </div>

        </section>

      </div>

    </div>

  );

}
