import apiClient from '../../services/api/client'
import { DEFAULT_PAGE_SETTINGS } from '../../services/reportTemplates'

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rupees(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function operationsTable(summary) {
  const ordered = [...(summary.operations || [])].sort((left, right) => (
    String(left.machine_name || '').localeCompare(String(right.machine_name || ''), undefined, { numeric: true })
    || String(left.part_number || '').localeCompare(String(right.part_number || ''), undefined, { numeric: true })
    || String(left.operation_number || '').localeCompare(String(right.operation_number || ''), undefined, { numeric: true })
  ))
  const head = ['Machine', 'Part', 'Part No', 'Qty', 'Op', 'Operation', 'Setup', 'Cycle', 'MHR', 'Cost/Op', 'Overall']
  const body = ordered.map((row) => [
    row.machine_name,
    row.part_name,
    row.part_number,
    row.quantity,
    row.operation_number,
    row.operation_name,
    row.setup_time,
    row.cycle_time,
    rupees(row.mhr_rate),
    rupees(row.cost_per_operation),
    rupees(row.cost_for_overall_qty),
  ])
  return `<table><thead><tr>${head.map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((line) => `<tr>${line.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function additionalTable(summary) {
  const rows = summary.additional_costs || []
  if (!rows.length) return '<p>No additional costs</p>'
  return `<table><thead><tr><th>Cost</th><th>Value</th></tr></thead><tbody>${rows.map((cost) => `<tr><td>${esc(cost.cost_name)}</td><td>${esc(rupees(cost.cost_value))}</td></tr>`).join('')}<tr><td><strong>Subtotal</strong></td><td><strong>${esc(rupees(summary.additional_total))}</strong></td></tr></tbody></table>`
}

function values(summary, customer) {
  return {
    ...(customer?.custom_fields || {}),
    product_name: summary.product_name || '',
    product_number: summary.product_number || '',
    quantity: summary.quantity ?? '',
    date: new Date().toLocaleDateString('en-IN'),
    company_name: customer?.company_name || '',
    branch: customer?.branch || '',
    customer_name: customer?.contact_person || '',
    email: customer?.email || '',
    mobile: customer?.contact_number || '',
    address: customer?.address || '',
    total_setup_time: summary.total_setup_time || '',
    total_cycle_time: summary.total_cycle_time || '',
    total_time: summary.total_time || '',
    total_machining_cost: rupees(summary.total_machining_cost),
    additional_total: rupees(summary.additional_total),
    grand_total: rupees(summary.grand_total),
    operations_table: operationsTable(summary),
    additional_costs: additionalTable(summary),
  }
}

function fill(html, map) {
  return String(html || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => map[key] ?? '')
}

export function buildCostReportHtml(summary, customer, template) {
  const data = template?.template_data || {}
  const page = { ...DEFAULT_PAGE_SETTINGS, ...data, margins: { ...DEFAULT_PAGE_SETTINGS.margins, ...(data.margins || {}) } }
  const map = values(summary, customer)
  const margins = page.margins
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(summary.product_number || 'Cost report')}</title>
<style>
  @page { size: ${page.pageSize} ${page.orientation}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: ${page.fontFamily}, Times, serif; font-size: ${page.fontSize}; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #111; padding: 3px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
  p { margin: 0.3em 0; }
</style></head><body>
${fill(data.headerHtml, map)}
<div style="margin-top:8px;margin-bottom:8px">${fill(data.bodyHtml, map)}</div>
${fill(data.footerHtml, map)}
</body></html>`
}

function printHtml(html, title) {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow pop-ups to download the report')
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.document.title = title
  setTimeout(() => {
    popup.focus()
    popup.print()
  }, 300)
}

export async function downloadTemplatedCostPdf(summary, customer, template) {
  const html = buildCostReportHtml(summary, customer, template)
  const data = template?.template_data || {}
  const filename = `${summary.product_number || 'cost'}-report.pdf`
  try {
    const response = await apiClient.post('/api/v1/reports/pdf', {
      html,
      page_size: data.pageSize || 'A4',
      orientation: data.orientation || 'portrait',
      filename,
    }, { responseType: 'blob' })
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    printHtml(html, filename.replace(/\.pdf$/, ''))
  }
}
