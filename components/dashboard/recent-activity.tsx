"use client"

import { FileText, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ActivityStatus = "green" | "yellow" | "red"

interface Activity {
  id: string
  vendor: string
  category: string
  status: ActivityStatus
  date: string
  amount: string
}

const activities: Activity[] = [
  {
    id: "1",
    vendor: "Ballenoil",
    category: "Gasoline",
    status: "yellow",
    date: "Apr 8, 2026",
    amount: "€ 85.40",
  },
  {
    id: "2",
    vendor: "La Tradicional",
    category: "Restaurant",
    status: "yellow",
    date: "Apr 7, 2026",
    amount: "€ 124.50",
  },
  {
    id: "3",
    vendor: "VicVal SI",
    category: "Computers",
    status: "green",
    date: "Apr 5, 2026",
    amount: "€ 1,299.00",
  },
  {
    id: "4",
    vendor: "Amazon Business",
    category: "Office Supplies",
    status: "green",
    date: "Apr 3, 2026",
    amount: "€ 156.80",
  },
  {
    id: "5",
    vendor: "Iberdrola",
    category: "Utilities",
    status: "green",
    date: "Apr 1, 2026",
    amount: "€ 245.30",
  },
]

function StatusIndicator({ status }: { status: ActivityStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "h-2.5 w-2.5 rounded-full",
        status === "green" && "bg-success shadow-sm shadow-success/50",
        status === "yellow" && "bg-warning shadow-sm shadow-warning/50",
        status === "red" && "bg-danger shadow-sm shadow-danger/50"
      )} />
      {status === "yellow" && (
        <span className="text-xs text-warning">Needs review</span>
      )}
    </div>
  )
}

export function RecentActivity() {
  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        <button className="text-sm text-gold hover:text-gold-light transition-colors flex items-center gap-1">
          View All
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border group-hover:border-gold/30 transition-colors">
                  <FileText className="h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{activity.vendor}</p>
                    <StatusIndicator status={activity.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.category} • {activity.date}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <p className="font-semibold text-foreground">{activity.amount}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
