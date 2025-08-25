// src/pages/CreateBill.tsx

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Trash2, Save, Download, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { generateInvoicePdf } from "@/lib/pdfGenerator";

// Define types from Supabase schema
type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Bill = Database['public']['Tables']['bills']['Row'];

// Zod schema for validation
const serviceSchema = z.object({
  party: z.string().optional().nullable(),
  challan_number: z.string().optional().nullable(),
  vehicle: z.string().min(1, "Vehicle is required"),
  from: z.string().min(1, "From is required"),
  to: z.string().min(1, "To is required"),
  trips: z.coerce.number().min(1, "Trips must be at least 1").default(1),
  amount: z.coerce.number().min(0, "Amount must be positive").default(0),
});

const billSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  due_date: z.string().min(1, "Due date is required"),
  advance: z.coerce.number().min(0).optional().nullable().default(0),
  services: z.array(serviceSchema).min(1, "At least one service is required"),
});

type BillFormData = z.infer<typeof billSchema>;

export default function CreateBillPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      due_date: new Date().toISOString().split("T")[0],
      services: [{ party: "", challan_number: "", vehicle: "", from: "", to: "", trips: 1, amount: 0 }],
      advance: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  // --- THIS IS THE FIX ---
  // Watch the form values
  const watchedServices = watch("services");
  const watchedAdvance = watch("advance");

  // Perform calculations directly, ensuring values are treated as numbers
  const subtotal = watchedServices.reduce((acc, service) => {
    const amount = Number(service.amount) || 0;
    const trips = Number(service.trips) || 1;
    return acc + (amount * trips);
  }, 0);

  const totalAmount = subtotal - (Number(watchedAdvance) || 0);
  // --- END OF FIX ---

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      // Fetch clients
      const { data: clientData } = await supabase.from("clients").select("*");
      setClients(clientData || []);
      
      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(profileData);
    };
    fetchData();
  }, [user]);

  const handleClientChange = (clientId: string) => {
      setValue("client_id", clientId, { shouldValidate: true });
      const client = clients.find(c => c.id.toString() === clientId);
      setSelectedClient(client || null);
  }

  const onSaveBill = async (data: BillFormData) => {
    if (!user || !selectedClient) {
        toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
        return;
    }

    const billData = {
      user_id: user.id,
      client_id: selectedClient.id,
      client: selectedClient.name,
      date: data.date,
      services: data.services,
      advance: data.advance,
      amount: totalAmount,
      status: 'unpaid' as const,
    };

    const { error } = await supabase.from("bills").insert([billData]);

    if (error) {
      toast({ title: "Error saving bill", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bill Saved!", description: "The bill has been saved successfully." });
      navigate("/bills");
    }
  };

  const onDownloadPdf = () => {
      const currentBillData = getValues();
      if (!selectedClient || !profile) {
          toast({ title: "Missing Information", description: "Please select a client and complete your profile first.", variant: "destructive" });
          return;
      }

      const billForPdf: Bill = {
          id: Date.now(),
          created_at: new Date().toISOString(),
          client_id: selectedClient.id,
          client: selectedClient.name,
          date: currentBillData.date,
          services: currentBillData.services as any,
          advance: currentBillData.advance || 0,
          amount: totalAmount,
          status: 'unpaid',
      };
      
      generateInvoicePdf(billForPdf, selectedClient, profile);
  }

  return (
    <div className="bg-muted/40 -m-8 p-8 min-h-screen">
      <form onSubmit={handleSubmit(onSaveBill)} className="max-w-5xl mx-auto bg-background p-8 rounded-lg shadow-sm border">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Company Logo" className="h-12 max-w-xs"/>
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{profile?.company_name || "Your Company"}</h1>
            )}
            <div className="text-sm text-muted-foreground mt-2">
              <p>{profile?.phone}</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-right" style={{ color: profile?.theme_color || 'hsl(var(--primary))' }}>
            {profile?.company_name || "INVOICE"}
          </h1>
        </div>

        {/* Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-semibold">BILL TO</Label>
            <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={handleClientChange} value={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            />
            {selectedClient && (
                <div className="text-sm text-muted-foreground pt-2 space-y-1">
                    {selectedClient.company && <p className="font-medium text-foreground">{selectedClient.company}</p>}
                    <p>{selectedClient.contact}</p>
                    {selectedClient.gst && <p>GST: {selectedClient.gst}</p>}
                </div>
            )}
            {errors.client_id && <p className="text-destructive text-xs mt-1">{errors.client_id.message}</p>}
          </div>
          <div className="space-y-2">
              <Label htmlFor="date" className="text-muted-foreground font-semibold">BILL DATE</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-destructive text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div className="space-y-2">
              <Label htmlFor="due_date" className="text-muted-foreground font-semibold">DUE DATE</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
              {errors.due_date && <p className="text-destructive text-xs mt-1">{errors.due_date.message}</p>}
          </div>
        </div>

        {/* Services Table */}
        <div className="mb-8">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground border-b pb-2 mb-4">
            <div className="col-span-4">DESCRIPTION</div>
            <div className="col-span-2">PARTY</div>
            <div className="col-span-2">CHALLAN NO.</div>
            <div className="col-span-1 text-center">TRIPS</div>
            <div className="col-span-2 text-right">AMOUNT</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-start mb-3">
              <div className="col-span-4 space-y-2">
                 <Input {...register(`services.${index}.vehicle`)} placeholder="Vehicle No." className="text-sm"/>
                 <div className="flex gap-2">
                    <Input {...register(`services.${index}.from`)} placeholder="From" className="text-sm"/>
                    <Input {...register(`services.${index}.to`)} placeholder="To" className="text-sm"/>
                 </div>
              </div>
              <Input {...register(`services.${index}.party`)} placeholder="Party Name" className="col-span-2 text-sm"/>
              <Input {...register(`services.${index}.challan_number`)} placeholder="Challan No." className="col-span-2 text-sm"/>
              <Input type="number" {...register(`services.${index}.trips`)} defaultValue={1} className="col-span-1 text-sm text-center"/>
              <Input type="number" {...register(`services.${index}.amount`)} placeholder="0" className="col-span-2 text-sm text-right"/>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="col-span-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {errors.services && <p className="text-destructive text-xs mt-2">{errors.services?.message || errors.services?.root?.message}</p>}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ party: "", challan_number: "", vehicle: "", from: "", to: "", trips: 1, amount: 0 })} className="mt-4">
            <Plus className="h-4 w-4 mr-2"/> Add Service
          </Button>
        </div>
        
        {/* Totals */}
        <div className="flex justify-end mb-10">
            <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <Label htmlFor="advance" className="text-muted-foreground">Advance:</Label>
                    <Input id="advance" type="number" {...register("advance")} className="w-32 text-right font-medium" placeholder="0" />
                </div>
                <div className="border-t my-2"></div>
                <div className="flex justify-between items-center text-xl font-bold" style={{ color: profile?.theme_color || 'hsl(var(--primary))' }}>
                    <Label>Total Amount:</Label>
                    <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-6 mt-6">
            <Button type="button" variant="outline" onClick={onDownloadPdf} disabled={isSubmitting}><Download className="h-4 w-4 mr-2"/> Download PDF</Button>
            <Button type="submit" disabled={isSubmitting}><Save className="h-4 w-4 mr-2"/>{isSubmitting ? "Saving..." : "Save Bill"}</Button>
        </div>
      </form>
    </div>
  );
}