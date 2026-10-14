import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

function fileName(title) {
  return title.replace(/[^\w.-]+/g, '_')
}

export function downloadPdf(title, columns, rows) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, width, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, 10, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('en-IN'), width - 10, 10, { align: 'right' })
  autoTable(doc, {
    startY: 22,
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => String(row[column.key] ?? ''))),
    theme: 'grid',
    styles: { fontSize: 8, textColor: 20, cellPadding: 1.6 },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    margin: { left: 10, right: 10, top: 20 },
  })
  doc.save(`${fileName(title)}.pdf`)
}

export async function downloadExcel(title, columns, rows) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Export')
  const head = sheet.addRow(columns.map((column) => column.label))
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } }
  })
  rows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? '')))
  sheet.columns.forEach((column) => {
    column.width = 22
  })
  const buffer = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName(title)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
