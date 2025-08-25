import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller, UseFormReturn } from "react-hook-form";
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
import { useNavigate, useParams } from "react-router-dom";
// import { generateInvoicePdf } from "@/lib/pdfGenerator";

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
  trips: z.preprocess(val => (val ? Number(val) : 1), z.number().min(1, "Trips must be at least 1")),
  amount: z.preprocess(val => (val ? Number(val) : 0), z.number().min(0, "Amount must be positive")),
});

const billSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  advance: z.preprocess(val => (val ? Number(val) : 0), z.number().min(0).optional().nullable()),
  services: z.array(serviceSchema).min(1, "At least one service is required"),
});

type BillFormData = z.infer<typeof billSchema>;

// This is the visual component for the invoice
const InvoiceTemplate = ({ profile, client, clients, formMethods, isEditMode, billId }) => {
    const { register, control, watch, formState: { errors } } = formMethods;
    const { fields, append, remove } = useFieldArray({ control, name: "services" });

    const watchedServices = watch("services", []);
    const watchedAdvance = watch("advance");

    const subtotal = watchedServices.reduce((acc, service) => acc + (service.amount || 0) * (service.trips || 1), 0);
    const totalAmount = subtotal - (watchedAdvance || 0);

    return (
        <div id="invoice-content" className="max-w-4xl mx-auto bg-white p-12 rounded-lg shadow-lg border space-y-10">
            {/* Header */}
            <header className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: profile?.theme_color || '#1A2E44' }}>
                <div>
                    {profile?.logo_url ? (
                        <img src={profile.logo_url} alt="Company Logo" className="h-16 object-contain" />
                    ) : (
                        <h1 className="text-3xl font-bold text-gray-800">{profile?.company_name || "[Your Company Name]"}</h1>
                    )}
                </div>
                <div className="text-right">
                    <h1 className="text-5xl font-bold" style={{ color: profile?.theme_color || '#1A2E44' }}>INVOICE</h1>
                     <div className="text-gray-500 text-sm mt-2">
                        <p>{profile?.address || "[Your Address]"}</p>
                        <p>{profile?.phone || "[Your Phone]"}</p>
                        {profile?.gst_registered && <p>GSTIN: {profile?.gst_number || "[Your GSTIN]"}</p>}
                    </div>
                </div>
            </header>

            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-12">
                <div>
                    <h2 className="text-sm font-bold text-gray-500 mb-2">BILL TO</h2>
                     <Controller
                        name="client_id"
                        control={control}
                        render={({ field }) => (
                             <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {client && (
                        <div className="text-gray-600 text-sm mt-2">
                            <p>{client.address}</p>
                            <p>{client.contact}</p>
                        </div>
                    )}
                    {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id.message}</p>}
                </div>
                <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="font-bold text-gray-600">INVOICE #</span>
                        <span>{isEditMode ? billId : "PREVIEW"}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-600">BILL DATE</span>
                        <Input type="date" {...register("date")} className="text-right border-none p-0 h-auto w-32" />
                    </div>
                     <div className="flex justify-between">
                        <span className="font-bold text-gray-600">DUE DATE</span>
                        <span>{watch("date")}</span>
                    </div>
                </div>
            </div>

            {/* Services Table */}
            <div>
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-white py-2 px-4 rounded-t-md" style={{ backgroundColor: profile?.theme_color || '#1A2E44' }}>
                    <div className="col-span-4">DESCRIPTION</div>
                    <div className="col-span-2">PARTY</div>
                    <div className="col-span-2">CHALLAN NO.</div>
                    <div className="col-span-1 text-center">TRIPS</div>
                    <div className="col-span-2 text-right">AMOUNT</div>
                    <div className="col-span-1"></div>
                </div>
                <div className="border-l border-r">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-start p-3 border-b">
                            <div className="col-span-4">
                                <Input {...register(`services.${index}.vehicle`)} placeholder="Vehicle No." className="text-sm mb-1"/>
                                <div className="flex gap-1">
                                    <Input {...register(`services.${index}.from`)} placeholder="From" className="text-sm"/>
                                    <Input {...register(`services.${index}.to`)} placeholder="To" className="text-sm"/>
                                </div>
                            </div>
                            <Input {...register(`services.${index}.party`)} placeholder="Party Name" className="col-span-2 text-sm"/>
                            <Input {...register(`services.${index}.challan_number`)} placeholder="Challan No." className="col-span-2 text-sm"/>
                            <Input type="number" {...register(`services.${index}.trips`)} className="col-span-1 text-sm text-center"/>
                            <Input type="number" {...register(`services.${index}.amount`)} className="col-span-2 text-sm text-right"/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="col-span-1 text-red-500 hover:text-red-700 remove-btn">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ party: "", challan_number: "", vehicle: "", from: "", to: "", trips: 1, amount: 0 })} className="mt-4">
                    <Plus className="h-4 w-4 mr-2"/> Add Service
                </Button>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-1/2 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Subtotal:</span>
                        <span className="text-gray-800">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <Label htmlFor="advance" className="font-semibold text-gray-600">Advance:</Label>
                        <Input id="advance" type="number" {...register("advance")} className="w-28 text-right font-semibold" />
                    </div>
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between">
                        <span className="font-bold text-xl" style={{ color: profile?.theme_color || '#1A2E44' }}>Total Amount:</span>
                        <span className="font-bold text-xl" style={{ color: profile?.theme_color || '#1A2E44' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function CreateBillPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { billId } = useParams();
  const isEditMode = Boolean(billId);

  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const formMethods = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      services: [{ party: "", challan_number: "", vehicle: "", from: "", to: "", trips: 1, amount: 0 }],
      advance: 0,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: clientData } = await supabase.from("clients").select("*");
      setClients(clientData || []);
      
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(profileData);

      if (isEditMode) {
          const { data: billData } = await supabase.from("bills").select("*").eq("id", billId).single();
          if (billData) {
              formMethods.reset({
                  ...billData,
                  client_id: billData.client_id.toString(),
                  services: Array.isArray(billData.services) ? billData.services : [],
              });
          }
      }
    };
    fetchData();
  }, [user, isEditMode, billId, formMethods]);
  
  const watchedClientId = formMethods.watch("client_id");
  useEffect(() => {
      const client = clients.find(c => c.id.toString() === watchedClientId);
      setSelectedClient(client || null);
  }, [watchedClientId, clients]);


  const onSaveBill = async (data: BillFormData) => {
    if (!user || !selectedClient) {
        toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
        return;
    }
    const subtotal = data.services.reduce((acc, service) => acc + (service.amount || 0) * (service.trips || 1), 0);
    const totalAmount = subtotal - (data.advance || 0);

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

    if (isEditMode) {
        const { error } = await supabase.from("bills").update(billData).eq("id", billId);
        if (error) {
            toast({ title: "Error updating bill", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Bill Updated!", description: "The bill has been updated successfully." });
            navigate("/bills");
        }
    } else {
        const { error } = await supabase.from("bills").insert([billData]);
        if (error) {
            toast({ title: "Error saving bill", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Bill Saved!", description: "The bill has been saved successfully." });
            navigate("/bills");
        }
    }
  };

  const onDownloadPdf = () => {
      const currentBillData = formMethods.getValues();
      if (!selectedClient || !profile) {
          toast({ title: "Missing Information", description: "Please select a client and complete your profile first.", variant: "destructive" });
          return;
      }
      const subtotal = currentBillData.services.reduce((acc, service) => acc + (service.amount || 0) * (service.trips || 1), 0);
      const totalAmount = subtotal - (currentBillData.advance || 0);

      const billForPdf: Bill = {
          id: isEditMode ? parseInt(billId) : 0,
          created_at: new Date().toISOString(),
          client_id: selectedClient.id,
          client: selectedClient.name,
          date: currentBillData.date,
          services: currentBillData.services,
          advance: currentBillData.advance || 0,
          amount: totalAmount,
          status: 'unpaid',
          user_id: user.id
      };
      
      // generateInvoicePdf(billForPdf, selectedClient, profile);
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
        <InvoiceTemplate 
            profile={profile}
            client={selectedClient}
            clients={clients}
            formMethods={formMethods}
            isEditMode={isEditMode}
            billId={billId}
        />
        <div className="max-w-4xl mx-auto flex justify-end gap-2 mt-8">
            <Button variant="outline" onClick={onDownloadPdf}><Download className="h-4 w-4 mr-2"/> Download PDF</Button>
            <Button onClick={formMethods.handleSubmit(onSaveBill)}><Save className="h-4 w-4 mr-2"/> {isEditMode ? "Update Bill" : "Save Bill"}</Button>
        </div>
    </div>
  );
}
