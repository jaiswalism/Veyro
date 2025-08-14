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
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/integrations/supabase/types"

type Bill = Database['public']['Tables']['bills']['Row'];

const paymentSchema = z.object({
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.string().optional().nullable(),
  transaction_id: z.string().optional().nullable(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface AddPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  bill: Bill | null
}

export function AddPaymentDialog({ isOpen, onClose, onSave, bill }: AddPaymentDialogProps) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  })

  useEffect(() => {
    if (bill) {
      reset({
        payment_date: new Date().toISOString().split("T")[0],
        payment_mode: "",
        transaction_id: "",
      })
    }
  }, [bill, reset])

  const onSubmit = async (data: PaymentFormData) => {
    if (!bill) return;

    // 1. Add to payments table
    const { error: paymentError } = await supabase.from("payments").insert([{
      bill_id: bill.id,
      amount: bill.amount,
      ...data,
    }])

    if (paymentError) {
      toast({ title: "Error recording payment", description: paymentError.message, variant: "destructive" })
      return;
    }

    // 2. Update bill status
    const { error: billError } = await supabase
      .from("bills")
      .update({ status: "paid" })
      .eq("id", bill.id)

    if (billError) {
      toast({ title: "Error updating bill status", description: billError.message, variant: "destructive" })
    } else {
      toast({ title: "Payment recorded", description: "The bill has been marked as paid." })
      onSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark Bill as Paid</DialogTitle>
          <DialogDescription>
            Record payment for bill #{bill?.id} - {bill?.client}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment_date" className="text-right">Payment Date</Label>
            <Input id="payment_date" type="date" {...register("payment_date")} className="col-span-3" />
            {errors.payment_date && <p className="col-span-4 text-red-500 text-sm">{errors.payment_date.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment_mode" className="text-right">Payment Mode</Label>
            <Input id="payment_mode" {...register("payment_mode")} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transaction_id" className="text-right">Transaction ID</Label>
            <Input id="transaction_id" {...register("transaction_id")} className="col-span-3" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
