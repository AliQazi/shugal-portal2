import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Register from '../models/Register.js';

// Export users to PDF
export const exportUsersToPDF = async (req, res) => {
  try {
    const { 
      searchTerm = '', 
      city = 'All', 
      status = 'All' 
    } = req.query;

    // Build query for filtering
    let query = { role: 'Agency' };

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { companyName: { $regex: searchTerm, $options: 'i' } },
        { agencyCode: { $regex: searchTerm, $options: 'i' } },
        { city: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (city !== 'All') {
      query.city = city;
    }

    if (status !== 'All') {
      query.status = status;
    }

    // Fetch users
    const users = await Register.find(query)
      .select('agencyCode name phone companyName city marginType flightMarginPercent flightMarginAmount margin createdAt')
      .sort({ createdAt: -1 });

    // Create PDF document
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4',
      layout: 'landscape'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=agencies-${Date.now()}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('Registered Agencies Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, { align: 'center' });
    doc.moveDown(2);

    // Table headers
    const tableTop = doc.y;
    const headers = ['Sr #', 'Agent Code', 'User Name', 'Phone #', 'Agency', 'City', 'Margin', 'Register Date'];
    const columnWidths = [40, 70, 90, 80, 110, 70, 80, 90];
    let xPosition = 30;

    // Draw header row with background
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.rect(xPosition, tableTop - 5, columnWidths[i], 20).fill('#2c3e50');
      doc.fillColor('white').text(header, xPosition + 5, tableTop, { 
        width: columnWidths[i] - 10, 
        align: 'left' 
      });
      xPosition += columnWidths[i];
    });

    doc.fillColor('black').font('Helvetica');

    // Add data rows
    let yPosition = tableTop + 20;
    const rowHeight = 25;

    users.forEach((user, index) => {
      // Check if we need a new page
      if (yPosition > 500) {
        doc.addPage();
        yPosition = 50;
      }

      // Format margin
      let marginText = '0';
      if (user.marginType === 'Amount') {
        marginText = `${user.flightMarginAmount || 0} PKR`;
      } else if (user.marginType === 'Percentage') {
        marginText = `${user.flightMarginPercent || 0}%`;
      } else if (user.margin) {
        marginText = user.margin;
      }

      // Format date
      const registerDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const rowData = [
        (index + 1).toString(),
        user.agencyCode || 'N/A',
        user.name || 'N/A',
        user.phone || 'N/A',
        user.companyName || 'N/A',
        user.city || 'N/A',
        marginText,
        registerDate
      ];

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(30, yPosition - 5, 730, rowHeight).fillAndStroke('#f8f9fa', '#e9ecef');
      }

      // Draw row data
      xPosition = 30;
      doc.fontSize(8).fillColor('black');
      rowData.forEach((data, i) => {
        doc.text(data, xPosition + 5, yPosition, { 
          width: columnWidths[i] - 10, 
          align: 'left',
          ellipsis: true
        });
        xPosition += columnWidths[i];
      });

      yPosition += rowHeight;
    });

    // Add footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pageCount} | Total Records: ${users.length}`,
        30,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error exporting PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF',
        error: error.message
      });
    }
  }
};

// Export users to Excel
export const exportUsersToExcel = async (req, res) => {
  try {
    const { 
      searchTerm = '', 
      city = 'All', 
      status = 'All' 
    } = req.query;

    // Build query for filtering
    let query = { role: 'Agency' };

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { companyName: { $regex: searchTerm, $options: 'i' } },
        { agencyCode: { $regex: searchTerm, $options: 'i' } },
        { city: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (city !== 'All') {
      query.city = city;
    }

    if (status !== 'All') {
      query.status = status;
    }

    // Fetch users
    const users = await Register.find(query)
      .select('agencyCode name email phone companyName city marginType flightMarginPercent flightMarginAmount margin createdAt')
      .sort({ createdAt: -1 });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registered Agencies');

    // Define columns
    worksheet.columns = [
      { header: 'Sr #', key: 'srNo', width: 10 },
      { header: 'Agent Code', key: 'agentCode', width: 15 },
      { header: 'User Name', key: 'userName', width: 25 },
      { header: 'User Email', key: 'email', width: 25 },
      { header: 'Phone #', key: 'phone', width: 15 },
      { header: 'Agency', key: 'agency', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Margin', key: 'margin', width: 15 },
      { header: 'Register Date', key: 'registerDate', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2c3e50' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 20;

    // Add data rows
    users.forEach((user, index) => {
      // Format margin
      let marginText = '0';
      console.log(user,'user margin')
      if (user.marginType === 'Amount') {
        marginText = `${user.flightMarginAmount || 0} PKR`;
      } else if (user.marginType === 'Percentage') {
        marginText = `${user.flightMarginPercent || 0}%`;
      } else if (user.margin) {
        marginText = user.margin;
      }

      // Format date
      const registerDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      worksheet.addRow({
        srNo: index + 1,
        agentCode: user.agencyCode || 'N/A',
        userName: user.name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        agency: user.companyName || 'N/A',
        city: user.city || 'N/A',
        margin: marginText,
        registerDate: registerDate
      });
    });

    // Style data rows - alternate colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle', horizontal: 'left' };
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          };
        }
      }
      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          left: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          right: { style: 'thin', color: { argb: 'FFE9ECEF' } }
        };
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow({});
    summaryRow.getCell(1).value = `Total Records: ${users.length}`;
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE4B5' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=agencies-${Date.now()}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export Excel',
        error: error.message
      });
    }
  }
};
