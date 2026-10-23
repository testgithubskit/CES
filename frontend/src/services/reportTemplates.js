export const COST_PLACEHOLDERS = [
  { token: '{{product_name}}', label: 'Product' },
  { token: '{{product_number}}', label: 'Product No' },
  { token: '{{quantity}}', label: 'Quantity' },
  { token: '{{date}}', label: 'Date' },
  { token: '{{company_name}}', label: 'Customer Company' },
  { token: '{{branch}}', label: 'Branch' },
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
  fontFamily: 'Calibri',
  fontSize: '14px',
  customPlaceholders: [],
}

export function customerColumnPlaceholders(columns) {
  return (columns || []).map((field) => ({
    token: `{{${field.field_key}}}`,
    label: field.label,
    customer: true,
  }))
}
