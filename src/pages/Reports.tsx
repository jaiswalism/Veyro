import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, DollarSign, FileText, Calendar } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Database } from "@/integrations/supabase/types"

type Bill = Database['public']['Tables']['bills']['Row'];

export default function Reports() {
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    avgBillValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: bills, error } = await supabase.from("bills").select("*")

      if (error) {
        toast({
          title: "Error fetching reports data",
          description: error.message,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (bills) {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const monthlyBills = bills.filter(b => {
          const billDate = new Date(b.date)
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear
        })
        const monthlyRevenue = monthlyBills
          .filter(b => b.status === 'paid')
          .reduce((sum, b) => sum + b.amount, 0)

        const yearlyBills = bills.filter(b => new Date(b.date).getFullYear() === currentYear)
        const yearlyRevenue = yearlyBills
          .filter(b => b.status === 'paid')
          .reduce((sum, b) => sum + b.amount, 0)

        const paidBills = bills.filter(b => b.status === 'paid').length
        const pendingBills = bills.length - paidBills
        const avgBillValue = bills.length > 0 ? yearlyRevenue / paidBills : 0

        setStats({
          monthlyRevenue,
          yearlyRevenue,
          totalBills: bills.length,
          paidBills,
          pendingBills,
          avgBillValue,
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [toast])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate comprehensive reports and analytics for your transport business.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.monthlyRevenue)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.yearlyRevenue)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold text-foreground">{stats.totalBills}</div>}
            {loading ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground mt-1">{stats.paidBills} paid, {stats.pendingBills} pending</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Avg. Bill Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.avgBillValue)}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Financial Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Monthly Income Summary</h3>
                <p className="text-sm text-muted-foreground">Revenue breakdown by month</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Yearly Revenue Report</h3>
                <p className="text-sm text-muted-foreground">Complete yearly financial overview</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Outstanding Payments</h3>
                <p className="text-sm text-muted-foreground">Unpaid bills and overdue amounts</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Client Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Client-wise Revenue</h3>
                <p className="text-sm text-muted-foreground">Revenue breakdown by client</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Service History</h3>
                <p className="text-sm text-muted-foreground">Detailed service logs and routes</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Client Performance</h3>
                <p className="text-sm text-muted-foreground">Payment behavior and frequency</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Custom Report Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground">Report Type</label>
              <select className="w-full mt-1 p-2 border border-border rounded-md bg-background">
                <option>Financial Summary</option>
                <option>Client Analysis</option>
                <option>Service Records</option>
                <option>Payment Tracking</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <select className="w-full mt-1 p-2 border border-border rounded-md bg-background">
                <option>Last 30 days</option>
                <option>Last 3 months</option>
                <option>Last 6 months</option>
                <option>This year</option>
                <option>Custom range</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Format</label>
              <select className="w-full mt-1 p-2 border border-border rounded-md bg-background">
                <option>PDF</option>
                <option>Excel (XLSX)</option>
                <option>CSV</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
