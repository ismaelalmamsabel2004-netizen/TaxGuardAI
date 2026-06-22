import { Header } from "@/components/dashboard/header"
import { UploadSection } from "@/components/dashboard/upload-section"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { BottomNav, SideNav } from "@/components/dashboard/bottom-nav"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SideNav />
      
      <main className="pb-24 md:pb-8 md:pl-64">
        <div className="container px-4 py-8 md:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">
              Welcome back, <span className="text-gold">Ismael</span>
            </h1>
            <p className="text-muted-foreground">
              Your fiscal overview for April 2026
            </p>
          </div>

          <div className="space-y-8">
            {/* Hero Upload Section */}
            <UploadSection />
            
            {/* Summary Cards */}
            <SummaryCards />
            
            {/* Recent Activity */}
            <RecentActivity />
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  )
}
