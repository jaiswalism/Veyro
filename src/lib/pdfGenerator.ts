import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from '@/integrations/supabase/types';

type Bill = Database['public']['Tables']['bills']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Helper function to fetch and convert the logo image to Base64
const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            const reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
};

export const generateInvoicePdf = async (bill: Bill, client: Client, profile: Profile) => {
  const doc = new jsPDF();
  const themeColor = profile.theme_color || '#1A2E44'; // A professional navy blue default

  // === Header Section ===
  if (profile.logo_url) {
    try {
        const logoBase64 = await loadImageAsBase64(profile.logo_url);
        doc.addImage(logoBase64, 'PNG', 14, 15, 40, 15); // Adjust size as needed
    } catch (error) {
        console.error("Error loading logo image:", error);
    }
  }

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(themeColor);
  doc.text('INVOICE', 200, 25, { align: 'right' });

  // --- Company Details ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(profile.company_name || 'Your Company', 200, 35, { align: 'right' });
  doc.text(profile.address || '', 200, 40, { align: 'right' });
  doc.text(profile.phone || '', 200, 45, { align: 'right' });
  if (profile.gst_registered && profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, 200, 50, { align: 'right' });
  }

  // === Billing Information Section ===
  doc.setLineWidth(0.1);
  doc.line(14, 60, 200, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('BILL TO', 14, 68);
  doc.text('INVOICE #', 110, 68);
  doc.text('DATE', 140, 68);
  doc.text('DUE DATE', 170, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(client.name, 14, 74);
  doc.text(bill.id.toString(), 110, 74);
  doc.text(bill.date, 140, 74);
  doc.text(bill.date, 170, 74); // Using bill date as due date for now
  
  doc.line(14, 80, 200, 80);

  // === Services Table ===
  const tableColumn = ["PARTY/CONSIGNEE", "CHALLAN NO.", "VEHICLE", "FROM → TO", "TRIPS", "AMOUNT (INR)"];
  const tableRows: any[][] = [];

  const services = Array.isArray(bill.services) ? bill.services : [];
  let subtotal = 0;

  services.forEach((service: any) => {
    const itemTotal = (service.amount || 0) * (service.trips || 1);
    subtotal += itemTotal;
    const serviceData = [
      service.party || '-',
      service.challan_number || '-',
      service.vehicle,
      `${service.from} to ${service.to}`,
      service.trips || 1,
      itemTotal.toLocaleString('en-IN'),
    ];
    tableRows.push(serviceData);
  });

  autoTable(doc, {
    startY: 85,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: themeColor,
      textColor: '#FFFFFF',
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
        fontSize: 8,
        cellPadding: 2,
    },
    columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
    }
  });

  // === Totals Section ===
  const finalY = (doc as any).lastAutoTable.finalY;
  let yPos = finalY + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  doc.text('Subtotal:', 140, yPos);
  doc.text(subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), 200, yPos, { align: 'right' });
  yPos += 7;

  if (bill.advance && bill.advance > 0) {
    doc.text('Advance Paid:', 140, yPos);
    doc.text(`-${bill.advance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 200, yPos, { align: 'right' });
    yPos += 7;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(themeColor);
  doc.text('Total Amount:', 140, yPos);
  doc.text(bill.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), 200, yPos, { align: 'right' });

  // === Footer ===
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Notes', 14, doc.internal.pageSize.height - 25);
  doc.setTextColor(80, 80, 80);
  doc.text('Thank you for your business!', 14, doc.internal.pageSize.height - 20);

  // --- Save the PDF ---
  doc.save(`invoice-${bill.id}-${client.name}.pdf`);
};