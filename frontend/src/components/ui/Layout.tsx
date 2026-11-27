import { ReactNode, useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import {

  LayoutDashboard, PlusCircle, ClipboardList, LogOut,

  User, CheckSquare, Briefcase, Users, BarChart3, MapPin, Shield, Sun, Moon, Menu, X as CloseIcon, History,

} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";

import { useTheme } from "../../hooks/useTheme";

import { RoleBadge } from "./Badges";

import companyLogo from "../../assets/DEEclean.png";





function PlantBadge({ plant }: { plant?: string }) {

  if (!plant) return null;

  const cls =
    plant === "Assam Plant" ? "bg-emerald-500/20 text-emerald-300" :
    plant === "Anjar Plant" ? "bg-orange-500/20 text-orange-300" :
    plant === "Chennai Plant" ? "bg-purple-500/20 text-purple-300" :
    "bg-[#6B96E8]/20 text-[#9BB8ED]";

  return (

    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>

      <MapPin size={9} /> {plant}

    </span>

  );

}



export default function Layout({ children }: { children: ReactNode }) {

  const { user, logout } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();

  const loc = useLocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [sidebarOpen, setSidebarOpen] = useState(false);



  // Close the mobile drawer automatically whenever the route changes.

  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);



  useEffect(() => {

    const goOnline = () => setIsOnline(true);

    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);

    window.addEventListener("offline", goOffline);

    return () => {

      window.removeEventListener("online", goOnline);

      window.removeEventListener("offline", goOffline);

    };

  }, []);



  const handleLogout = () => {

    logout();

    navigate("/login");

  };



  const navItems = getNavItems(user?.role || "EMPLOYEE");



  // Admin's Overview/Manage Users/All Requests pages show the "Admin Panel"

  // block up in the top header instead of the plain page title.

  const isAdminPanelPage =

    user?.role === "ADMIN" &&

    ["/dashboard", "/dashboard/users", "/dashboard/all-requests"].includes(loc.pathname);



  const isDashboardBannerHome =
    ["EMPLOYEE", "DIRECTOR"].includes(String(user?.role || "").toUpperCase()) &&
    loc.pathname === "/dashboard";

  return (

    <div className="flex h-screen bg-slate-50 dark:bg-gray-950 overflow-hidden relative">



      {/* Mobile backdrop — closes the drawer on tap */}

      {sidebarOpen && (

        <div

          className="fixed inset-0 bg-black/40 z-30 lg:hidden"

          onClick={() => setSidebarOpen(false)}

        />

      )}



      {/* ── Sidebar ── */}

      <aside

        className={`relative w-60 flex-shrink-0 flex flex-col h-screen overflow-hidden
          bg-gradient-to-b from-white via-[#F7FAFF] to-[#F0F5FF]
          border-r border-slate-200 shadow-xl shadow-slate-200/50
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}

      >



        {/* Subtle light-blue decorative curves */}
        <div aria-hidden="true"
          className="pointer-events-none absolute bottom-0 inset-x-0 h-64 opacity-80"
          style={{ background: "radial-gradient(ellipse at 80% 100%, rgba(191,219,254,.55), transparent 52%), linear-gradient(145deg, transparent 48%, rgba(219,234,254,.45) 49%, transparent 72%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-4 border-b border-slate-200/80 flex-shrink-0">

          <img src={companyLogo} alt="DEE Logo" className="h-9 w-9 object-contain flex-shrink-0" />

          <div className="flex flex-col flex-1 min-w-0">

            <div className="text-slate-900 font-bold text-sm leading-tight tracking-wide truncate">

              DEE TravelFlow

            </div>

            <div className="text-[10px] text-[#4F83F1] uppercase tracking-widest mt-0.5">

              Travel Management

            </div>

          </div>

          <button

            onClick={() => setSidebarOpen(false)}

            className="lg:hidden flex-shrink-0 p-1 text-slate-500 hover:text-[#3F73DF] rounded transition"

            aria-label="Close menu"

          >

            <CloseIcon size={18} />

          </button>

        </div>



        {/* Nav label */}

        <div className="relative z-10 px-5 pt-3 pb-1 flex-shrink-0">

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">

            WORKSPACE

          </span>

        </div>



        {/* Nav items */}

        <nav className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 py-1.5 space-y-1">

          {navItems.map(item => {

            const active = item.path === "/dashboard"

              ? loc.pathname === "/dashboard"

              : loc.pathname.startsWith(item.path);

            return (

              <Link

                key={item.path}

                to={item.path}

                className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-xl border text-[13px] font-semibold transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-[#4F83F1] to-[#6B96E8] text-white border-[#6B96E8] shadow-md shadow-[#B8CCF3]/80"
                    : "border-transparent text-slate-700 hover:bg-white hover:text-[#3F73DF] hover:border-[#DCE7F8] hover:shadow-sm"}`}

              >

                <item.icon size={17} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-white" : "text-slate-500 group-hover:text-[#3F73DF]"} />
                <span className="flex-1">{item.label}</span>

              </Link>

            );

          })}

        </nav>



        {/* User card */}

        <div className="relative z-10 mx-3 my-2 px-3 py-2.5 rounded-xl border border-[#DCE7F8] bg-white shadow-sm shadow-[#DCE7F8]/50 flex-shrink-0">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => navigate("/dashboard/profile")}
              title="Open Profile"
              aria-label="Open Profile"
              className="w-10 h-10 bg-[#DCE7F8] ring-1 ring-[#B8CCF3] text-[#3F73DF] rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 cursor-pointer"
            >
              {user?.name?.charAt(0).toUpperCase()}
            </button>

            <div className="min-w-0">

              <div className="font-bold text-slate-900 text-sm truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {user?.department || user?.role?.replace("_", " ")}
              </div>



            </div>

          </div>



          {/* Department */}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
            {user?.plant && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FF] border border-[#DCE7F8] px-2.5 py-1 text-[10px] font-semibold text-[#3F73DF]">
                <MapPin size={10} /> {user.plant}
              </span>
            )}
          </div>

        </div>



        {/* Sign Out */}

        <div className="relative z-10 p-3 border-t border-slate-200/80 flex-shrink-0">

          <button

            onClick={handleLogout}

            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-red-600 border border-red-200 rounded-xl bg-white hover:bg-red-50 hover:border-red-300 hover:shadow-sm transition-all duration-200"

          >

            <LogOut size={13} />

            Sign Out

          </button>

        </div>

      </aside>



      {/* ── Main area ── */}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">





        {/* Top header */}

<header className={
  isDashboardBannerHome
    ? "absolute left-3 top-2 z-40 flex items-center justify-start bg-transparent px-2 py-1 border-0"
    : "relative bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-1.5 flex items-center justify-between flex-shrink-0 gap-2"
}>



  <div className="flex items-center gap-2 min-w-0">

    <button

      onClick={() => setSidebarOpen(true)}

      className="lg:hidden flex-shrink-0 p-1.5 -ml-1 text-gray-500

                 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800

                 rounded-md transition"

      aria-label="Open menu"

    >

      <Menu size={20} />

    </button>





  </div>



  {/* The employee dashboard already renders date, theme, and connection status
      inside the travel wallpaper. Keep this header area for the mobile menu only. */}
  {!isDashboardBannerHome && (
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="text-right hidden sm:block min-w-0">
        <h2 className="text-gray-800 dark:text-gray-100 font-semibold text-base leading-tight truncate">
          {getPageTitle(loc.pathname, user?.role)}
        </h2>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>
      <button
        onClick={toggleTheme}
        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <div
        className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
        title={isOnline ? "Online" : "Offline"}
      />
    </div>
  )}

</header>



        {/* Scrollable content */}

        <main className={`flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7 bg-slate-50 dark:bg-gray-950 ${isDashboardBannerHome ? "pt-3" : "pt-5 sm:pt-7"}`}>

          {children}

        </main>

      </div>

    </div>

  );

}



function getPageTitle(path: string, role?: string) {

  if (path === "/dashboard")         return role === "ADMIN" ? "Admin Panel" : "Dashboard";

  if (path.includes("new-request"))  return "New Travel Request";

  if (path.includes("my-requests"))  return "My Requests";

  if (path.includes("pending"))      return "Pending Approvals";

  if (path.includes("all-requests")) return "All Requests";

  if (path.includes("users"))        return "Manage Users";

  if (path.includes("profile"))      return "My Profile";

  if (path.includes("request/"))     return "Request Details";

  return "Dashboard";

}



function getNavItems(role: string) {

  if (role === "ADMIN")

    return [

      { path: "/dashboard",              label: "Overview",     icon: BarChart3 },

      { path: "/dashboard/users",        label: "Manage Users", icon: Users },

      { path: "/dashboard/all-requests", label: "All Requests", icon: ClipboardList },

      { path: "/dashboard/history",      label: "Travel History", icon: History },

      { path: "/dashboard/profile",      label: "Profile",      icon: User },

    ];



    if (role === "HOD")

      return [

        { path: "/dashboard",              label: "Dashboard",         icon: LayoutDashboard },

        { path: "/dashboard/new-request",  label: "New Request",       icon: PlusCircle },

        { path: "/dashboard/my-requests",  label: "My Requests",       icon: ClipboardList },

        { path: "/dashboard/pending",      label: "Pending Approvals", icon: CheckSquare },

        { path: "/dashboard/all-requests", label: "All Requests",      icon: ClipboardList },

        { path: "/dashboard/history",      label: "Travel History",    icon: History },

        { path: "/dashboard/profile",      label: "Profile",           icon: User },

      ];



    if (role === "DIRECTOR")

       return [

          { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

          { path: "/dashboard/pending", label: "Pending Approvals", icon: CheckSquare,},

          { path: "/dashboard/all-requests", label: "All Requests", icon: ClipboardList },

          { path: "/dashboard/history",label: "Travel Overview", icon: History,},

          { path: "/dashboard/profile", label: "Profile",icon: User, },

     ];



  if (role === "TRAVEL_MANAGER")

    return [

      { path: "/dashboard",         label: "Dashboard",        icon: LayoutDashboard },

      { path: "/dashboard/pending", label: "Process Requests", icon: Briefcase },

      { path: "/dashboard/history", label: "Travel History",   icon: History },

      { path: "/dashboard/profile", label: "Profile",          icon: User },

    ];



  return [

    { path: "/dashboard",             label: "Dashboard",   icon: LayoutDashboard },

    { path: "/dashboard/new-request", label: "New Request", icon: PlusCircle },

    { path: "/dashboard/my-requests", label: "My Requests", icon: ClipboardList },

    { path: "/dashboard/history",     label: "Travel History", icon: History },

    { path: "/dashboard/profile",     label: "Profile",     icon: User },

  ];

}