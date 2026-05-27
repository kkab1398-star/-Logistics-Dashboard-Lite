import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  Menu, Truck, Receipt, UserPlus, PlusCircle, Globe, TrendingUp,
  ArrowUpFromLine, Scale, ShieldCheck, LayoutDashboard, LogOut,
  FileText, Archive, BarChart2, Settings, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useI18n();
  const { role, driverName, driverId, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRtl = lang === "ar" || lang === "ur";

  const driverNavItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/expenses", label: t("expenses"), icon: Receipt },
    { href: "/revenues", label: t("revenues"), icon: TrendingUp },
    { href: "/transfers", label: t("transfers"), icon: ArrowUpFromLine },
    { href: "/expenses/new", label: t("addExpense"), icon: PlusCircle },
    { href: "/revenues/new", label: t("addRevenue"), icon: TrendingUp },
    { href: "/transfers/new", label: t("addTransfer"), icon: ArrowUpFromLine },
    { href: "/settle", label: t("settle"), icon: Scale },
  ];

  const adminNavItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin", label: t("adminDashboard"), icon: ShieldCheck },
    { href: "/admin/daily-operations", label: t("dailyOperations"), icon: Activity },
    { href: "/archive", label: t("archive"), icon: Archive },
    { href: "/statistics", label: t("statistics"), icon: BarChart2 },
    { href: "/drivers", label: t("drivers"), icon: Truck },
    { href: "/drivers/new", label: t("addDriver"), icon: UserPlus },
    { href: "/expenses/new", label: t("addExpense"), icon: PlusCircle },
    { href: "/revenues/new", label: t("addRevenue"), icon: TrendingUp },
    { href: "/transfers/new", label: t("addTransfer"), icon: ArrowUpFromLine },
    { href: "/invoice", label: t("createInvoice"), icon: FileText },
  ];

  const navItems = role === "admin" ? adminNavItems : driverNavItems;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Identity sub-header */}
      <div className="w-full bg-primary/90 text-primary-foreground text-center py-1 px-4 text-xs font-medium tracking-wide opacity-80">
        {t("invoiceHeader")}
      </div>

      <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/90 lg:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="bg-primary text-primary-foreground border-primary w-72 p-0">
                <SheetHeader className="px-6 py-5 border-b border-primary-foreground/20">
                  <SheetTitle className="text-primary-foreground font-bold text-2xl">{t("appName")}</SheetTitle>
                  <p className="text-primary-foreground/70 text-xs mt-1">{t("invoiceHeader")}</p>
                  {role === "driver" && driverName && (
                    <Badge variant="secondary" className="mt-2 w-fit text-xs">{driverName}</Badge>
                  )}
                  {role === "admin" && (
                    <Badge className="mt-2 w-fit text-xs bg-yellow-500 text-yellow-950">Admin</Badge>
                  )}
                </SheetHeader>
                <div className="flex flex-col py-4 px-3 gap-1">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <span
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-sm font-medium ${
                          location === item.href
                            ? "bg-white/20 text-white"
                            : "hover:bg-white/10 text-primary-foreground/80"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/">
              <span className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
                <img
                  src="/icon-192.png"
                  alt={t("appName")}
                  className="h-8 w-8 rounded-md shadow-sm"
                />
                <span className="text-xl font-bold tracking-tight">
                  {t("appName")}
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1 mx-2">
              {navItems.slice(0, 5).map((item) => (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                    location === item.href
                      ? "bg-white/20 text-white font-medium"
                      : "hover:bg-white/10 text-primary-foreground/80"
                  }`}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              ))}
              {navItems.length > 5 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:bg-white/10">
                      <Menu className="h-4 w-4 me-1" />
                      <span className="text-sm">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {navItems.slice(5).map(item => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href}>
                          <span className="flex items-center gap-2 w-full cursor-pointer">
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Role badge (desktop only) */}
            <div className="hidden md:flex items-center gap-2">
              {role === "admin" ? (
                <Badge className="bg-yellow-500 text-yellow-950 text-xs">Admin</Badge>
              ) : driverName ? (
                <Badge variant="secondary" className="text-xs">{driverName}</Badge>
              ) : null}
            </div>

            {/* Settings gear */}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary/90 px-2"
              title={t("settings")}
              onClick={() => navigate("/settings")}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">{t("settings")}</span>
            </Button>

            {/* Language switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/90 gap-1 px-2">
                  <Globe className="h-4 w-4" />
                  <span className="uppercase text-xs font-semibold">{lang}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setLang("ar")} className={lang === "ar" ? "bg-muted" : ""}>العربية</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")} className={lang === "en" ? "bg-muted" : ""}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("ur")} className={lang === "ur" ? "bg-muted" : ""}>اردو</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary/90 px-2"
              title={t("logout")}
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">{t("logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
