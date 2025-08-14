import { useState, useEffect } from "react"
import { Search, Calendar, CreditCard, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { Database } from "@/integrations/supabase/types"
import { useToast } from "@/hooks/use-toast"
import { AddPaymentDialog } from "@/components/payments/AddPaymentDialog"
import { Skeleton } from "@/components/ui/skeleton"

type Bill = Database['public']['Tables']['bills']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const { data: billsData, error: billsError } = await supabase.from("bills").select("*")
    const { data: paymentsData, error: paymentsError } = await supabase.from("payments").select("*")

    if (billsError || paymentsError) {
      toast({
        title: "Error fetching data",
        description: billsError?.message || paymentsError?.message,
        variant: "destructive",
      })
    } else {
      setBills(billsData || [])
      setPayments(paymentsData || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = () => {
    setIsDialogOpen(false)
    setSelectedBill(null)
    fetchData()
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.client.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default"
      case "unpaid": return "secondary"
      case "overdue": return "destructive"
      default: return "secondary"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "paid") return false
    return new Date(dueDate) < new Date() && !new Date(dueDate).toDateString().includes(new Date().toDateString())
  }
  
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
  const outstandingAmount = outstandingBills.reduce((sum, b) => sum + b.amount, 0);
  const overdueAmount = bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground mt-2">
          Track payment status and manage outstanding amounts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {payments.length} payments
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(outstandingAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {outstandingBills.length} unpaid bills
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter(b => b.status === 'overdue').length} overdue bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by bill number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Payment Tracking ({filteredBills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Details</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBills.map((bill) => (
                  <TableRow key={bill.id} className={
                    isOverdue(bill.date, bill.status) ? "bg-destructive/5" : ""
                  }>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{bill.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{bill.client}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(bill.amount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className={
                          isOverdue(bill.date, bill.status) 
                            ? "text-destructive font-medium" 
                            : "text-foreground"
                        }>
                          {bill.date}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.status !== "paid" ? (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedBill(bill); setIsDialogOpen(true); }}>
                          <Check className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-success text-sm">✓ Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddPaymentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        bill={selectedBill}
      />
    </div>
  )
}
