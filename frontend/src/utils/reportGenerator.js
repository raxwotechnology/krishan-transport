import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../logo.png';

export const generatePDFReport = ({ title, columns, data, filename }) => {
  const doc = new jsPDF();
  
  const drawReportContent = (logoBase64, imgW = 0, imgH = 0) => {
    // ---- HEADER ----
    const pageWidth = doc.internal.pageSize.width;
    let textStartX = 14;

    if (logoBase64 && imgW > 0 && imgH > 0) {
      // Center logo vertically in the 30mm header space
      const logoY = 10 + (22 - imgH) / 2; 
      doc.addImage(logoBase64, 'PNG', 14, logoY, imgW, imgH, undefined, 'FAST');
      textStartX = 14 + imgW + 6; // Move text to the right of the logo
    }
    
    // Company Title
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Professional Blue
    doc.setFont('helvetica', 'bold');
    doc.text('Krishan Transport', textStartX, 20);

    // Subtitle / Slogan
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    doc.text('Reliable & Secure Transport Solutions', textStartX, 26);
    
    // Company Contact aligned to Right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // Using a darker grey for better contrast and print readability
    doc.setTextColor(60); 
    doc.text('123 Main Street, Colombo', pageWidth - 14, 16, { align: 'right' });
    doc.text('Phone: +94 77 123 4567', pageWidth - 14, 21, { align: 'right' });
    doc.text('Email: info@krishantransport.com', pageWidth - 14, 26, { align: 'right' });
    
    // Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);
    
    // ---- REPORT TITLE & DATE ----
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 44);
    
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date & Time: ${new Date().toLocaleString()}`, pageWidth - 14, 44, { align: 'right' });
    
    // ---- TABLE ----
    autoTable(doc, {
      startY: 50,
      head: [columns],
      body: data,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        font: 'helvetica',
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: { 
        fillColor: [37, 99, 235], // Blue Header
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [249, 250, 251] 
      },
      margin: { top: 50, left: 14, right: 14, bottom: 20 },
      didDrawPage: (hookData) => {
        // Footer section for each page
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Krishan Transport System - Confidential Report', 14, pageHeight - 10);
        doc.text(`Page | ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    });

    // Save PDF
    const finalFilename = filename || `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
    doc.save(finalFilename);
  };

  // Process Logo Image
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = logoUrl;
  
  img.onload = () => {
    try {
      // Draw to canvas to get base64 and resize to avoid giant PDF file sizes
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200; 
      let scaleSize = 1;
      
      if (img.width > MAX_WIDTH) {
        scaleSize = MAX_WIDTH / img.width;
      }
      
      canvas.width = img.width * scaleSize;
      canvas.height = img.height * scaleSize;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      
      // Calculate dimensions in mm for PDF (max width 35mm, max height 22mm)
      let pdfW = 35; 
      let pdfH = (img.height / img.width) * pdfW;
      
      if (pdfH > 22) {
        pdfH = 22;
        pdfW = (img.width / img.height) * pdfH;
      }
      
      drawReportContent(dataUrl, pdfW, pdfH);
    } catch (error) {
      console.warn("Could not generate base64 logo for PDF", error);
      drawReportContent(null);
    }
  };
  
  img.onerror = () => {
    console.warn("Logo failed to load for PDF");
    drawReportContent(null);
  };
};
