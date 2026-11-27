import { useState } from "react";
import {
  Mail, Building, Shield, MapPin, BadgeCheck, Lock, Eye, EyeOff,
  Save, CheckCircle2, UserRound,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { RoleBadge } from "../ui/Badges";
import api from "../../lib/api";
import toast from "react-hot-toast";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Employee",
  HOD: "Head of Department",
  DIRECTOR: "Director",
  TRAVEL_MANAGER: "Travel Manager",
  ADMIN: "Administrator",
};

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return null;
  const color = grade >= 7
    ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300"
    : grade >= 5
      ? "border-[#DCE7F8] bg-[#F0F5FF] text-[#4F83F1] dark:border-[#294A78] dark:bg-[#172B4D] dark:text-[#B8CCF0]"
      : grade >= 3
        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${color}`}>
      <BadgeCheck size={15} /> Grade {grade}
    </span>
  );
}

function PlantBadge({ plant }: { plant?: string }) {
  if (!plant) return null;
  return (
    <span className="flex items-center gap-2 rounded-lg border border-[#DCE7F8] bg-[#F0F5FF]/70 px-3 py-2 text-xs font-medium text-[#4F83F1] dark:border-[#294A78] dark:bg-[#172B4D]/40 dark:text-[#B8CCF0]">
      <MapPin size={15} /> {plant}
    </span>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [visibility, setVisibility] = useState({ current: false, newPass: false, confirm: false });
  const [changingPass, setChangingPass] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);

  const handlePasswordChange = async () => {
    const { current, newPass, confirm } = passwordForm;
    if (!current || !newPass || !confirm) return toast.error("All fields are required");
    if (newPass !== confirm) return toast.error("New passwords do not match");
    if (newPass.length < 6) return toast.error("Password must be at least 6 characters");

    setChangingPass(true);
    try {
      await api.patch("/auth/change-password", { currentPassword: current, newPassword: newPass });
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
      setShowPassForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  const infoItems = [
    { icon: Mail, label: "Email", value: user?.email || "Not available" },
    ...(user?.role !== "DIRECTOR" ? [{ icon: Building, label: "Department", value: user?.department || "Not assigned" }] : []),
    { icon: Shield, label: "Role", value: ROLE_LABELS[user?.role || ""] || "Employee" },
    { icon: MapPin, label: "Plant", value: user?.plant || "Not assigned" },
  ];

  const fields = [
    { key: "current" as const, label: "Current Password", placeholder: "Enter current password" },
    { key: "newPass" as const, label: "New Password", placeholder: "Enter new password" },
    { key: "confirm" as const, label: "Confirm New Password", placeholder: "Repeat new password" },
  ];

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4F83F1] focus:ring-2 focus:ring-[#DCE7F8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-[#172B4D]";

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4F83F1]">Account</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account information and security settings.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={14} /> Account active
        </span>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F83F1] to-[#4F83F1]" />
          <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4F83F1] to-[#4F83F1] text-4xl font-bold text-white shadow-lg shadow-blue-200/60 ring-4 ring-[#F0F5FF] dark:ring-[#172B4D]">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{user?.name || "User"}</h2>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
          </span>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {ROLE_LABELS[user?.role || ""] || "Employee"}{user?.role !== "DIRECTOR" && user?.department ? ` · ${user.department}` : ""}
          </p>
          <div className="mt-6 w-full space-y-2 border-t border-slate-100 pt-5 text-left dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
              <UserRound size={15} className="text-[#4F83F1]" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{ROLE_LABELS[user?.role || ""] || "Employee"}</span>
            </div>
            {user?.grade ? <GradeBadge grade={user.grade} /> : null}
            {user?.plant ? <PlantBadge plant={user.plant} /> : null}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#4F83F1] dark:bg-[#172B4D]/60 dark:text-[#B8CCF0]"><UserRound size={17} /></span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Account Information</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your registered employee details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {infoItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 transition hover:border-[#DCE7F8] hover:bg-[#F0F5FF]/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-[#294A78] dark:hover:bg-[#172B4D]/30">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white text-[#4F83F1] shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-[#B8CCF0]"><Icon size={17} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE7F8] bg-[#F0F5FF] text-[#4F83F1] dark:border-[#294A78] dark:bg-[#172B4D]/60 dark:text-[#B8CCF0]"><Lock size={17} /></span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Security</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Keep your account secure by updating your password.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowPassForm((v) => !v)} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${showPassForm ? "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-[#4F83F1] text-white shadow-sm hover:bg-[#3F73DF]"}`}>
                {showPassForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {!showPassForm ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300"><CheckCircle2 size={17} /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password protected</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your password is securely stored and can be changed anytime.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {fields.map(({ key, label, placeholder }) => (
                    <div key={key} className={key === "current" ? "md:col-span-2" : ""}>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
                      <div className="relative">
                        <input type={visibility[key] ? "text" : "password"} className={inputClass} placeholder={placeholder} value={passwordForm[key]} onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))} />
                        <button type="button" onClick={() => setVisibility((v) => ({ ...v, [key]: !v[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={visibility[key] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
                          {visibility[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Password must contain at least 6 characters.</p>
                  <button type="button" onClick={handlePasswordChange} disabled={changingPass} className="inline-flex items-center gap-2 rounded-lg bg-[#4F83F1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3F73DF] disabled:cursor-not-allowed disabled:opacity-50">
                    <Save size={14} /> {changingPass ? "Saving…" : "Save Password"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
