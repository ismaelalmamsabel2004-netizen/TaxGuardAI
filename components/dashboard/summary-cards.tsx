"use client"

import { Shield, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TrafficLightStatus = "green" | "yellow" | "red"

interface SummaryCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

function SummaryCard({ title, children, className }: SummaryCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-card p-6 border border-gold/20 shadow-lg shadow-black/20",
      className
    )}>
      {/* Gold gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
      
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function TrafficLight({ status }: { status: TrafficLightStatus }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-32 w-16 flex-col items-center justify-center gap-2 rounded-full bg-muted/50 p-3 border border-border">
        <div className={cn(
          "h-7 w-7 rounded-full transition-all duration-500",
          status === "red" 
            ? "bg-danger shadow-lg shadow-danger/50" 
            : "bg-danger/20"
        )} />
        <div className={cn(
          "h-7 w-7 rounded-full transition-all duration-500",
          status === "yellow" 
            ? "bg-warning shadow-lg shadow-warning/50" 
            : "bg-warning/20"
        )} />
        <div className={cn(
          "h-7 w-7 rounded-full transition-all duration-500",
          status === "green" 
            ? "bg-success shadow-lg shadow-success/50" 
            : "bg-success/20"
        )} />
      </div>
      <span className={cn(
        "text-sm font-semibold uppercase tracking-wide",
        status === "green" && "text-success",
        status === "yellow" && "text-warning",
        status === "red" && "text-danger"
      )}>
        {status === "green" && "Good"}
        {status === "yellow" && "Attention"}
        {status === "red" && "At Risk"}
      </span>
    </div>
  )
}

export function SummaryCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Fiscal Health Card */}
      <SummaryCard title="Fiscal Health">
        <div className="flex flex-col items-center">
          <TrafficLight status="green" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Your current status
          </p>
        </div>
      </SummaryCard>

      {/* Recoverable VAT Card */}
      <SummaryCard title="Recoverable VAT">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 border border-success/30">
              <Check className="h-5 w-5 text-success" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">
            <span className="text-gold">€</span> 1,240.50
          </p>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            Securely validated
          </p>
        </div>
      </SummaryCard>

      {/* VAT at Risk Card */}
      <SummaryCard title="VAT at Risk">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 border border-warning/30">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">
            <span className="text-warning">€</span> 345.10
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Requires full invoice
          </p>
          <Button 
            size="sm" 
            className="mt-4 bg-warning hover:bg-warning/90 text-background font-medium"
          >
            Fix Now
          </Button>
        </div>
      </SummaryCard>
    </div>
  )
}
