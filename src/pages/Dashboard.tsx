import { useEffect, useState } from "react"
import { FileText, Users, CreditCard, AlertTriangle } from "lucide-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBills: 0,
    paidBills: 0,
    unpaidBills: 0,
    totalClients: 0,
    monthlyRevenue: "₹0",
    overdueAmount: "₹0",
    totalBillsTrend: { value: "0%", isPositive: true },
    paidBillsTrend: { value: "0%", isPositive: true },
    totalClientsTrend: { value: "+0 new this month", isPositive: true },
    monthlyRevenueTrend: { value: "0%", isPositive: true },
  })
  const [recentBills, setRecentBills] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

      // Fetch bills
      const { data: bills, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .order("date", { ascending: false })

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*")

      if (bills && clients) {
        const paidBills = bills.filter((b: any) => b.status === "paid")
        const unpaidBills = bills.filter((b: any) => b.status === "unpaid")
        const overdueBills = bills.filter((b: any) => b.status === "overdue")

        const currentMonthBills = bills.filter((b: any) => {
          const billDate = new Date(b.date)
          return (
            billDate.getMonth() === currentMonth &&
            billDate.getFullYear() === currentYear
          )
        })

        const lastMonthBills = bills.filter((b: any) => {
            const billDate = new Date(b.date)
            return (
                billDate.getMonth() === lastMonth &&
                billDate.getFullYear() === lastMonthYear
            )
        })

        const currentMonthPaidBills = currentMonthBills.filter((b: any) => b.status === "paid");
        const lastMonthPaidBills = lastMonthBills.filter((b: any) => b.status === "paid");

        const monthlyRevenue = currentMonthPaidBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)
        const lastMonthRevenue = lastMonthPaidBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)
        
        const overdueAmount = overdueBills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)

        const newClientsThisMonth = clients.filter((c: any) => {
            const joinDate = new Date(c.created_at)
            return (
                joinDate.getMonth() === currentMonth &&
                joinDate.getFullYear() === currentYear
            )
        }).length

        const totalBillsPercentageChange = lastMonthBills.length > 0 ? ((currentMonthBills.length - lastMonthBills.length) / lastMonthBills.length) * 100 : 100;
        const paidBillsPercentageChange = lastMonthPaidBills.length > 0 ? ((currentMonthPaidBills.length - lastMonthPaidBills.length) / lastMonthPaidBills.length) * 100 : 100;
        const monthlyRevenuePercentageChange = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 100;


        setStats({
          totalBills: bills.length,
          paidBills: paidBills.length,
          unpaidBills: unpaidBills.length,
          totalClients: clients.length,
          monthlyRevenue: `₹${monthlyRevenue.toLocaleString()}`,
          overdueAmount: `₹${overdueAmount.toLocaleString()}`,
          totalBillsTrend: { value: `${totalBillsPercentageChange.toFixed(0)}% from last month`, isPositive: totalBillsPercentageChange >= 0 },
          paidBillsTrend: { value: `${paidBillsPercentageChange.toFixed(0)}% from last month`, isPositive: paidBillsPercentageChange >= 0 },
          totalClientsTrend: { value: `+${newClientsThisMonth} new this month`, isPositive: true },
          monthlyRevenueTrend: { value: `${monthlyRevenuePercentageChange.toFixed(0)}% from last month`, isPositive: monthlyRevenuePercentageChange >= 0 },
        })
        setRecentBills(bills.slice(0, 4))
      }
    }
    fetchData()
  }, [])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default"
      case "unpaid": return "secondary"
      case "overdue": return "destructive"
      default: return "secondary"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your transport business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bills"
          value={stats.totalBills}
          icon={<FileText className="w-4 h-4" />}
          trend={stats.totalBillsTrend}
        />
        <StatsCard
          title="Paid Bills"
          value={stats.paidBills}
          icon={<CreditCard className="w-4 h-4" />}
          variant="success"
          trend={stats.paidBillsTrend}
        />
        <StatsCard
          title="Unpaid Bills"
          value={stats.unpaidBills}
          icon={<AlertTriangle className="w-4 h-4" />}
          variant="warning"
        />
        <StatsCard
          title="Total Clients"
          value={stats.totalClients}
          icon={<Users className="w-4 h-4" />}
          trend={stats.totalClientsTrend}
        />
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.monthlyRevenue}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.monthlyRevenueTrend.value}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-foreground">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.overdueAmount}</div>
            <p className="text-sm text-muted-foreground mt-2">
              From {stats.unpaidBills} unpaid bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Recent Bills</CardTitle>
          <Button variant="outline" size="sm">
            View All Bills
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium text-foreground">{bill.id}</p>
                    <p className="text-sm text-muted-foreground">{bill.client}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium text-foreground">{`₹${bill.amount?.toLocaleString()}`}</p>
                    <p className="text-sm text-muted-foreground">{bill.date}</p>
                  </div>
                  <Badge variant={getStatusVariant(bill.status)}>
                    {bill.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}