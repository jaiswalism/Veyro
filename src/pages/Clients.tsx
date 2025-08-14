import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { supabase } from "@/integrations/supabase/client"
import { Database } from "@/integrations/supabase/types"
import { useToast } from "@/hooks/use-toast"
import { AddClientDialog } from "@/components/clients/AddClientDialog"
import { Skeleton } from "@/components/ui/skeleton"

type Client = Database['public']['Tables']['clients']['Row'];

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const { toast } = useToast()

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("clients").select("*")

    if (error) {
      toast({
        title: "Error fetching clients",
        description: error.message,
        variant: "destructive",
      })
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleDelete = async (clientId: number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      const { error } = await supabase.from("clients").delete().eq("id", clientId)
      if (error) {
        toast({
          title: "Error deleting client",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Client deleted",
          description: "The client has been successfully deleted.",
        })
        fetchClients()
      }
    }
  }

  const handleSave = () => {
    setIsDialogOpen(false)
    setEditingClient(null)
    fetchClients()
  }

  const filteredClients = clients.filter(client =>
    (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.gst && client.gst.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Manage your client information and contact details.
          </p>
        </div>
        <Button className="mt-4 sm:mt-0" onClick={() => { setEditingClient(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search clients by name, company, or GST number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.company}</p>
                        <p className="text-xs text-muted-foreground mt-1">{client.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{client.contact}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {client.gst}
                      </code>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingClient(client); setIsDialogOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddClientDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        client={editingClient}
      />
    </div>
  )
}
