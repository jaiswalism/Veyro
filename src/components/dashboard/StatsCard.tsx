import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  variant?: "default" | "success" | "warning" | "destructive"
}

export function StatsCard({ title, value, icon, trend, variant = "default" }: StatsCardProps) {
  const variants = {
    default: "border-border",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5", 
    destructive: "border-destructive/20 bg-destructive/5"
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", variants[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg",
          variant === "success" && "bg-success/10 text-success",
          variant === "warning" && "bg-warning/10 text-warning",
          variant === "destructive" && "bg-destructive/10 text-destructive",
          variant === "default" && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  )
}