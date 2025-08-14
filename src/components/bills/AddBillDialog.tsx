import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/integrations/supabase/types"
import { Trash2 } from "lucide-react"

type Bill = Database['public']['Tables']['bills']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

const serviceSchema = z.object({
  vehicle: z.string().min(1, "Vehicle is required"),
  from: z.string().min(1, "From is required"),
  to: z.string().min(1, "To is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

const billSchema = z.object({
  client_id: z.number().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["paid", "unpaid", "overdue"]),
  services: z.array(serviceSchema).min(1, "At least one service is required"),
})

type BillFormData = z.infer<typeof billSchema>

interface AddBillDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  bill: Bill | null
}

export function AddBillDialog({ isOpen, onClose, onSave, bill }: AddBillDialogProps) {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      services: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from("clients").select("*");
      setClients(data || []);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (bill) {
        reset({
          ...bill,
          client_id: bill.client_id,
          services: Array.isArray(bill.services) ? (bill.services as any) : [],
        });
      } else {
        reset({
          client_id: 0,
          date: new Date().toISOString().split("T")[0],
          status: "unpaid",
          services: [{ vehicle: "", from: "", to: "", amount: 0 }],
        })
      }
    }
  }, [bill, isOpen, reset])

  const onSubmit = async (data: BillFormData) => {
    const selectedClient = clients.find(c => c.id === data.client_id)
    const totalAmount = data.services.reduce((sum, s) => sum + Number(s.amount), 0)
    
    const billData = {
      ...data,
      client: selectedClient?.name || 'Unknown Client',
      amount: totalAmount,
      services: data.services
    }
    
    if (bill) {
      // Update bill
      const { error } = await supabase
        .from("bills")
        .update(billData)
        .eq("id", bill.id)
      if (error) {
        toast({ title: "Error updating bill", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Bill updated", description: "Bill details saved successfully." })
        onSave()
      }
    } else {
      // Add new bill
      const { error } = await supabase.from("bills").insert([billData])
      if (error) {
        toast({ title: "Error adding bill", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Bill added", description: "New bill created successfully." })
        onSave()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{bill ? "Edit Bill" : "Create New Bill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select onValueChange={(value) => setValue("client_id", parseInt(value))} value={watch("client_id")?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="col-span-4 text-red-500 text-sm">{errors.client_id.message}</p>}
            </div>
            <div>
              <Label htmlFor="date">Bill Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="col-span-4 text-red-500 text-sm">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setValue("status", value as "paid" | "unpaid" | "overdue")} value={watch("status")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <Label>Services</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-11 gap-2 items-center">
                <Input {...register(`services.${index}.vehicle`)} placeholder="Vehicle No." className="col-span-3" />
                <Input {...register(`services.${index}.from`)} placeholder="From" className="col-span-2" />
                <Input {...register(`services.${index}.to`)} placeholder="To" className="col-span-2" />
                <Input type="number" {...register(`services.${index}.amount`, { valueAsNumber: true })} placeholder="Amount" className="col-span-2" />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="col-span-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {errors.services && <p className="text-red-500 text-sm">{errors.services.message}</p>}
            <Button type="button" variant="outline" onClick={() => append({ vehicle: "", from: "", to: "", amount: 0 })}>
              Add Service
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
