import { useState, useEffect } from "react"
import { Plus, Search, Download, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { AddBillDialog } from "@/components/bills/AddBillDialog"
import { Skeleton } from "@/components/ui/skeleton"

type Bill = Database['public']['Tables']['bills']['Row'];

export default function Bills() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const { toast } = useToast()

  const fetchBills = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("bills").select("*")

    if (error) {
      toast({
        title: "Error fetching bills",
        description: error.message,
        variant: "destructive",
      })
    } else {
      setBills(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBills()
  }, [])
  
  const handleDelete = async (billId: number) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      const { error } = await supabase.from("bills").delete().eq("id", billId)
      if (error) {
        toast({
          title: "Error deleting bill",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Bill deleted",
          description: "The bill has been successfully deleted.",
        })
        fetchBills()
      }
    }
  }

  const handleSave = () => {
    setIsDialogOpen(false)
    setEditingBill(null)
    fetchBills()
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bills</h1>
          <p className="text-muted-foreground mt-2">
            Manage bills, track payments, and generate invoices.
          </p>
        </div>
        <Button className="mt-4 sm:mt-0" onClick={() => { setEditingBill(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
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

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">All Bills ({filteredBills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Details</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
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
                      <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{bill.id}</p>
                          <p className="text-sm text-muted-foreground">{bill.date}</p>
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
                      <Badge variant={getStatusVariant(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingBill(bill); setIsDialogOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Bill
                            </DropdownMenuItem>
                            {bill.status !== "paid" && (
                              <DropdownMenuItem>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bill.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Bill
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddBillDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        bill={editingBill}
      />
    </div>
  )
}
