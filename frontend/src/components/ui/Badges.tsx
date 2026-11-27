
import { RequestStatus, Role } from "../../types";
import {
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  User,
  Shield,
  Building,
  Star,
  Wrench,
} from "lucide-react";

type BadgeConfig = {
  label: string;
  cls: string;
  icon: typeof Clock;
};

export function StatusBadge({
  status,
}: {
  status: RequestStatus;
}) {
  const config: Record<RequestStatus, BadgeConfig> = {
    PENDING_HOD: {
      label: "Pending HOD",
      cls: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70",
      icon: Clock,
    },
    PENDING_DIRECTOR: {
      label: "Pending Director",
      cls: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/70",
      icon: Clock,
    },
    PENDING_TRAVEL_MANAGER: {
      label: "With Travel Mgr",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: Briefcase,
    },
    APPROVED: {
      label: "Approved",
      cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70",
      icon: CheckCircle,
    },
    REJECTED: {
      label: "Rejected",
      cls: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70",
      icon: XCircle,
    },
  };

  if (!status || !config[status]) return null;

  const { label, cls, icon: Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap ${cls}`}
    >
      <Icon size={12} strokeWidth={1.8} />
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const config: Record<Role, BadgeConfig> = {
    EMPLOYEE: {
      label: "Employee",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: User,
    },
    HOD: {
      label: "HOD",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: Building,
    },
    DIRECTOR: {
      label: "Director",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: Shield,
    },
    TRAVEL_MANAGER: {
      label: "Travel Manager",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: Wrench,
    },
    ADMIN: {
      label: "Admin",
      cls: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      icon: Star,
    },
  };

  if (!role || !config[role]) return null;

  const { label, cls, icon: Icon } = config[role];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap ${cls}`}
    >
      <Icon size={12} strokeWidth={1.8} />
      {label}
    </span>
  );
}
