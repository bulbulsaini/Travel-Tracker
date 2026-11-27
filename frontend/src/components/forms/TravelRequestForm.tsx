import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  Plane,
  Building,
  MapPin,
  FileText,
  Send,
  BadgeCheck,
  Edit,
  ChevronRight,
  PlusCircle,
  ClipboardList,
} from "lucide-react";

import api from "../../lib/api";
import { HOD } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

type TravelType = "INTER_COMPANY" | "OUTSIDE";

const DEPARTMENTS = [
  "Business Strategy",
  "Maintenance",
  "Vendor Relations",
  "Customer Relations",
  "I.T ERP",
  "Skids & Pilot Plant",
  "Operations",
  "Design & Engineering",
  "Quality",
  "Bending",
  "Employee Relations",
  "I.T.",
  "Projects",
  "HR & Admin",
  "Finance",
  "CMD's Office",
];


function QuickActions({
  onNewRequest,
  onMyRequests,
}: {
  onNewRequest: () => void;
  onMyRequests: () => void;
}) {
  const actions = [
    {
      title: "New Request",
      description: "Create a new travel request",
      icon: PlusCircle,
      onClick: onNewRequest,
    },
    {
      title: "My Requests",
      description: "View and track your requests",
      icon: ClipboardList,
      onClick: onMyRequests,
    },
  ];

  return (
    <section aria-label="Quick Actions" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map(({ title, description, icon: Icon, onClick }) => (
        <button
          key={title}
          type="button"
          onClick={onClick}
          className="group flex items-center gap-3 rounded-xl border border-[#DCE7F8] bg-white p-4 text-left shadow-[0_2px_8px_rgba(25,65,120,0.035)] transition hover:border-[#B8CCF3] hover:bg-[#F8FAFF] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F83F1] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#4F83F1] dark:bg-blue-950/60 dark:text-blue-300">
            <Icon size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#4F83F1]" />
        </button>
      ))}
    </section>
  );
}

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return null;

  const cls =
    grade >= 7
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : grade >= 5
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : grade >= 3
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold ${cls}`}
    >
      <BadgeCheck size={12} />
      Grade {grade}
    </span>
  );
}

function FormSteps({ active }: { active: 1 | 2 | 3 }) {
  const steps = ["Travel Type", "Travel Details", "Review"];

  return (
    <nav
      aria-label="Travel request progress"
      className="mb-7 w-full max-w-3xl"
    >
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const stepNo = index + 1;
          const isActive = stepNo === active;
          const isDone = stepNo < active;

          return (
            <li
              key={step}
              className={`flex min-w-0 items-center ${
                index < steps.length - 1 ? "flex-1" : "flex-none"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-current={isActive ? "step" : undefined}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : isDone
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                  }`}
                >
                  {isDone ? "✓" : stepNo}
                </span>

                <span
                  className={`truncate text-xs font-medium sm:text-sm ${
                    isActive
                      ? "text-slate-900 dark:text-gray-100"
                      : "text-slate-500 dark:text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-px flex-1 sm:mx-4 ${
                    isDone
                      ? "bg-blue-300 dark:bg-blue-800"
                      : "bg-slate-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
        Step {active} of {steps.length}
      </p>
    </nav>
  );
}

export default function TravelRequestForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const isHOD = user?.role === "HOD";

  const [travelType, setTravelType] = useState<TravelType | null>(null);
  const [hods, setHods] = useState<HOD[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [form, setForm] = useState({
    hodId: "",
    fromLocation: "",
    toLocation: "",
    fromDate: "",
    toDate: "",
    purposeOfVisit: "",
    accommodation: false,
    additionalNotes: "",
  });

  useEffect(() => {
    api
      .get("/travel/hods")
      .then((r) => setHods(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;

    setLoadingEdit(true);

    api
      .get(`/travel/${editId}`)
      .then((r) => {
        const req = r.data;

        setTravelType(req.travelType);

        setForm({
          hodId: req.hodId,
          fromLocation: req.fromLocation,
          toLocation: req.toLocation,
          fromDate: req.fromDate.split("T")[0],

                    toDate: req.toDate.split("T")[0],
          purposeOfVisit: req.purposeOfVisit,
          accommodation: req.accommodation,
          additionalNotes: req.additionalNotes || "",
        });

        if (r.data.hod?.department) {
          setSelectedDept(r.data.hod.department);
        }
      })
      .catch(() => {
        toast.error("Failed to load request");
        navigate("/dashboard/my-requests");
      })
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  useEffect(() => {
    if (!isEditMode || !form.hodId || hods.length === 0) return;

    const matchedHod = hods.find((h) => h.id === form.hodId);

    if (matchedHod) setSelectedDept(matchedHod.department);
  }, [hods, form.hodId, isEditMode]);

  const set = (field: string, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const grade = user?.grade ?? 5;

 const normalizeDepartment = (department?: string | null) =>
  (department ?? "").trim().toLowerCase();

const hodForDept = hods.find(
  (hod) =>
    normalizeDepartment(hod.department) ===
    normalizeDepartment(selectedDept),
);

const handleDeptChange = (dept: string) => {
  setSelectedDept(dept);

  const matchedHod = hods.find(
    (hod) =>
      normalizeDepartment(hod.department) ===
      normalizeDepartment(dept),
  );

  setForm((prev) => ({
    ...prev,
    hodId: matchedHod?.id ?? "",
  }));
};
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!travelType) {
      toast.error("Please select a travel type.");
      return;
    }

    if (!form.fromLocation.trim() || !form.toLocation.trim()) {
      toast.error(
        "Please enter both departure and destination locations."
      );
      return;
    }

    if (!form.fromDate || !form.toDate) {
      toast.error(
        "Please select both departure and return dates."
      );
      return;
    }

    if (form.toDate < form.fromDate) {
      toast.error(
        "Return date cannot be earlier than the departure date."
      );
      return;
    }

    if (!form.purposeOfVisit.trim()) {
      toast.error("Please enter the purpose of your visit.");
      return;
    }

    // HOD doesn't need to select a HOD
    if (!isHOD && !form.hodId) {
      toast.error(
        "No HOD found for the selected department. Contact admin."
      );
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        await api.patch(`/travel/${editId}`, {
          ...form,
          travelType,
        });

        toast.success("Request updated successfully!");
      } else {
        await api.post("/travel", {
          ...form,
          travelType,
        });

        toast.success("Travel request submitted!");
      }

      navigate("/dashboard/my-requests");
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || "Failed to submit"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm " +
    "text-slate-800 placeholder-slate-400 transition hover:border-slate-300 " +
    "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 " +
    "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 " +
    "dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-gray-300";

  if (loadingEdit) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-4xl space-y-5 py-4"
      >
        <span className="sr-only">
          Loading travel request…
        </span>

        <div className="h-7 w-56 animate-pulse rounded-md bg-slate-200 dark:bg-gray-800" />

        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100 dark:bg-gray-800/70" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>

        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    );
  }

  if (!travelType) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        {/* Compact page banner with a subtle location-map watermark */}
        <section className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#f1f7ff] via-white to-[#e7f1ff] px-4 py-4 sm:px-5">
          <svg
            aria-hidden="true"
            viewBox="0 0 640 150"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
          >
            <path d="M280 20 C340 65 360 5 420 48 S520 85 610 25" fill="none" stroke="#9fc5fa" strokeWidth="2" strokeDasharray="4 7" />
            <path d="M300 125 C365 85 430 130 490 88 S570 50 640 95" fill="none" stroke="#c4dcfb" strokeWidth="1.5" strokeDasharray="3 7" />
            <circle cx="330" cy="47" r="5" fill="#8bb8f5" />
            <circle cx="425" cy="48" r="5" fill="#8bb8f5" />
            <circle cx="530" cy="75" r="5" fill="#8bb8f5" />
            <g fill="#d7e8fc" opacity=".75">
              <path d="M355 98h18v-30h18v30h12V52h19v46h13v-20h18v20h14v20H355z" />
              <path d="M485 115h20V86h16v29h12V67h21v48h16v15h-85z" />
            </g>
            <g fill="#fff" stroke="#8bb8f5" strokeWidth="2">
              <path d="M425 24c-8 0-14 6-14 14 0 10 14 25 14 25s14-15 14-25c0-8-6-14-14-14z" />
              <circle cx="425" cy="38" r="4" fill="#8bb8f5" stroke="none" />
              <path d="M530 55c-7 0-12 5-12 12 0 9 12 21 12 21s12-12 12-21c0-7-5-12-12-12z" />
              <circle cx="530" cy="67" r="3.5" fill="#8bb8f5" stroke="none" />
            </g>
          </svg>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(isEditMode ? "/dashboard/my-requests" : "/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-white hover:text-blue-700"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                New Travel Request
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose the travel type that best fits your journey
              </p>
            </div>
          </div>
        </section>

        {!isEditMode && (
          <QuickActions
            onNewRequest={() => setTravelType(null)}
            onMyRequests={() => navigate("/dashboard/my-requests")}
          />
        )}

        <FormSteps active={1} />

        {/* Traveler summary */}
        <section className="mb-1 flex max-w-5xl items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.045)] sm:px-5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Traveler
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.department}</p>
          </div>
          <GradeBadge grade={grade} />
        </section>

        <div className="max-w-5xl">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Choose your travel type</h2>
              <p className="mt-1 text-xs text-slate-500">Select one option to continue to travel details.</p>
            </div>
            <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 sm:inline-flex">
              Step 1 of 3
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {[
              {
                type: "INTER_COMPANY" as TravelType,
                icon: Building,
                title: "Inter Company Travel",
                desc: "Travel between company offices, branches, or sister companies.",
                detail: "For visits across company locations",
                accent: "blue",
              },
              {
                type: "OUTSIDE" as TravelType,
                icon: MapPin,
                title: "Outside Travel",
                desc: "Travel to client sites, conferences, or external locations.",
                detail: "For external business visits",
                accent: "orange",
              },
            ].map(({ type, icon: Icon, title, desc, detail, accent }) => (
              <button
                key={type}
                type="button"
                aria-label={`Choose ${title}`}
                onClick={() => setTravelType(type)}
                className="group relative isolate min-h-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-left shadow-[0_3px_12px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(37,99,235,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <div className={`relative h-[94px] overflow-hidden border-b border-slate-100 ${accent === "blue" ? "bg-gradient-to-r from-blue-50 via-[#f7fbff] to-blue-100/70" : "bg-gradient-to-r from-orange-50 via-white to-blue-50"}`}>
                  <svg aria-hidden="true" viewBox="0 0 420 110" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                    <path d="M0 78 C70 60 112 94 180 70 S310 48 420 72" fill="none" stroke={accent === "blue" ? "#b8d6fa" : "#c7dffb"} strokeWidth="1.5" strokeDasharray="4 6" />
                    <circle cx="95" cy="45" r="4" fill={accent === "blue" ? "#7eaff0" : "#f6a56b"} opacity=".85" />
                    <circle cx="220" cy="68" r="3.5" fill="#9fc5fa" />
                    <circle cx="340" cy="34" r="4" fill="#9fc5fa" />
                    <g fill={accent === "blue" ? "#b9d5f4" : "#c4d9f0"} opacity=".78">
                      <path d="M250 90V52h20V35h23v55h12V63h20v27h14V45h25v45h15v14H250z" />
                      <path d="M20 92V65h20V48h22v44h12V72h18v20h10v12H20z" />
                    </g>
                    <g stroke={accent === "blue" ? "#4b8fe8" : "#e99557"} strokeWidth="2" fill="#fff">
                      <path d="M155 20c-8 0-14 6-14 14 0 10 14 25 14 25s14-15 14-25c0-8-6-14-14-14z" />
                      <circle cx="155" cy="34" r="4" fill={accent === "blue" ? "#4b8fe8" : "#e99557"} stroke="none" />
                    </g>
                    {accent === "blue" ? (
                      <g fill="#8bb8ed" opacity=".85">
                        <rect x="300" y="74" width="5" height="17" rx="1" />
                        <rect x="310" y="65" width="5" height="26" rx="1" />
                        <rect x="320" y="70" width="5" height="21" rx="1" />
                      </g>
                    ) : (
                      <g stroke="#86b7a1" strokeWidth="2" fill="none" strokeLinecap="round">
                        <path d="M365 91V58" />
                        <path d="M365 71c-18-2-22-13-21-20 13 1 22 8 21 20z" fill="#b8dfcf" />
                        <path d="M365 78c16-3 22-13 21-20-13 2-22 8-21 20z" fill="#b8dfcf" />
                      </g>
                    )}
                  </svg>
                  <div className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border bg-white/90 shadow-sm ${accent === "blue" ? "border-blue-100 text-blue-600" : "border-orange-100 text-orange-500"}`}>
                    <Icon size={21} strokeWidth={1.8} />
                  </div>
                  <span className="absolute bottom-3 right-4 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {accent === "blue" ? "Company locations" : "External destinations"}
                  </span>
                </div>
                <div className="flex min-h-[134px] flex-col p-4 sm:p-5">
                  <h3 className="mb-1.5 text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
                  <p className="text-[13px] leading-5 text-slate-500">{desc}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="text-xs text-slate-400">{detail}</span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-blue-700 transition-all group-hover:gap-2">
                      Choose
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <section className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#f2f7ff] via-white to-[#eaf3ff] px-5 py-4 sm:px-7">
          <svg aria-hidden="true" viewBox="0 0 900 150" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
            <path d="M390 25 C460 75 500 8 570 48 S690 100 790 25" fill="none" stroke="#a8c9f5" strokeWidth="2" strokeDasharray="4 7" />
            <path d="M420 130 C500 90 580 135 650 88 S770 55 900 105" fill="none" stroke="#c8def9" strokeWidth="1.5" strokeDasharray="3 7" />
            <g fill="#d8e8fb" opacity=".8"><path d="M610 130V80h22V52h24v78h15V72h22v58h17V92h26v38h16v12H610z" /><path d="M780 130V92h19V65h24v65h14v12H780z" /></g>
            <g fill="#fff" stroke="#8bb8ed" strokeWidth="2"><path d="M570 24c-8 0-14 6-14 14 0 10 14 25 14 25s14-15 14-25c0-8-6-14-14-14z" /><circle cx="570" cy="38" r="4" fill="#8bb8ed" stroke="none" /><path d="M740 50c-7 0-12 5-12 12 0 9 12 21 12 21s12-12 12-21c0-7-5-12-12-12z" /><circle cx="740" cy="62" r="3.5" fill="#8bb8ed" stroke="none" /></g>
          </svg>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setTravelType(null)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{isEditMode ? "Edit Travel Request" : "Travel Request Form"}</h1>
                {isEditMode && <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Edit size={11} /> Editing</span>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{travelType === "INTER_COMPANY" ? "Inter Company" : "Outside"} Travel <span className="mx-2 text-blue-300">·</span><span className="text-slate-500">Fill in the travel details</span></p>
            </div>
          </div>
        </section>
        {!isEditMode && (
          <QuickActions
            onNewRequest={() => setTravelType(null)}
            onMyRequests={() => navigate("/dashboard/my-requests")}
          />
        )}
        <FormSteps active={2} />
        <form onSubmit={handleSubmit} className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.055)]">
        {/* Edit mode warning */}
        {isEditMode && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
            <span className="text-amber-500 text-base leading-none mt-0.5 flex-shrink-0">
              ⚠
            </span>

            <div>
              <p className="text-xs font-semibold text-amber-800">
                You are editing a pending request
              </p>

              <p className="text-xs text-amber-600 mt-0.5">
                This request has not been reviewed yet. Once approved,
                editing will be disabled.
              </p>
            </div>
          </div>
        )}

        {/* Employee info */}
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-3 sm:mx-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Traveler</div>
            <div className="truncate text-sm font-semibold text-slate-900">{user?.name}</div>
            <div className="truncate text-xs text-slate-500">{user?.department} · {user?.email}</div>
          </div>

          <div className="flex-shrink-0">
            <GradeBadge grade={grade} />
          </div>
        </div>

        {/* Travel Details */}
        <section className="px-4 pb-5 pt-5 sm:px-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-blue-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900"><span className="mr-2 font-mono text-xs font-semibold text-blue-600">01</span>Travel Details</h3>
              <p className="mt-0.5 text-xs text-slate-500">Tell us where and when you're travelling.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                From Location <span className="text-red-500">*</span>
              </label>

              <input
                className={inputCls}
                placeholder="e.g. Mumbai HQ"
                value={form.fromLocation}
                onChange={(e) =>
                  set("fromLocation", e.target.value)
                }
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                To Location <span className="text-red-500">*</span>
              </label>

              <input
                className={inputCls}
                placeholder="e.g. Delhi Office"
                value={form.toLocation}
                onChange={(e) =>
                  set("toLocation", e.target.value)
                }
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Departure Date <span className="text-red-500">*</span>
              </label>

              <input
                className={inputCls}
                type="date"
                id="travel-from-date"
                name="fromDate"
                autoComplete="off"
                max={form.toDate || undefined}
                value={form.fromDate}
                onChange={(e) =>
                  set("fromDate", e.target.value)
                }
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Return Date <span className="text-red-500">*</span>
              </label>

              <input
                className={inputCls}
                type="date"
                id="travel-to-date"
                name="toDate"
                autoComplete="off"
                min={form.fromDate || undefined}
                value={form.toDate}
                onChange={(e) =>
                  set("toDate", e.target.value)
                }
                required
              />
            </div>
          </div>
        </section>
        <div className="mx-4 border-t border-slate-100 sm:mx-6" />
        {/* Approval Chain */}
        <section className="px-4 py-5 sm:px-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building size={14} className="text-blue-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900"><span className="mr-2 font-mono text-xs font-semibold text-blue-600">02</span>Approval Chain</h3>
              <p className="mt-0.5 text-xs text-slate-500">Your request will be routed to the appropriate approvers.</p>
            </div>
          </div>

          {/* HOD sees direct-to-director message */}
                    {isHOD ? (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>

              <div>
                <p className="text-xs font-semibold text-blue-800">
                  Your request will go directly to the Director
                </p>

                <p className="text-xs text-blue-600 mt-0.5">
                  As HOD, your request skips HOD approval automatically.
                </p>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 font-medium flex-wrap">
                  <span className="bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                    You (HOD)
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                    Director
                  </span>
                  <span>→</span>
                  <span className="bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                    Travel Manager
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Employee sees department selector */
            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  Select Your Department{" "}
                  <span className="text-red-500">*</span>
                </label>

                <select
                  className={inputCls}
                  value={selectedDept}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  required
                >
                  <option value="">
                    — Select your department —
                  </option>

                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDept && (
                <div>
                  {hodForDept ? (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md px-4 py-3">
                      <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">
                          ✓
                        </span>
                      </div>

                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-800">
                          HOD assigned for{" "}
                          <strong>{selectedDept}</strong>
                        </p>

                        <div className="mt-2 mb-2 flex items-center gap-2 bg-white border border-green-200 rounded-md px-3 py-2 w-fit">
                          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {hodForDept.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-gray-800">
                              {hodForDept.name}
                            </div>

                            {hodForDept.email && (
                              <div className="text-xs text-gray-400">
                                {hodForDept.email}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-green-600 mt-0.5">
                          Your request will be routed to this HOD automatically.
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 font-medium flex-wrap">
                          <span className="bg-green-100 border border-green-300 px-2 py-0.5 rounded">
                            You
                          </span>
                          <span>→</span>
                          <span className="bg-green-100 border border-green-300 px-2 py-0.5 rounded font-bold">
                            {hodForDept.name} (HOD)
                          </span>
                          <span>→</span>
                          <span className="bg-green-100 border border-green-300 px-2 py-0.5 rounded">
                            Director
                          </span>
                          <span>→</span>
                          <span className="bg-green-100 border border-green-300 px-2 py-0.5 rounded">
                            Travel Manager
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                      <span className="text-amber-500 text-base leading-none mt-0.5 flex-shrink-0">
                        ⚠
                      </span>

                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          No HOD assigned for{" "}
                          <strong>{selectedDept}</strong>
                        </p>

                        <p className="text-xs text-amber-600 mt-0.5">
                          Contact your administrator to assign an HOD.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
        <div className="mx-4 border-t border-slate-100 sm:mx-6" />
        {/* Purpose & Notes */}
        <section className="px-4 py-5 sm:px-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
              <FileText size={14} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                <span className="mr-2 font-mono text-xs font-semibold text-blue-600">03</span>
                Purpose & Notes
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Provide the business purpose and any additional information.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label className={labelCls}>
                Purpose of Visit{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`${inputCls} h-24 resize-none`}
                placeholder="Describe the business purpose of this travel…"
                value={form.purposeOfVisit}
                onChange={(e) => set("purposeOfVisit", e.target.value)}
                required
              />
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.accommodation}
                  onChange={(e) => set("accommodation", e.target.checked)}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                <span className="text-sm text-slate-600">Accommodation required</span>
              </label>
            </div>

            <div className="min-w-0">
              <label className={labelCls}>Additional Notes (Optional)</label>
              <textarea
                className={`${inputCls} h-24 resize-none`}
                placeholder="Any other relevant information…"
                value={form.additionalNotes}
                onChange={(e) => set("additionalNotes", e.target.value)}
              />
            </div>
          </div>
        </section>

{/* Submit */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs text-gray-400">
            Fields marked with{" "}
            <span className="text-red-500">*</span> are required.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  isEditMode
                    ? "/dashboard/my-requests"
                    : "/dashboard"
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || (!isHOD && !hodForDept)}
              aria-busy={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={13} />

              {loading
                ? "Saving…"
                : isEditMode
                  ? "Save Changes"
                  : "Submit Request"}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}