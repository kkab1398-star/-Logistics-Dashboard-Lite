import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import ExpensesList from "@/pages/expenses/index";
import AddExpense from "@/pages/expenses/new";
import DriversList from "@/pages/drivers/index";
import AddDriver from "@/pages/drivers/new";
import AddRevenue from "@/pages/revenues/new";
import AddTransfer from "@/pages/transfers/new";
import TransferList from "@/pages/transfers/index";
import AdminDashboard from "@/pages/admin/index";
import SettlePage from "@/pages/drivers/settle";
import EditDriver from "@/pages/drivers/edit";
import InvoicePage from "@/pages/invoice";
import SettingsPage from "@/pages/settings";
import ArchivePage from "@/pages/archive";
import RevenueList from "@/pages/revenues/index";
import StatisticsPage from "@/pages/admin/statistics";
import DailyOperationsPage from "@/pages/admin/daily-operations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function SettleRoute() {
  const { driverId, driverName, role } = useAuth();
  const [location] = useLocation();

  const adminMatch = location.match(/^\/drivers\/(\d+)\/settle$/);
  if (adminMatch) {
    return <SettlePage driverId={Number(adminMatch[1])} />;
  }

  if (driverId) {
    return <SettlePage driverId={driverId} driverName={driverName || undefined} />;
  }

  return <NotFound />;
}

function AdminOnly({ component: Component }: { component: React.ComponentType }) {
  const { role } = useAuth();
  if (role !== "admin") return <NotFound />;
  return <Component />;
}

function Router() {
  const { role } = useAuth();

  if (!role) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/expenses" component={ExpensesList} />
        <Route path="/expenses/new" component={AddExpense} />
        <Route path="/drivers">
          {() => <AdminOnly component={DriversList} />}
        </Route>
        <Route path="/drivers/new">
          {() => <AdminOnly component={AddDriver} />}
        </Route>
        <Route path="/revenues" component={RevenueList} />
        <Route path="/revenues/new" component={AddRevenue} />
        <Route path="/transfers" component={TransferList} />
        <Route path="/transfers/new" component={AddTransfer} />
        <Route path="/settle" component={SettleRoute} />
        <Route path="/drivers/:id/settle" component={SettleRoute} />
        <Route path="/drivers/:id/edit">
          {(params) => <EditDriver driverId={Number(params.id)} />}
        </Route>
        <Route path="/admin">
          {() => <AdminOnly component={AdminDashboard} />}
        </Route>
        <Route path="/archive">
          {() => <AdminOnly component={ArchivePage} />}
        </Route>
        <Route path="/statistics">
          {() => <AdminOnly component={StatisticsPage} />}
        </Route>
        <Route path="/admin/daily-operations">
          {() => <AdminOnly component={DailyOperationsPage} />}
        </Route>
        <Route path="/invoice" component={InvoicePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
