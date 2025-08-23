import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from '@/integrations/supabase/types';

type Bill = Database['public']['Tables']['bills']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Helper function to fetch and convert an image to a Base64 string
const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Use a CORS proxy if you face cross-origin issues, but for Supabase Storage it should be fine.
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = (err) => reject(err);
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
};

export const generateInvoicePdf = async (bill: Bill, client: Client, profile: Profile) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const themeColor = profile.theme_color || '#1A2E44'; // A professional navy blue default

  // === Header Section ===
  // Add Logo
  if (profile.logo_url) {
    try {
        const logoBase64 = await loadImageAsBase64(profile.logo_url);
        doc.addImage(logoBase64, 'PNG', 15, 15, 45, 15); // x, y, width, height
    } catch (error) {
        console.error("Error loading logo image, ensure CORS is configured for the storage bucket.", error);
    }
  }

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(themeColor);
  doc.text('INVOICE', pageWidth - 20, 30, { align: 'right' });
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(themeColor);
  doc.line(15, 40, pageWidth - 15, 40);

  // === Billing Information Section ===
  let yPos = 50;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('Bill To:', 15, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50);
  doc.text(client.name, 15, yPos + 5);
  if (client.address) doc.text(client.address, 15, yPos + 10);
  if (client.contact) doc.text(client.contact, 15, yPos + 15);

  const invoiceDetails = [
      ['INVOICE #', bill.id.toString()],
      ['BILL DATE', bill.date],
      ['DUE DATE', bill.date] // Using bill date as due date for now
  ];
  
  autoTable(doc, {
    startY: yPos - 2,
    margin: { left: 110 },
    tableWidth: 85,
    theme: 'plain',
    styles: {
        fontSize: 9,
        cellPadding: { top: 1, right: 0, bottom: 1, left: 0 },
    },
    columnStyles: { 0: { fontStyle: 'bold' } },
    body: invoiceDetails,
  });

  // === Services Table ===
  const tableColumn = ["DESCRIPTION", "QTY", "RATE", "AMOUNT"];
  const tableRows: any[][] = [];

  const services = Array.isArray(bill.services) ? bill.services : [];
  let subtotal = 0;

  services.forEach((service: any) => {
    const itemTotal = (service.amount || 0) * (service.trips || 1);
    subtotal += itemTotal;
    const description = `Vehicle: ${service.vehicle}\nRoute: ${service.from} to ${service.to}\nChallan: ${service.challan_number || '-'}\nParty: ${service.party || '-'}`;
    
    const serviceData = [
      description,
      service.trips || 1,
      `₹${service.amount.toLocaleString('en-IN')}`,
      `₹${itemTotal.toLocaleString('en-IN')}`,
    ];
    tableRows.push(serviceData);
  });

  autoTable(doc, {
    startY: 95,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: themeColor,
      textColor: '#FFFFFF',
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: {
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
    },
    columnStyles: {
        0: { cellWidth: 96 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
    }
  });

  // === Totals Section ===
  const finalY = (doc as any).lastAutoTable.finalY;
  
  const totals = [
      ['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`],
      bill.advance && bill.advance > 0 ? ['Advance Paid', `-₹${bill.advance.toLocaleString('en-IN')}`] : [],
      ['Total Amount', `₹${bill.amount.toLocaleString('en-IN')}`]
  ];

  autoTable(doc, {
    startY: finalY + 10,
    margin: { left: 120 },
    tableWidth: 75,
    theme: 'plain',
    styles: {
        fontSize: 10,
        cellPadding: 2,
        halign: 'right',
    },
    columnStyles: { 
        0: { fontStyle: 'bold' } 
    },
    body: totals.filter(row => row.length > 0),
    didParseCell: (data) => {
        if (data.row.raw[0] === 'Total Amount') {
            data.cell.styles.fontSize = 12;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = themeColor;
        }
    }
  });


  // === Footer ===
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Notes', 15, pageHeight - 30);
  doc.setLineWidth(0.1);
  doc.line(15, pageHeight - 28, pageWidth - 15, pageHeight - 28);
  doc.setTextColor(80);
  doc.text('Thank you for your business!', 15, pageHeight - 20);

  // --- Save the PDF ---
  doc.save(`invoice-${bill.id}-${client.name}.pdf`);
};