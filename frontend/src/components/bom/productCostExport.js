import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { getStarredTemplate } from '../../services/api/reportTemplates'
import { downloadTemplatedCostPdf } from '../reports/renderCostReport'

const headers = [
  'Machine',
  'Part',
  'Part No',
  'Qty',
  'Op #',
  'Operation',
  'Setup',
  'Cycle',
  'Machining Hr',
  'MHR',
  'Cost/Op',
  'Total Hrs/Part',
  'Cost/Qty',
  'Overall Qty Cost',
]

export function scaleCostSummary(summary, qty) {
  const exportQty = Math.max(1, Number(qty) || 1)
  const base = Math.max(1, Number(summary.quantity) || 1)
  const factor = exportQty / base
  const money = (value) => Number(value || 0) * factor
  return {
    ...summary,
    quantity: exportQty,
    total_machining_cost: money(summary.total_machining_cost),
    additional_total: money(summary.additional_total),
    grand_total: money(summary.grand_total),
    additional_costs: (summary.additional_costs || []).map((cost) => ({
      ...cost,
      cost_value: money(cost.cost_value),
    })),
    operations: (summary.operations || []).map((row) => ({
      ...row,
      quantity: Math.round(Number(row.quantity || 1) * factor),
      cost_for_overall_qty: money(row.cost_for_overall_qty),
      part_total_cost: money(row.part_total_cost),
    })),
  }
}

function rupees(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function summaryLines(summary) {
  return [
    ['Total Setup Time', summary.total_setup_time],
    ['Total Cycle Time', summary.total_cycle_time],
    ['Total (Setup + Cycle)', summary.total_time],
    ['Total Machining Cost', rupees(summary.total_machining_cost)],
    ['Additional Costs', rupees(summary.additional_total)],
    ['Grand Total', rupees(summary.grand_total)],
  ]
}

function fileBase(summary) {
  return `${summary.product_number || summary.product_name}-cost-summary`.replace(/[^\w.-]+/g, '_')
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function groupedOperationLines(summary) {
  const ordered = [...summary.operations].sort((left, right) => (
    String(left.machine_name || '').localeCompare(String(right.machine_name || ''), undefined, { numeric: true })
    || String(left.part_number || '').localeCompare(String(right.part_number || ''), undefined, { numeric: true })
    || String(left.operation_number || '').localeCompare(String(right.operation_number || ''), undefined, { numeric: true })
  ))
  let previousMachine = ''
  return ordered.map((row) => {
    const machine = row.machine_name === previousMachine ? '' : row.machine_name
    previousMachine = row.machine_name
    return [
      machine,
      row.part_name,
      row.part_number,
      row.quantity,
      row.operation_number,
      row.operation_name,
      row.setup_time,
      row.cycle_time,
      row.machining_time,
      rupees(row.mhr_rate),
      rupees(row.cost_per_operation),
      row.part_total_time,
      rupees(row.cost_per_qty),
      rupees(row.cost_for_overall_qty),
    ]
  })
}

function customerLines(customer) {
  return [
    ['Company', customer.company_name || ''],
    ['Branch', customer.branch || ''],
    ['Contact', customer.contact_person || ''],
    ['Email', customer.email || ''],
    ['Phone', customer.contact_number || ''],
    ['Address', customer.address || ''],
    ...Object.entries(customer.custom_fields || {}).map(([key, value]) => [key.replace(/_/g, ' '), value]),
  ]
}

export async function downloadCostPdf(summary, customer) {
  const template = await getStarredTemplate().catch(() => null)
  if (template) {
    downloadTemplatedCostPdf(summary, customer, template)
    return
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const drawHeader = () => {
    doc.setFillColor(17, 17, 17)
    doc.rect(0, 0, width, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('COST ESTIMATION', 10, 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`${summary.product_number || ''}  ·  ${summary.product_name}`, 10, 14)
    doc.text(new Date().toLocaleDateString('en-IN'), width - 10, 8, { align: 'right' })
    doc.text(`Qty ${summary.quantity}`, width - 10, 14, { align: 'right' })
  }
  drawHeader()
  const productText = [
    summary.product_name || '',
    `${summary.product_number || ''}   Qty ${summary.quantity ?? ''}`,
    ...(summary.custom_fields || []).filter((field) => field.value).slice(0, 4).map((field) => `${field.label}: ${field.value}`),
  ]
  const customerText = [
    customer.company_name || '',
    [customer.branch, customer.contact_person].filter(Boolean).join('  ·  '),
    [customer.email, customer.contact_number].filter(Boolean).join('  ·  '),
    customer.address || '',
  ].filter(Boolean)
  doc.setTextColor(20, 20, 20)
  doc.setFillColor(248, 248, 248)
  const detailHeight = Math.max(28, 16 + Math.max(productText.length, customerText.length) * 4)
  doc.rect(10, 22, width / 2 - 14, detailHeight, 'F')
  doc.rect(width / 2 + 2, 22, width / 2 - 12, detailHeight, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('PRODUCT', 13, 27)
  doc.text('CUSTOMER', width / 2 + 5, 27)
  doc.setFont('helvetica', 'normal')
  productText.forEach((line, index) => doc.text(String(line), 13, 32 + index * 4))
  customerText.slice(0, 4).forEach((line, index) => doc.text(String(line), width / 2 + 5, 32 + index * 4))
  autoTable(doc, {
    startY: 26 + detailHeight,
    head: [['Setup', 'Cycle', 'Setup + Cycle', 'Machining', 'Additional', 'Grand Total']],
    body: [[
      summary.total_setup_time,
      summary.total_cycle_time,
      summary.total_time,
      rupees(summary.total_machining_cost),
      rupees(summary.additional_total),
      rupees(summary.grand_total),
    ]],
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', textColor: 20, cellPadding: 2 },
    headStyles: { fillColor: [243, 243, 243], textColor: 20, fontStyle: 'bold' },
    margin: { left: 10, right: 10 },
  })
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [headers],
    body: groupedOperationLines(summary),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.4, textColor: 20, overflow: 'linebreak' },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 10, right: 10, top: 22 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader()
      doc.setFontSize(8)
      doc.setTextColor(90)
      doc.text(`Page ${data.pageNumber}`, width - 10, doc.internal.pageSize.getHeight() - 6, { align: 'right' })
    },
  })
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Additional cost', 'Value']],
    body: summary.additional_costs.length
      ? [
          ...summary.additional_costs.map((cost) => [cost.cost_name, rupees(cost.cost_value)]),
          ['Subtotal', rupees(summary.additional_total)],
        ]
      : [['No additional costs', rupees(0)]],
    foot: [['Grand total', rupees(summary.grand_total)]],
    theme: 'grid',
    styles: { fontSize: 8, textColor: 20 },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    footStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
    margin: { left: 10, right: 10 },
    columnStyles: { 1: { halign: 'right' } },
  })
  doc.save(`${fileBase(summary)}.pdf`)
}

export async function downloadCostExcel(summary, customer) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Cost Summary')
  sheet.addRow([summary.product_name])
  sheet.getRow(1).font = { bold: true, size: 16 }
  sheet.addRow([summary.product_number, `Qty ${summary.quantity}`])
  ;(summary.custom_fields || []).forEach((field) => {
    if (field.value) sheet.addRow([field.label, field.value])
  })
  sheet.addRow([])
  sheet.addRow(['Customer', customer.company_name])
  customerLines(customer).forEach((line) => sheet.addRow(line))
  sheet.addRow([])
  summaryLines(summary).forEach((line) => {
    const row = sheet.addRow(line)
    row.getCell(1).font = { bold: true }
  })
  sheet.addRow([])
  const head = sheet.addRow(headers)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
  })
  groupedOperationLines(summary).forEach((line) => sheet.addRow(line))
  sheet.addRow([])
  const extraHead = sheet.addRow(['Additional Cost', 'Value'])
  extraHead.font = { bold: true }
  if (summary.additional_costs.length === 0) {
    sheet.addRow(['No additional costs', rupees(0)])
  } else {
    summary.additional_costs.forEach((cost) => sheet.addRow([cost.cost_name, rupees(cost.cost_value)]))
    const subtotal = sheet.addRow(['Subtotal', rupees(summary.additional_total)])
    subtotal.font = { bold: true }
  }
  sheet.columns.forEach((column) => {
    column.width = 18
  })
  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 28
  const buffer = await workbook.xlsx.writeBuffer()
  saveBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase(summary)}.xlsx`)
}
