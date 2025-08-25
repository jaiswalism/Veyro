import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import html2pdf from 'html2pdf.js';
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";


type Bill = Database['public']['Tables']['bills']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// --- PDF Template Components ---

const ReportPDFTemplate = ({ profile, title, children, onRendered }) => {
    useEffect(() => {
        if (onRendered) onRendered();
    }, [onRendered]);

    return (
        <div style={{ fontFamily: 'sans-serif', fontSize: '12px', padding: '40px', color: '#374151' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '24px', borderBottom: `2px solid ${profile?.theme_color || '#1A2E44'}` }}>
                <div style={{ textAlign: 'left' }}>
                    {profile?.display_logo && profile?.logo_url ? (
                        <img src={profile.logo_url} alt="Logo" style={{ height: '64px', objectFit: 'contain', marginBottom: '16px' }} />
                    ) : (
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: profile?.theme_color || '#1A2E44' }}>{profile?.company_name}</h1>
                    )}
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        <p style={{ margin: 0 }}>{profile?.address}</p>
                        <p style={{ margin: '4px 0 0 0' }}>{profile?.phone}</p>
                        {profile?.gst_registered && <p style={{ margin: '4px 0 0 0' }}>GSTIN: {profile?.gst_number}</p>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                     <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>{title}</h1>
                     <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>Generated on: {format(new Date(), 'dd MMM yyyy')}</p>
                </div>
            </header>
            <main style={{ marginTop: '24px' }}>
                {children}
            </main>
        </div>
    );
};

const SimpleTablePDF = ({ profile, title, data, headers, onRendered }) => (
    <ReportPDFTemplate title={title} profile={profile} onRendered={onRendered}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                    {headers.map(h => <th key={h.key} style={{ padding: '8px', border: '1px solid #E5E7EB', textAlign: 'left', fontSize: '12px' }}>{h.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        {headers.map(h => <td key={h.key} style={{ padding: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}>{row[h.key]}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </ReportPDFTemplate>
);


// --- Main Reports Component ---

export default function Reports() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    avgBillValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([]);
  const { toast } = useToast()
  
  // State for custom report generator and the new client dropdown
  const [reportType, setReportType] = useState("monthly_income");
  const [dateRange, setDateRange] = useState("this_year");
  const [selectedClientForCustom, setSelectedClientForCustom] = useState("all");
  const [selectedClientForCard, setSelectedClientForCard] = useState("all");
  const [customReportType, setCustomReportType] = useState('outstanding_in_range');
  const [customDatePreset, setCustomDatePreset] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
        setProfile(profileData);
      }

      const { data: clientsData, error: clientsError } = await supabase.from("clients").select("*");
      if (clientsError) {
          toast({ title: "Error fetching clients", description: clientsError.message, variant: "destructive" });
      } else {
          setClients(clientsData || []);
          if (clientsData && clientsData.length > 0) {
              setSelectedClientForCard(clientsData[0].id.toString());
              setSelectedClientForCustom(clientsData[0].id.toString());
          }
      }

      const { data: bills, error } = await supabase.from("bills").select("*");

      if (error) {
        toast({ title: "Error fetching reports data", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (bills) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyBills = bills.filter(b => {
          const billDate = new Date(b.date);
          return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        });
        const monthlyRevenue = monthlyBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount ?? 0), 0);

        const yearlyBills = bills.filter(b => new Date(b.date).getFullYear() === currentYear);
        const yearlyRevenue = yearlyBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount ?? 0), 0);

        const paidBills = bills.filter(b => b.status === 'paid').length;
        const pendingBills = bills.length - paidBills;
        const avgBillValue = paidBills > 0 ? yearlyRevenue / paidBills : 0;

        setStats({ monthlyRevenue, yearlyRevenue, totalBills: bills.length, paidBills, pendingBills, avgBillValue });
      }
      setLoading(false);
    }
    fetchData();
  }, [toast, user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  }
  
  const generateAndDownloadPdf = useCallback(async (title, filename, data, headers) => {
    if (!profile) {
        toast({ title: "Profile not loaded", description: "Please wait for your profile to load before exporting.", variant: "destructive" });
        return;
    }

    const pdfContainer = document.createElement('div');
    document.body.appendChild(pdfContainer);
    const root = ReactDOM.createRoot(pdfContainer);
    
    const renderPromise = new Promise<void>((resolve) => {
        root.render(
            <React.StrictMode>
                <SimpleTablePDF profile={profile} title={title} data={data} headers={headers} onRendered={() => resolve()} />
            </React.StrictMode>
        );
    });

    await renderPromise;

    const opt = {
      margin: 0.5,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().from(pdfContainer).set(opt).save();

    root.unmount();
    document.body.removeChild(pdfContainer);
  }, [profile, toast]);

  const handleExport = async (reportName: string, clientId: string = "all") => {
    toast({ title: "Generating Report...", description: "Please wait while we prepare your PDF." });
    
    if (!profile) {
        toast({ title: "Error", description: "Profile data is not loaded yet. Please wait a moment and try again.", variant: "destructive" });
        return;
    }

    const { data: bills, error: billsError } = await supabase.from("bills").select("*");
    const { data: clients, error: clientsError } = await supabase.from("clients").select("*");

    if (billsError || clientsError || !bills || !clients) {
        toast({ title: "Error", description: "Could not fetch data for the report.", variant: "destructive" });
        return;
    }

    let dataToExport: any[] = [];
    let headers: { key: string, label: string }[] = [];
    let title = "";

    switch (reportName) {
        case 'monthly_income':
            title = "Monthly Income Summary";
            headers = [{ key: 'Month', label: 'Month' }, { key: 'Revenue', label: 'Revenue (INR)' }];
            const monthlyData = bills.filter(b => b.status === 'paid').reduce((acc, bill) => {
                const month = format(new Date(bill.date), 'MMM yyyy');
                acc[month] = (acc[month] || 0) + (bill.amount || 0);
                return acc;
            }, {});
            dataToExport = Object.keys(monthlyData).map(month => ({ Month: month, Revenue: formatCurrency(monthlyData[month]) }));
            break;
        case 'yearly_revenue':
            title = "Yearly Revenue Report";
            headers = [{ key: 'id', label: 'Bill ID' }, { key: 'client', label: 'Client' }, { key: 'date', label: 'Date' }, { key: 'amount', label: 'Amount' }];
            const currentYear = new Date().getFullYear();
            dataToExport = bills.filter(b => new Date(b.date).getFullYear() === currentYear && b.status === 'paid').map(b => ({...b, amount: formatCurrency(b.amount)}));
            break;
        case 'outstanding_payments':
            title = "Outstanding Payments";
            headers = [{ key: 'id', label: 'Bill ID' }, { key: 'client', label: 'Client' }, { key: 'due_date', label: 'Due Date' }, { key: 'amount', label: 'Amount' }];
            let outstandingBills = bills.filter(b => b.status !== 'paid');
            if (clientId !== "all") {
                outstandingBills = outstandingBills.filter(b => b.client_id === parseInt(clientId));
                const clientName = clients.find(c => c.id === parseInt(clientId))?.name;
                title = `Outstanding Payments for ${clientName}`;
            }
            dataToExport = outstandingBills.map(b => ({...b, amount: formatCurrency(b.amount)}));
            break;
        case 'client_outstanding':
            if (clientId === "all") {
                toast({title: "Please select a client", description: "Select a client from the dropdown to generate this report.", variant: "destructive"});
                return;
            }
            const clientName = clients.find(c => c.id === parseInt(clientId))?.name;
            title = `Outstanding Payments for ${clientName}`;
            headers = [{ key: 'id', label: 'Bill ID' }, { key: 'date', label: 'Bill Date' }, { key: 'due_date', label: 'Due Date' }, { key: 'amount', label: 'Amount' }];
            dataToExport = bills
                .filter(b => b.status !== 'paid' && b.client_id === parseInt(clientId))
                .map(b => ({ id: b.id, date: b.date, due_date: b.due_date, amount: formatCurrency(b.amount) }));
            break;
        case 'service_history':
             title = "Service History";
             headers = [{key: 'bill_id', label: 'Bill ID'}, {key: 'date', label: 'Date'}, {key: 'client', label: 'Client'}, {key: 'vehicle', label: 'Vehicle'}, {key: 'from', label: 'From'}, {key: 'to', label: 'To'}, {key: 'amount', label: 'Amount'}];
             dataToExport = bills.flatMap(b => (b.services as any[])?.map(s => ({ bill_id: b.id, date: b.date, client: b.client, ...s, amount: formatCurrency(s.amount) })) || []);
            break;
        case 'client_performance':
            title = "Client Performance";
            headers = [{key: 'client_name', label: 'Client'}, {key: 'total_bills', label: 'Total Bills'}, {key: 'paid_bills', label: 'Paid'}, {key: 'unpaid_bills', label: 'Unpaid'}, {key: 'total_revenue', label: 'Total Revenue'}];
            dataToExport = clients.map(client => {
                const clientBills = bills.filter(b => b.client_id === client.id);
                const paidBills = clientBills.filter(b => b.status === 'paid');
                return {
                    client_name: client.name,
                    total_bills: clientBills.length,
                    paid_bills: paidBills.length,
                    unpaid_bills: clientBills.length - paidBills.length,
                    total_revenue: formatCurrency(paidBills.reduce((sum, b) => sum + (b.amount || 0), 0))
                }
            });
            break;
        default:
            toast({ title: "Error", description: "Unknown report type.", variant: "destructive" });
            return;
    }
    
    if (dataToExport.length === 0) {
        toast({ title: "No Data", description: "No data available to export for this selection." });
        return;
    }

    generateAndDownloadPdf(title, reportName, dataToExport, headers);
  }

  const handleDatePresetChange = (preset: string) => {
    setCustomDatePreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
        setCustomStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setCustomEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'last_month') {
        const lastMonth = subMonths(now, 1);
        setCustomStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setCustomEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
    } else if (preset === 'this_year') {
        setCustomStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
        setCustomEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
    }
  };

  const handleCustomReport = async () => {
    let { data, error } = await supabase.from('bills').select('*')
        .gte('date', customStartDate)
        .lte('date', customEndDate);

    if (error || !data) {
        toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
        return;
    }
    
    // ... logic for custom report generation
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate comprehensive reports and analytics for your transport business.
        </p>
      </div>

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
      
      <div className="grid gap-6 md:grid-cols-2">
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
              <Button variant="outline" size="sm" onClick={() => handleExport('monthly_income')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Yearly Revenue Report</h3>
                <p className="text-sm text-muted-foreground">Complete yearly financial overview</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('yearly_revenue')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Outstanding Payments (All)</h3>
                <p className="text-sm text-muted-foreground">All unpaid bills</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('outstanding_payments', 'all')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Client Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-medium text-foreground">Client-wise Outstanding</h3>
                        <p className="text-sm text-muted-foreground">Outstanding bills for a specific client</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport('client_outstanding', selectedClientForCard)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Client</label>
                    <select 
                        className="w-full mt-1 p-2 border border-border rounded-md bg-background text-sm"
                        value={selectedClientForCard}
                        onChange={e => setSelectedClientForCard(e.target.value)}
                    >
                        <option value="all" disabled>Select a client</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Service History</h3>
                <p className="text-sm text-muted-foreground">Detailed service logs and routes</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('service_history')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-medium text-foreground">Client Performance</h3>
                <p className="text-sm text-muted-foreground">Payment behavior and frequency</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport('client_performance')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Custom Date Range Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground">Report Type</label>
              <select className="w-full mt-1 p-2 border border-border rounded-md bg-background" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="outstanding_in_range">Outstanding in Range</option>
                <option value="service_history_in_range">Service History in Range</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <select className="w-full mt-1 p-2 border border-border rounded-md bg-background" value={customDatePreset} onChange={e => handleDatePresetChange(e.target.value)}>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {customDatePreset === 'custom' && (
                <div className="flex items-center gap-2">
                    <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                    <span>to</span>
                    <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleCustomReport}>
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}