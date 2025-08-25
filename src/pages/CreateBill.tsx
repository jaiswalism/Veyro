import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from 'react-dom/client';
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
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2pdf from 'html2pdf.js';

type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

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

// The interactive template you see on the screen
const InvoiceTemplate = ({ profile, client, clients, formMethods, isEditMode, billId }) => {
    const { register, control, watch, formState: { errors } } = formMethods;
    const { fields, append, remove } = useFieldArray({ control, name: "services" });
    const watchedServices = watch("services", []);
    const watchedAdvance = watch("advance");
    const subtotal = watchedServices.reduce((acc, service) => acc + (service.amount || 0) * (service.trips || 1), 0);
    const totalAmount = subtotal - (watchedAdvance || 0);

    return (
        <div className="max-w-4xl mx-auto bg-white p-12 rounded-lg shadow-lg border space-y-10">
            <header className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: profile?.theme_color || '#1A2E44' }}>
                <div>
                    {profile?.logo_url ? (
                        <img src={profile.logo_url} alt="Company Logo" className="h-16 object-contain" />
                    ) : (
                        <h1 className="text-3xl font-bold text-gray-800">{profile?.company_name || "[Your Company Name]"}</h1>
                    )}
                     <div className="text-gray-500 text-sm mt-2">
                        <p>{profile?.address || "[Your Address]"}</p>
                        <p>{profile?.phone || "[Your Phone]"}</p>
                        {profile?.gst_registered && <p>GSTIN: {profile?.gst_number || "[Your GSTIN]"}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-5xl font-bold" style={{ color: profile?.theme_color || '#1A2E44' }}>INVOICE</h1>
                </div>
            </header>

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
                <div className="text-sm space-y-2 text-right">
                    <div className="grid grid-cols-2">
                        <span className="font-bold text-gray-600">INVOICE #</span>
                        <span className="text-gray-800">{isEditMode ? billId : "PREVIEW"}</span>
                    </div>
                     <div className="grid grid-cols-2 items-center">
                        <span className="font-bold text-gray-600">BILL DATE</span>
                        <Input type="date" {...register("date")} className="text-right" />
                    </div>
                     <div className="grid grid-cols-2">
                        <span className="font-bold text-gray-600">DUE DATE</span>
                        <span className="text-gray-800">{watch("date")}</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-white py-2 px-4 rounded-t-md" style={{ backgroundColor: profile?.theme_color || '#1A2E44' }}>
                    <div className="col-span-4">DESCRIPTION</div>
                    <div className="col-span-2">PARTY</div>
                    <div className="col-span-2">CHALLAN NO.</div>
                    <div className="col-span-1 text-center">TRIPS</div>
                    <div className="col-span-2 text-right">AMOUNT</div>
                    <div className="col-span-1"></div>
                </div>
                <div className="border-l border-r rounded-b-md">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-center p-3 border-b last:border-b-0">
                            <div className="col-span-4">
                                <Input {...register(`services.${index}.vehicle`)} placeholder="Vehicle No." className="text-sm mb-1"/>
                                <div className="flex gap-1 items-center">
                                    <Input {...register(`services.${index}.from`)} placeholder="From" className="text-sm"/>
                                    <span>-</span>
                                    <Input {...register(`services.${index}.to`)} placeholder="To" className="text-sm"/>
                                </div>
                            </div>
                            <Input {...register(`services.${index}.party`)} placeholder="Party Name" className="col-span-2 text-sm"/>
                            <Input {...register(`services.${index}.challan_number`)} placeholder="Challan No." className="col-span-2 text-sm"/>
                            <Input type="number" {...register(`services.${index}.trips`)} className="col-span-1 text-sm text-center"/>
                            <Input type="number" {...register(`services.${index}.amount`)} className="col-span-2 text-sm text-right"/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="col-span-1 text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ party: "", challan_number: "", vehicle: "", from: "", to: "", trips: 1, amount: 0 })} className="mt-4">
                    <Plus className="h-4 w-4 mr-2"/> Add Service
                </Button>
            </div>

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

// A clean, static component exclusively for PDF generation
const InvoicePDFTemplate = ({ profile, client, billData, billId, onRendered }) => {
    useEffect(() => {
        if (onRendered) onRendered();
    }, [onRendered]);

    const subtotal = billData.services.reduce((acc, service) => acc + (service.amount || 0) * (service.trips || 1), 0);
    const totalAmount = subtotal - (billData.advance || 0);

    return (
        <div style={{ fontFamily: 'sans-serif', fontSize: '14px', color: '#374151' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '24px', borderBottom: `2px solid ${profile?.theme_color || '#1A2E44'}` }}>
                <div style={{ textAlign: 'left' }}>
                    {profile?.logo_url ? <img src={profile.logo_url} alt="Logo" style={{ height: '64px', objectFit: 'contain', marginBottom: '16px' }} /> : <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{profile?.company_name}</h1>}
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        <p style={{ margin: 0 }}>{profile?.address}</p>
                        <p style={{ margin: '4px 0 0 0' }}>{profile?.phone}</p>
                        {profile?.gst_registered && <p style={{ margin: '4px 0 0 0' }}>GSTIN: {profile?.gst_number}</p>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: profile?.theme_color || '#1A2E44', margin: 0, lineHeight: '1' }}>INVOICE</h1>
                </div>
            </header>

            <table style={{ width: '100%', marginTop: '40px', marginBottom: '40px', fontSize: '14px' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '50%' }}>
                            <p style={{ fontWeight: 'bold', color: '#6B7280', marginBottom: '8px', margin: 0 }}>BILL TO</p>
                            <p style={{ fontWeight: '600', fontSize: '18px', margin: '4px 0 0 0' }}>{client?.name}</p>
                            <p style={{ color: '#6B7280', margin: '4px 0 0 0' }}>{client?.address}</p>
                            <p style={{ color: '#6B7280', margin: '4px 0 0 0' }}>{client?.contact}</p>
                        </td>
                        <td style={{ verticalAlign: 'top', width: '50%'}}>
                            <table style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ paddingBottom: '8px', fontWeight: 'bold', color: '#6B7280', paddingRight: '16px' }}>INVOICE #</td>
                                        <td style={{ paddingBottom: '8px' }}>{billId || 'PREVIEW'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingBottom: '8px', fontWeight: 'bold', color: '#6B7280', paddingRight: '16px' }}>BILL DATE</td>
                                        <td style={{ paddingBottom: '8px' }}>{billData.date}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 'bold', color: '#6B7280', paddingRight: '16px' }}>DUE DATE</td>
                                        <td>{billData.date}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead >
                    <tr style={{ backgroundColor: profile?.theme_color || '#1A2E44', color: 'white' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', width: '34%', borderTopLeftRadius: '8px' }}>DESCRIPTION</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', width: '18%' }}>PARTY</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', width: '18%' }}>CHALLAN NO.</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', width: '10%' }}>TRIPS</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', width: '20%', borderTopRightRadius: '8px' }}>AMOUNT</th>
                    </tr>
                 </thead>
                 <tbody>
                    {billData.services.map((service, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #E5E7EB' }}>
                            <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                <p style={{ fontWeight: '500', fontSize: '14px', margin: 0 }}>{service.vehicle}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>{service.from} - {service.to}</p>
                            </td>
                            <td style={{ padding: '12px', verticalAlign: 'top', fontSize: '14px' }}>{service.party}</td>
                            <td style={{ padding: '12px', verticalAlign: 'top', fontSize: '14px' }}>{service.challan_number}</td>
                            <td style={{ padding: '12px', verticalAlign: 'top', textAlign: 'center', fontSize: '14px' }}>{service.trips}</td>
                            <td style={{ padding: '12px', verticalAlign: 'top', textAlign: 'right', fontSize: '14px' }}>₹{service.amount?.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                 </tbody>
            </table>

            <table style={{ width: '100%', marginTop: '24px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '50%' }}></td>
                        <td style={{ width: '50%' }}>
                            <table style={{ width: '100%' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ paddingBottom: '8px', fontWeight: '600', color: '#6B7280' }}>Subtotal:</td>
                                        <td style={{ paddingBottom: '8px', textAlign: 'right' }}>₹{subtotal.toLocaleString('en-IN')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingBottom: '8px', fontWeight: '600', color: '#6B7280' }}>Advance:</td>
                                        <td style={{ paddingBottom: '8px', textAlign: 'right' }}>₹{(billData.advance || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} style={{ paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}></td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingTop: '8px', fontWeight: 'bold', fontSize: '20px', color: profile?.theme_color || '#1A2E44' }}>Total Amount:</td>
                                        <td style={{ paddingTop: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px', color: profile?.theme_color || '#1A2E44' }}>₹{totalAmount.toLocaleString('en-IN')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default function CreateBillPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { billId } = useParams();
  const location = useLocation();
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

  const onDownloadPdf = useCallback(async () => {
    const currentBillData = formMethods.getValues();
    if (!selectedClient || !profile) {
        toast({ title: "Missing Information", description: "Please select a client and ensure profile is complete.", variant: "destructive" });
        return;
    }

    const pdfContainer = document.createElement('div');
    document.body.appendChild(pdfContainer);
    const root = ReactDOM.createRoot(pdfContainer);
    
    const renderPromise = new Promise<void>((resolve) => {
        root.render(
            <React.StrictMode>
                <InvoicePDFTemplate
                    profile={profile}
                    client={selectedClient}
                    billData={currentBillData}
                    billId={billId}
                    onRendered={() => resolve()}
                />
            </React.StrictMode>
        );
    });

    await renderPromise;

    const opt = {
      margin: 0.5,
      filename: `invoice-${billId || 'new'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().from(pdfContainer).set(opt).save();

    root.unmount();
    document.body.removeChild(pdfContainer);

  }, [billId, profile, selectedClient, toast, formMethods]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('download') === 'true' && profile && selectedClient) {
      const timer = setTimeout(() => {
        onDownloadPdf();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.search, profile, selectedClient, onDownloadPdf]);

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