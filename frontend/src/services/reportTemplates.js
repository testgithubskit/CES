const STORAGE_KEY = 'ces-report-templates'

export const COST_PLACEHOLDERS = [
  { token: '{{product_name}}', label: 'Product' },
  { token: '{{product_number}}', label: 'Product No' },
  { token: '{{quantity}}', label: 'Quantity' },
  { token: '{{date}}', label: 'Date' },
  { token: '{{company_name}}', label: 'Customer Company' },
  { token: '{{customer_name}}', label: 'Contact' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{mobile}}', label: 'Phone' },
  { token: '{{address}}', label: 'Address' },
  { token: '{{total_setup_time}}', label: 'Total Setup' },
  { token: '{{total_cycle_time}}', label: 'Total Cycle' },
  { token: '{{total_time}}', label: 'Total Time' },
  { token: '{{total_machining_cost}}', label: 'Machining Cost' },
  { token: '{{additional_total}}', label: 'Additional Costs' },
  { token: '{{grand_total}}', label: 'Grand Total' },
  { token: '{{operations_table}}', label: 'Operations Table' },
  { token: '{{additional_costs}}', label: 'Additional Costs Table' },
]

export const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210×297mm)' },
  { value: 'A3', label: 'A3 (297×420mm)' },
  { value: 'A5', label: 'A5 (148×210mm)' },
  { value: 'Letter', label: 'Letter (215.9×279.4mm)' },
  { value: 'Legal', label: 'Legal (215.9×355.6mm)' },
]

export const DEFAULT_PAGE_SETTINGS = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 5, right: 5, bottom: 5, left: 5 },
  headerSpacing: 0,
  footerSpacing: 0,
  fontFamily: 'Times New Roman',
  fontSize: '12px',
  customPlaceholders: [],
}

const starter = () => ({
  id: 'starter-cost-template',
  name: 'Cost summary',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  template_data: {
    ...DEFAULT_PAGE_SETTINGS,
    headerHtml: '<p><strong>Cost Estimation Report</strong></p><p>{{product_name}} · {{product_number}}</p>',
    bodyHtml: '<p>Customer: {{company_name}}</p><p>Contact: {{customer_name}} · {{email}} · {{mobile}}</p><p>Date: {{date}} · Qty {{quantity}}</p><p>{{operations_table}}</p><p>Setup {{total_setup_time}} · Cycle {{total_cycle_time}} · Total {{total_time}}</p><p>Machining {{total_machining_cost}} · Additional {{additional_total}}</p><p><strong>Grand total {{grand_total}}</strong></p><p>{{additional_costs}}</p>',
    footerHtml: '<p>{{product_number}} · {{company_name}}</p>',
  },
})

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(parsed) && parsed.length) return parsed
  } catch {
    /* use starter */
  }
  const seeded = [starter()]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

function write(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  return rows
}

export function listReportTemplates() {
  return read()
}

export function getReportTemplate(id) {
  return read().find((item) => item.id === id) || null
}

export function getStarredTemplate() {
  const rows = read()
  return rows.find((item) => item.is_default) || rows[0] || null
}

export function saveReportTemplate(template) {
  const rows = read()
  const now = new Date().toISOString()
  const next = {
    ...template,
    id: template.id || crypto.randomUUID(),
    created_at: template.created_at || now,
    updated_at: now,
  }
  const index = rows.findIndex((item) => item.id === next.id)
  let saved = index === -1 ? [...rows, next] : rows.map((item) => (item.id === next.id ? next : item))
  if (next.is_default) saved = saved.map((item) => ({ ...item, is_default: item.id === next.id }))
  write(saved)
  return next
}

export function starReportTemplate(id) {
  const rows = read().map((item) => ({ ...item, is_default: item.id === id, updated_at: item.id === id ? new Date().toISOString() : item.updated_at }))
  write(rows)
}

export function deleteReportTemplate(id) {
  const rows = read().filter((item) => item.id !== id)
  if (rows.length && !rows.some((item) => item.is_default)) rows[0] = { ...rows[0], is_default: true }
  write(rows.length ? rows : [starter()])
}
