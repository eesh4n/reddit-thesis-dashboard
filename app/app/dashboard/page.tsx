import { getAllTheses } from "@/lib/queries";
import Dashboard from "@/components/Dashboard";

// Always read fresh data from the database on each request (no static caching).
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const theses = await getAllTheses();
  return <Dashboard theses={theses} />;
}
