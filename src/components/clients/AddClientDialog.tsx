import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/integrations/supabase/types"

type Client = Database['public']['Tables']['clients']['Row'];

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  gst: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface AddClientDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  client: Client | null
}

export function AddClientDialog({ isOpen, onClose, onSave, client }: AddClientDialogProps) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  })

  useEffect(() => {
    if (client) {
      reset(client)
    } else {
      reset({
        name: "",
        company: "",
        contact: "",
        email: "",
        gst: "",
        address: "",
      })
    }
  }, [client, reset])

  const onSubmit = async (data: ClientFormData) => {
    if (client) {
      // Update client
      const { error } = await supabase
        .from("clients")
        .update(data)
        .eq("id", client.id)
      if (error) {
        toast({ title: "Error updating client", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Client updated", description: "Client details saved successfully." })
        onSave()
      }
    } else {
      // Add new client
      const { error } = await supabase.from("clients").insert([data])
      if (error) {
        toast({ title: "Error adding client", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Client added", description: "New client created successfully." })
        onSave()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add New Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" {...register("name")} className="col-span-3" />
            {errors.name && <p className="col-span-4 text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company" className="text-right">Company</Label>
            <Input id="company" {...register("company")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">Contact</Label>
            <Input id="contact" {...register("contact")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" {...register("email")} className="col-span-3" />
            {errors.email && <p className="col-span-4 text-red-500 text-sm">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gst" className="text-right">GST No.</Label>
            <Input id="gst" {...register("gst")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Address</Label>
            <Input id="address" {...register("address")} className="col-span-3" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
