import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  Menu, Truck, Receipt, UserPlus, PlusCircle, Globe, TrendingUp,
  ArrowUpFromLine, Scale, ShieldCheck, LayoutDashboard, LogOut,
  FileText, Archive, BarChart2, Settings, Activity, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const { role, driverName, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRtl = lang === "ar" || lang === "ur";

  const driverNavItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/expenses", label: t("expenses"), icon: Receipt },
    { href: "/revenues", label: t("revenues"), icon: TrendingUp },
    { href: "/transfers", label: t("transfers"), icon: ArrowUpFromLine },
    { href: "/settle", label: t("settle"), icon: Scale },
  ];

  const adminNavItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin", label: t("adminDashboard"), icon: ShieldCheck },
    { href: "/admin/daily-operations", label: t("dailyOperations"), icon: Activity },
    { href: "/statistics", label: t("statistics"), icon: BarChart2 },
    { href: "/drivers", label: t("drivers"), icon: Truck },
    { href: "/archive", label: t("archive"), icon: Archive },
    { href: "/invoice", label: t("createInvoice"), icon: FileText },
  ];

  const quickActions = [
    { href: "/expenses/new", label: t("addExpense"), icon: PlusCircle },
    { href: "/revenues/new", label: t("addRevenue"), icon: TrendingUp },
    { href: "/transfers/new", label: t("addTransfer"), icon: ArrowUpFromLine },
  ];

  const navItems = role === "admin" ? adminNavItems : driverNavItems;

  return (
    <div className={`min-h-[100dvh] flex flex-col bg-[#f8fafc] ${isRtl ? "font-arabic" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Banner - Slim & Professional */}
      <div className="w-full bg-slate-900 text-slate-300 text-center py-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] border-b border-white/5">
        {t("invoiceHeader")}
      </div>

      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden hover:bg-slate-100 text-slate-600">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="bg-slate-950 text-white border-none w-80 p-0 shadow-2xl">
                <SheetHeader className="px-6 py-8 border-b border-white/10 bg-gradient-to-br from-slate-900 to-slate-950">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                      <Truck className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <SheetTitle className="text-white font-bold text-xl tracking-tight leading-none">{t("appName")}</SheetTitle>
                      <p className="text-slate-400 text-[10px] mt-1 font-medium">{t("invoiceHeader")}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    {role === "admin" ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 text-[10px] font-bold">إدارة النظام</Badge>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-slate-400 text-[10px] mb-1">المستخدم الحالي</p>
                        <p className="text-sm font-bold text-blue-400">{driverName || "سائق"}</p>
                      </div>
                    )}
                  </div>
                </SheetHeader>

                <div className="flex flex-col py-6 px-4 gap-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                  <p className="text-slate-500 text-[10px] font-bold uppercase px-4 mb-2 tracking-widest">القائمة الرئيسية</p>
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <span
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium ${
                          location === item.href
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1"
                            : "hover:bg-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-5 w-5 ${location === item.href ? "text-white" : "text-slate-500"}`} />
                          {item.label}
                        </div>
                        {location === item.href && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                      </span>
                    </Link>
                  ))}

                  <p className="text-slate-500 text-[10px] font-bold uppercase px-4 mt-6 mb-2 tracking-widest">إضافات سريعة</p>
                  {quickActions.map((item) => (
                    <Link key={item.href} href={item.href}>
                       <span
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 text-sm font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/">
              <span className="flex items-center gap-3 cursor-pointer group">
                <div className="bg-slate-900 p-1.5 rounded-lg group-hover:bg-blue-600 transition-colors duration-300">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block">
                  {t("appName")}
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Navigation Highlights */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {navItems.slice(0, 4).map((item) => (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-all cursor-pointer font-bold ${
                    location === item.href
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                  }`}>
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-sm">
               {/* Language switcher */}
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-50 gap-2 px-3 text-slate-600">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span className="uppercase text-[10px] font-bold tracking-wider">{lang}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-xl border-slate-200">
                  <DropdownMenuItem onClick={() => setLang("ar")} className={`rounded-lg py-2 cursor-pointer ${lang === "ar" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-600"}`}>العربية</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLang("en")} className={`rounded-lg py-2 cursor-pointer ${lang === "en" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-600"}`}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLang("ur")} className={`rounded-lg py-2 cursor-pointer ${lang === "ur" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-600"}`}>اردو</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-[1px] h-4 bg-slate-200 mx-1" />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-50 gap-2 px-2 group">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${role === 'admin' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                      {role === 'admin' ? 'AD' : (driverName?.substring(0,2).toUpperCase() || 'DR')}
                    </div>
                    <Settings className="h-4 w-4 text-slate-400 group-hover:rotate-45 transition-transform duration-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-slate-200">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الحساب الحالي</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{driverName || (role === 'admin' ? 'مدير النظام' : 'سائق')}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-lg py-2.5 cursor-pointer text-slate-600 gap-3">
                    <Settings className="h-4 w-4" /> {t("settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="rounded-lg py-2.5 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 gap-3">
                    <LogOut className="h-4 w-4" /> {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
        {/* Page Context Badge */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-1 w-8 bg-blue-600 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">نظام إدارة النقل اللوجستي</span>
        </div>
        {children}
      </main>
      
      {/* Visual Footer Gradient */}
      <div className="h-20 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
    </div>
  );
}