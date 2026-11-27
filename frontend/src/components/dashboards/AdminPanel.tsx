import { useEffect, useState, ReactNode } from "react";
import {
  Users, Search, Trash2, Edit3, ChevronDown, CheckCircle,
  XCircle, Clock, BarChart3, UserCheck, RefreshCw, X, Activity,
  UserPlus, Bell, MapPin, Plane, FileSpreadsheet, FileText,
} from "lucide-react";
import api from "../../lib/api";
import { User, Role, AdminStats, TravelRequest, RequestStatus } from "../../types";
import { RoleBadge, StatusBadge } from "../ui/Badges";
import { format } from "date-fns";
import toast from "react-hot-toast";

type Tab = "overview" | "users" | "requests" | "pending-users";
type UserTab = "EMPLOYEE" | "HOD" | "TRAVEL_MANAGER" | "ALL";
type EditField = "role" | "department" | "grade" | "plant";

const ALL_ROLES: Role[] = [
  "EMPLOYEE", "HOD", "DIRECTOR", "TRAVEL_MANAGER", "ADMIN"
];

const ROLE_COLORS: Record<Role, string> = {
  EMPLOYEE: "#6B96E8",
  HOD: "#a05bf0",
  DIRECTOR: "#1fbf9f",
  TRAVEL_MANAGER: "#f7a13c",
  ADMIN: "#f0507a",
};

function RoleDonut({
  segments,
  total,
}: {
  segments: { role: Role; count: number; pct: number }[];
  total: number;
}) {
  const size = 160, stroke = 20, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        {segments.map(({ role, pct }) => {
          const dash = (pct / 100) * c;
          const el = (
            <circle
              key={role}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ROLE_COLORS[role]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-cumulative}
              strokeLinecap="butt"
            />
          );
          cumulative += dash;
          return el;
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {total}
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          Total Users
        </span>
      </div>
    </div>
  );
}

// Sparkline driven by real monthly counts from the backend (last 6 months).
function Sparkline({
  color,
  data,
  height = 34,
}: {
  color: string;
  data: number[];
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const step = 100 / (data.length - 1 || 1);
  const top = 4, bottom = height - 4;

  const points = data
    .map((v, i) => `${i * step},${bottom - (v / max) * (bottom - top)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  maxW = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxW} rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmingLabel,
  confirming,
  icon,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  confirmingLabel: string;
  confirming: boolean;
  icon: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onCancel} maxW="max-w-sm">
      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-md mb-4">
        <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">{message}</p>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8BEA] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {icon}
          {confirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function Pager({
  page,
  pageCount,
  total,
  perPage,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  if (total <= perPage) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Prev
        </button>

        {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-7 h-7 text-xs font-semibold rounded-md transition ${
              p === page
                ? "bg-[#4F83F1] text-white"
                : "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "Employee",
  HOD: "Head of Department",
  DIRECTOR: "Director",
  TRAVEL_MANAGER: "Travel Manager",
  ADMIN: "Admin",
};

const DEPARTMENTS = [
  "Business Strategy", "Maintenance", "Vendor Relations", "Customer Relations",
  "I.T ERP", "Skids & Pilot Plant", "Operations", "Design & Engineering",
  "Quality", "Bending", "Employee Relations", "I.T.", "Projects",
  "HR & Admin", "Finance", "CMD's Office",
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
const PLANTS = ["Palwal Plant", "Assam Plant", "Anjar Plant", "Chennai Plant"];

function GradeBadge({ grade }: { grade?: number }) {
  if (!grade) return <span className="text-xs text-gray-400">—</span>;

  const cls =
    grade >= 7 ? "bg-purple-100 text-purple-700" :
    grade >= 5 ? "bg-[#E7EFFD] text-[#3F73DF]" :
    grade >= 3 ? "bg-green-100 text-green-700" :
    "bg-gray-100 text-gray-600";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cls}`}>
      G{grade}
    </span>
  );
}

function PlantBadge({ plant }: { plant?: string | null }) {
  if (!plant) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const cls =
    plant === "Assam Plant"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : plant === "Anjar Plant"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : plant === "Chennai Plant"
          ? "bg-purple-100 text-purple-700 border-purple-200"
          : "bg-[#E7EFFD] text-[#3F73DF] border-[#DCE7F8]";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${cls}`}
    >
      <MapPin size={10} /> {plant}
    </span>
  );
}
export default function AdminPanel({
  defaultTab,
}: {
  defaultTab?: "overview" | "users" | "requests";
}) {
  const [tab, setTab] = useState<Tab>(defaultTab ?? "overview");
  const [userTab, setUserTab] = useState<UserTab>("EMPLOYEE");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [editModal, setEditModal] = useState<{
    user: User;
    field: EditField;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const ROWS_PER_PAGE = 6;

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    setUserPage(1);
  }, [userTab, search]);

  useEffect(() => {
    setRequestPage(1);
  }, [statusFilter]);

  const fetchStats = () =>
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {});

  const fetchUsers = () =>
    api.get("/admin/users", {
      params: {
        search: search || undefined,
        role: userTab !== "ALL" ? userTab : undefined,
      },
    }).then(r => setUsers(r.data)).catch(() => {});

  const fetchPendingUsers = () =>
    api.get("/admin/pending-users")
      .then(r => setPendingUsers(r.data))
      .catch(() => {});

  const fetchRequests = () =>
    api.get("/admin/requests", {
      params: {
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      },
    }).then(r => setRequests(r.data)).catch(() => {});

  useEffect(() => {
    fetchStats();
    fetchPendingUsers();
  }, []);

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab, search, userTab]);

  useEffect(() => {
    if (tab === "requests") fetchRequests();
  }, [tab, statusFilter]);

  useEffect(() => {
    if (tab === "pending-users") fetchPendingUsers();
  }, [tab]);

  const handleApproveUser = async (userId: string) => {
    setApproving(userId);

    try {
      await api.patch(`/admin/users/${userId}/approve`);
      toast.success("User approved — they can now log in");
      fetchPendingUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Approval failed");
    } finally {
      setApproving(null);
    }
  };

  const handleRejectUser = async () => {
    if (!rejectConfirm) return;

    setRejecting(rejectConfirm.id);

    try {
      await api.delete(`/admin/users/${rejectConfirm.id}/reject`);
      toast.success("User request rejected and removed");
      setRejectConfirm(null);
      fetchPendingUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Rejection failed");
    } finally {
      setRejecting(null);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;

    setLoading(true);

    try {
      if (editModal.field === "role") {
        await api.patch(`/admin/users/${editModal.user.id}/role`, {
          role: editValue,
        });
      } else if (editModal.field === "department") {
        await api.patch(`/admin/users/${editModal.user.id}/department`, {
          department: editValue,
        });
      } else if (editModal.field === "grade") {
        await api.patch(`/admin/users/${editModal.user.id}/grade`, {
          grade: editValue,
        });
      } else if (editModal.field === "plant") {
        await api.patch(`/admin/users/${editModal.user.id}/plant`, {
          plant: editValue,
        });
      }

      toast.success(
        editModal.field === "role"
          ? `Role updated to ${ROLE_LABELS[editValue as Role]}`
          : editModal.field === "department"
            ? "Department updated"
            : editModal.field === "plant"
              ? `Plant updated to ${editValue}`
              : `Grade updated to G${editValue}`
      );

      setEditModal(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);

    try {
      await api.delete(`/admin/users/${deleteConfirm.id}`);
      toast.success("User deleted");
      setDeleteConfirm(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const handleExport = async (fileFormat: "xlsx" | "pdf") => {
    setExporting(fileFormat);
        try {
      const res = await api.get("/admin/requests/export", {
        params: {
          format: fileFormat,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        },
        responseType: "blob",
      });

      const stamp = format(new Date(), "yyyy-MM-dd");
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `travel-requests-${stamp}.${fileFormat}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchStats(),
      fetchUsers(),
      fetchRequests(),
      fetchPendingUsers(),
    ]);
    setRefreshing(false);
  };

  const roleCount = (role: Role) =>
    stats?.usersByRole.find(r => r.role === role)?.count || 0;

  const userPageCount = Math.max(1, Math.ceil(users.length / ROWS_PER_PAGE));
  const pagedUsers = users.slice(
    (userPage - 1) * ROWS_PER_PAGE,
    userPage * ROWS_PER_PAGE
  );

  const pendingPageCount = Math.max(
    1,
    Math.ceil(pendingUsers.length / ROWS_PER_PAGE)
  );
  const pagedPendingUsers = pendingUsers.slice(
    (pendingPage - 1) * ROWS_PER_PAGE,
    pendingPage * ROWS_PER_PAGE
  );

  const requestPageCount = Math.max(
    1,
    Math.ceil(requests.length / ROWS_PER_PAGE)
  );
  const pagedRequests = requests.slice(
    (requestPage - 1) * ROWS_PER_PAGE,
    requestPage * ROWS_PER_PAGE
  );

  const thCls =
    "text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700";

  const tdCls =
    "px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800";

  const userTabConfig: { key: UserTab; label: string }[] = [
    { key: "EMPLOYEE", label: "Employees" },
    { key: "HOD", label: "HODs" },
    { key: "TRAVEL_MANAGER", label: "Travel Managers" },
    { key: "ALL", label: "All Users" },
  ];

  const modalTitle =
    editModal?.field === "role" ? "Change Role" :
    editModal?.field === "department" ? "Change Department" :
    editModal?.field === "plant" ? "Change Plant" :
    "Change Grade";

  return (
    <div className="space-y-6">
      {/* Tabs + Refresh (same row) */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 flex-wrap gap-2">
        <div className="flex flex-wrap">
          {([
            ["overview", "Overview", BarChart3],
            ["users", "Manage Users", Users],
            ["requests", "All Requests", Activity],
            ["pending-users", "User Requests", UserPlus],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === key
                  ? "border-[#4F83F1] text-[#4F83F1]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <Icon size={14} />
              {label}
              {key === "pending-users" && pendingUsers.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-2">
          {pendingUsers.length > 0 && (
            <button
              onClick={() => setTab("pending-users")}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-md transition"
            >
              <Bell size={13} className="animate-pulse" />
              {pendingUsers.length} Pending
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

          {/* OVERVIEW */}
      {tab === "overview" && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: "Total Users",
                value: stats.totalUsers,
                icon: Users,
                iconBg: "bg-[#F0F5FF]",
                accent: "#2563eb",
                footer: `${stats.usersGrowthPct >= 0 ? "+" : ""}${stats.usersGrowthPct}% vs last month`,
                action: () => setTab("users"),
              },
              {
                label: "Total Requests",
                value: stats.totalRequests,
                icon: Plane,
                iconBg: "bg-violet-50",
                accent: "#7c3aed",
                footer: "All travel requests",
                action: () => {
                  setStatusFilter("ALL");
                  setTab("requests");
                },
              },
              {
                label: "Pending",
                value: stats.pendingRequests,
                icon: Clock,
                iconBg: "bg-amber-50",
                accent: "#d97706",
                footer: "Requires action",
                action: () => {
                  setStatusFilter("PENDING_HOD");
                  setTab("requests");
                },
              },
              {
                label: "Approved",
                value: stats.approvedRequests,
                icon: CheckCircle,
                iconBg: "bg-emerald-50",
                accent: "#059669",
                footer: "Successfully processed",
                action: () => {
                  setStatusFilter("APPROVED");
                  setTab("requests");
                },
              },
              {
                label: "Rejected",
                value: stats.rejectedRequests,
                icon: XCircle,
                iconBg: "bg-rose-50",
                accent: "#e11d48",
                footer: "Closed requests",
                action: () => {
                  setStatusFilter("REJECTED");
                  setTab("requests");
                },
              },
            ].map(
              ({
                label,
                value,
                icon: Icon,
                iconBg,
                accent,
                footer,
                action,
              }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="group min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#5B8BEA]/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                  aria-label={`Open ${label}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {label}
                      </p>
                      <p className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {value}
                      </p>
                    </div>

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/5 ${iconBg}`}
                    >
                      <Icon size={15} style={{ color: accent }} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {footer}
                    </p>
                  </div>
                </button>
              ),
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            Live statistics from users and travel requests.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* USER DISTRIBUTION BY ROLE — RIGHT SIDE */}
            <div className="lg:order-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  User Distribution by Role
                </h3>
                <span className="text-xs font-medium text-[#4F83F1] bg-[#F0F5FF] px-2.5 py-1 rounded-full">
                  Total Users: {stats.totalUsers}
                </span>
              </div>

              <div className="flex items-center gap-6 xl:gap-8 flex-wrap">
                <RoleDonut
                  total={stats.totalUsers}
                  segments={ALL_ROLES.map(role => {
                    const count = roleCount(role);
                    const pct = stats.totalUsers
                      ? (count / stats.totalUsers) * 100
                      : 0;
                    return { role, count, pct };
                  })}
                />

                <div className="flex-1 min-w-[220px]">
                  <div className="grid grid-cols-[minmax(0,1fr)_42px_82px] text-[10px] text-gray-400 font-medium uppercase tracking-wide pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span>Role</span>
                    <span>Count</span>
                    <span>Percentage</span>
                  </div>

                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {ALL_ROLES.map(role => {
                      const count = roleCount(role);
                      const pct = stats.totalUsers
                        ? Math.round((count / stats.totalUsers) * 100)
                        : 0;

                      return (
                        <div
                          key={role}
                          className="grid grid-cols-[minmax(0,1fr)_42px_82px] items-center py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: ROLE_COLORS[role] }}
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                              {ROLE_LABELS[role]}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                            {count}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400 w-7">
                              {pct}%
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: ROLE_COLORS[role],
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PENDING USER REQUESTS — LEFT SIDE */}
            <div className="lg:order-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Pending User Requests
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    New signups awaiting admin approval
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("pending-users")}
                  className="shrink-0 text-xs font-semibold text-[#4F83F1] hover:text-[#3F73DF] dark:text-[#729CEB]"
                >
                  View All <span aria-hidden="true">→</span>
                </button>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400">
                  <CheckCircle size={28} strokeWidth={1.5} />
                  <p className="text-sm mt-2">No pending user requests</p>
                  <p className="text-xs mt-1">New signups will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[...pendingUsers]
                    .sort((a, b) =>
                      new Date(b.createdAt || 0).getTime() -
                      new Date(a.createdAt || 0).getTime()
                    )
                    .slice(0, 5)
                    .map(user => (
                      <div key={user.id} className="py-3 first:pt-1 last:pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 shrink-0 rounded-full bg-[#F0F5FF] dark:bg-blue-900/30 text-[#4F83F1] flex items-center justify-center text-xs font-semibold">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {user.department || "No department"} · {user.plant || "No plant"}
                              </p>
                              <div className="mt-1">
                                <RoleBadge role={user.role} />
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            Awaiting approval
                          </span>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleApproveUser(user.id)}
                            disabled={approving === user.id}
                            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            {approving === user.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectConfirm(user)}
                            disabled={rejecting === user.id}
                            className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-md disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "overview" && !stats && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#4F83F1] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading stats…</p>
          </div>
        </div>
      )}

      {/* PENDING USERS */}
      {tab === "pending-users" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              New User Requests
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? "s" : ""} waiting for account approval
            </p>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <UserPlus size={32} strokeWidth={1} />
              <p className="text-sm">No pending user requests</p>
              <p className="text-xs text-gray-300">
                New signups will appear here for approval
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {[
                      "User", "Department", "Plant", "Role",
                      "Grade", "Requested", "Actions",
                    ].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedPendingUsers.map(u => (
                    <tr
                      key={u.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-200 rounded-md flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="text-gray-600 text-sm">{u.department}</span>
                      </td>
                      <td className={tdCls}><PlantBadge plant={u.plant} /></td>
                      <td className={tdCls}><RoleBadge role={u.role} /></td>
                      <td className={tdCls}><GradeBadge grade={u.grade} /></td>
                      <td className={`${tdCls} text-xs text-gray-400`}>
                        {u.createdAt
                          ? format(new Date(u.createdAt), "dd MMM yyyy, hh:mm a")
                          : "—"}
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveUser(u.id)}
                            disabled={approving === u.id}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8BEA] focus-visible:ring-offset-2 disabled:opacity-50"
                          >
                            <CheckCircle size={12} />
                            {approving === u.id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            onClick={() => setRejectConfirm(u)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-md transition"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            page={pendingPage}
            pageCount={pendingPageCount}
            total={pendingUsers.length}
            perPage={ROWS_PER_PAGE}
            onChange={setPendingPage}
          />
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {userTabConfig.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setUserTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold border transition ${
                  userTab === key
                    ? "bg-[#4F83F1] text-white border-[#4F83F1]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#AFC8F0] hover:text-[#4F83F1]"
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  userTab === key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {key === "ALL"
                    ? stats?.totalUsers ?? 0
                    : key === "EMPLOYEE"
                      ? stats?.usersByRole.find(r => r.role === "EMPLOYEE")?.count ?? 0
                      : key === "HOD"
                        ? stats?.usersByRole.find(r => r.role === "HOD")?.count ?? 0
                        : stats?.usersByRole.find(r => r.role === "TRAVEL_MANAGER")?.count ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#5B8BEA] focus:ring-2 focus:ring-[#E7EFFD] transition"
              placeholder="Search by name, email or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {users.length} {
                  userTab === "ALL" ? "user" :
                  userTab === "HOD" ? "HOD" :
                  userTab === "TRAVEL_MANAGER" ? "Travel Manager" :
                  "Employee"
                }{users.length !== 1 ? "s" : ""}
              </span>
            </div>

            {users.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-gray-400">
                <Users size={32} strokeWidth={1} />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thCls}>User</th>
                      <th className={thCls}>Department</th>
                      <th className={thCls}>Plant</th>
                      <th className={thCls}>Grade</th>
                      <th className={thCls}>Role</th>
                      <th className={thCls}>Requests</th>
                      <th className={thCls}>Joined</th>
                      <th className={thCls}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map(u => (
                      <tr
                        key={u.id}
                        className="group transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      >
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#4F83F1] rounded-md flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                                {u.name}
                              </div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-600 text-sm">{u.department}</span>
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "department" });
                                setEditValue(u.department);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4F83F1] transition p-0.5 rounded"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1.5">
                            <PlantBadge plant={u.plant} />
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "plant" });
                                setEditValue(u.plant || "Palwal Plant");
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4F83F1] transition p-0.5 rounded"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1.5">
                            <GradeBadge grade={u.grade} />
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "grade" });
                                setEditValue(String(u.grade ?? 1));
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4F83F1] transition p-0.5 rounded"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-1.5">
                            <RoleBadge role={u.role} />
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "role" });
                                setEditValue(u.role);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#4F83F1] transition p-0.5 rounded"
                            >
                              <ChevronDown size={11} />
                            </button>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded">
                            {u._count?.travelRequests ?? 0}
                          </span>
                        </td>
                        <td className={`${tdCls} text-xs text-gray-400`}>
                          {u.createdAt
                            ? format(new Date(u.createdAt), "dd MMM yyyy")
                            : "—"}
                        </td>
                        <td className={tdCls}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "role" });
                                setEditValue(u.role);
                              }}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#4F83F1] bg-[#F0F5FF] hover:bg-[#E7EFFD] border border-[#DCE7F8] px-3 py-1.5 rounded-md transition"
                            >
                              <UserCheck size={11} /> Role
                            </button>
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "plant" });
                                setEditValue(u.plant || "Palwal Plant");
                              }}
                              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-md transition"
                            >
                              <MapPin size={11} /> Plant
                                                          </button>
                            <button
                              onClick={() => {
                                setEditModal({ user: u, field: "grade" });
                                setEditValue(String(u.grade ?? 1));
                              }}
                              className="flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-md transition"
                            >
                              <Edit3 size={11} /> Grade
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u)}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-md transition"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pager
              page={userPage}
              pageCount={userPageCount}
              total={users.length}
              perPage={ROWS_PER_PAGE}
              onChange={setUserPage}
            />
          </div>
        </div>
      )}

      {/* ALL TRAVEL REQUESTS */}
      {tab === "requests" && (
        <div className="space-y-5">
          {/* Page heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#4F83F1] dark:bg-blue-900/30 dark:text-[#729CEB]">
                  <Activity size={17} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    All Travel Requests
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Monitor and manage employee travel requests
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#F0F5FF] px-3 py-1.5 text-xs font-semibold text-[#3F73DF] dark:bg-blue-900/30 dark:text-[#AFC8F0]">
                {requests.length} {requests.length === 1 ? "Request" : "Requests"}
              </span>
            </div>
          </div>

          {/* Filters and exports */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Filter by status
              </label>
              <select
                className="min-w-[170px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5B8BEA] focus:ring-2 focus:ring-[#E7EFFD] dark:focus:ring-blue-900/40 transition text-gray-600 dark:text-gray-300"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as RequestStatus | "ALL")}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_HOD">Pending HOD</option>
                <option value="PENDING_DIRECTOR">Pending Director</option>
                <option value="PENDING_TRAVEL_MANAGER">With Travel Manager</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("xlsx")}
                disabled={exporting !== null || requests.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
              >
                <FileSpreadsheet size={14} />
                {exporting === "xlsx" ? "Exporting..." : "Export Excel"}
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null || requests.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40"
              >
                <FileText size={14} />
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>

          {/* Requests table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Request Register
                </h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {requests.length} {requests.length === 1 ? "record" : "records"} found
                </p>
              </div>
              {statusFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className="self-start rounded-md px-2.5 py-1.5 text-xs font-medium text-[#4F83F1] transition hover:bg-[#F0F5FF] dark:text-[#729CEB] dark:hover:bg-blue-900/20"
                >
                  Clear filter
                </button>
              )}
            </div>

            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                  <Activity size={22} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  No travel requests found
                </p>
                <p className="text-xs text-gray-400">
                  Try changing the status filter or refresh the page
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr>
                      {["Employee", "Grade", "Route", "Type", "Travel Dates", "HOD", "Status", "Submitted"].map(label => (
                        <th
                          key={label}
                          className="whitespace-nowrap border-b border-gray-100 bg-gray-50/80 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-500"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pagedRequests.map(r => (
                      <tr
                        key={r.id}
                        className="transition-colors hover:bg-[#F0F5FF]/30 dark:hover:bg-gray-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                            {r.employee?.name || r.employeeName}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-400">
                            {r.department || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <GradeBadge grade={r.employee?.grade} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{r.fromLocation}</span>
                            <span className="text-gray-300 dark:text-gray-600">→</span>
                            <span className="font-medium text-gray-700 dark:text-gray-200">{r.toLocation}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {r.travelType === "INTER_COMPANY" ? "Inter Company" : "Outside"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600 dark:text-gray-300">
                          {format(new Date(r.fromDate), "dd MMM")} – {format(new Date(r.toDate), "dd MMM yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {r.hod?.name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(r.createdAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pager
              page={requestPage}
              pageCount={requestPageCount}
              total={requests.length}
              perPage={ROWS_PER_PAGE}
              onChange={setRequestPage}
            />
          </div>
        </div>
      )}
            {/* Edit Modal */}
      {editModal && (
        <ModalShell
          title={modalTitle}
          onClose={() => setEditModal(null)}
        >
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5">
            <div className="w-9 h-9 bg-[#4F83F1] rounded-md flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {editModal.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {editModal.user.name}
              </div>
              <div className="text-xs text-gray-400">
                {editModal.user.email}
              </div>
            </div>
            <PlantBadge plant={editModal.user.plant} />
          </div>

          {editModal.field === "role" && (
            <div className="space-y-2 mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Select New Role
              </label>
              {ALL_ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setEditValue(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md border transition text-left ${
                    editValue === r
                      ? "border-[#5B8BEA] bg-[#F0F5FF]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <RoleBadge role={r} />
                  <span className="flex-1 text-sm text-gray-600">
                    {ROLE_LABELS[r]}
                  </span>
                  {editValue === r && (
                    <CheckCircle size={14} className="text-[#5B8BEA] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {editModal.field === "department" && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Select Department
              </label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#5B8BEA] focus:ring-2 focus:ring-[#E7EFFD] transition"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {editModal.field === "plant" && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Select Plant
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PLANTS.map(p => {
                  const cls =
                    p === "Assam Plant" ? "border-emerald-500 bg-emerald-50" :
                    p === "Anjar Plant" ? "border-orange-500 bg-orange-50" :
                    "border-[#5B8BEA] bg-[#F0F5FF]";

                  return (
                    <button
                      key={p}
                      onClick={() => setEditValue(p)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md border-2 transition text-left ${
                        editValue === p
                          ? cls
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <MapPin
                        size={14}
                        className={
                          editValue === p
                            ? p === "Assam Plant"
                              ? "text-emerald-600"
                              : p === "Anjar Plant"
                                ? "text-orange-600"
                                : "text-[#4F83F1]"
                            : "text-gray-400"
                        }
                      />
                      <span className="flex-1 text-sm font-medium text-gray-700">
                        {p}
                      </span>
                      {editValue === p && (
                        <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              {editValue && (
                <p className="text-xs text-[#4F83F1] font-medium mt-2">
                  ✓ {editValue} selected
                </p>
              )}
            </div>
          )}

          {editModal.field === "grade" && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Select Grade{" "}
                <span className="text-gray-400 font-normal normal-case">
                  (1 = Junior · 8 = Senior)
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(g => (
                  <button
                    key={g}
                    onClick={() => setEditValue(String(g))}
                    className={`py-3 rounded-md text-sm font-bold border-2 transition ${
                      editValue === String(g)
                        ? "border-[#5B8BEA] bg-[#4F83F1] text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-[#AFC8F0] hover:text-[#4F83F1]"
                    }`}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
              {editValue && (
                <p className="text-xs text-[#4F83F1] font-medium mt-2">
                  ✓ Grade {editValue} selected
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => setEditModal(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4F83F1] hover:bg-[#3F73DF] rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8BEA] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </ModalShell>
      )}
            {/* Reject User Confirm Modal */}
      {rejectConfirm && (
        <ConfirmModal
          title="Reject User Request"
          message={
            <>
              Rejecting{" "}
              <span className="font-semibold">{rejectConfirm.name}</span>
              's account request will permanently remove their registration.
            </>
          }
          confirmLabel="Reject User"
          confirmingLabel="Rejecting…"
          confirming={rejecting === rejectConfirm.id}
          icon={<XCircle size={13} />}
          onCancel={() => setRejectConfirm(null)}
          onConfirm={handleRejectUser}
        />
      )}

      {/* Delete User Modal */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete User"
          message={
            <>
              You are about to permanently delete{" "}
              <span className="font-semibold">{deleteConfirm.name}</span>.
              This cannot be undone.
            </>
          }
          confirmLabel="Delete User"
          confirmingLabel="Deleting…"
          confirming={loading}
          icon={<Trash2 size={13} />}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}