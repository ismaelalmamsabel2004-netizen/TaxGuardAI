"use client"

import { LayoutDashboard, FileText, Lightbulb, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  icon: React.ReactNode
  label: string
  active?: boolean
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", active: true },
  { icon: <FileText className="h-5 w-5" />, label: "Documents" },
  { icon: <Lightbulb className="h-5 w-5" />, label: "Insights" },
  { icon: <Settings className="h-5 w-5" />, label: "Settings" },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
              item.active 
                ? "text-gold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export function SideNav() {
  return (
    <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 flex-col border-r border-border bg-sidebar p-4">
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              item.active 
                ? "bg-gold/10 text-gold border border-gold/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Bottom section */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="rounded-xl bg-muted/50 p-4 border border-border">
          <p className="text-sm font-medium text-foreground mb-1">Need Help?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Contact our support team for assistance.
          </p>
          <button className="w-full text-sm text-gold hover:text-gold-light transition-colors font-medium">
            Get Support
          </button>
        </div>
      </div>
    </nav>
  )
}
