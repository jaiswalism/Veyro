import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from '@/integrations/supabase/types';

type Bill = Database['public']['Tables']['bills']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export const generateInvoicePdf = (bill: Bill, client: Client, profile: Profile) => {
  const doc = new jsPDF();

  // Company Details
  doc.setFontSize(20);
  doc.text(profile.company_name || 'Your Company', 14, 22);
  doc.setFontSize(10);
  doc.text(profile.address || '', 14, 30);
  doc.text(profile.phone || '', 14, 35);
  if (profile.gst_registered && profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, 14, 40);
  }

  // Bill To Details
  doc.setFontSize(12);
  doc.text('Bill To:', 14, 60);
  doc.setFontSize(10);
  doc.text(client.name, 14, 66);
  doc.text(client.address || '', 14, 71);
  doc.text(client.contact || '', 14, 76);
  if (client.gst) {
    doc.text(`GSTIN: ${client.gst}`, 14, 81);
  }

  // Invoice Details
  doc.setFontSize(12);
  doc.text(`Invoice #: ${bill.id}`, 140, 60);
  doc.text(`Invoice Date: ${bill.date}`, 140, 66);
  doc.text(`Status: ${bill.status.toUpperCase()}`, 140, 72);

  // Table of Services
  const tableColumn = ["#", "Party", "Challan No.", "Vehicle", "From", "To", "Trips", "Amount"];
  const tableRows: any[][] = [];

  const services = Array.isArray(bill.services) ? bill.services : [];
  let subtotal = 0;

  services.forEach((service: any, index: number) => {
    const itemTotal = (service.amount || 0) * (service.trips || 1);
    subtotal += itemTotal;
    const serviceData = [
      index + 1,
      service.party || '-',
      service.challan_number || '-',
      service.vehicle,
      service.from,
      service.to,
      service.trips || 1,
      itemTotal.toLocaleString('en-IN'),
    ];
    tableRows.push(serviceData);
  });

  autoTable(doc, {
    startY: 90,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [38, 50, 56] },
  });

  // Totals Section
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(10);
  let yPos = finalY + 10;

  doc.text(`Subtotal:`, 140, yPos);
  doc.text(subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), 190, yPos, { align: 'right' });
  yPos += 6;

  if (bill.advance && bill.advance > 0) {
    doc.text(`Advance:`, 140, yPos);
    doc.text(bill.advance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), 190, yPos, { align: 'right' });
    yPos += 6;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount:`, 140, yPos);
  doc.text(bill.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), 190, yPos, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 14, doc.internal.pageSize.height - 10);

  // Save the PDF
  doc.save(`invoice-${bill.id}-${client.name}.pdf`);
};