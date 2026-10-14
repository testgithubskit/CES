import { downloadExcel, downloadPdf } from '../common/tableExport'

const columns = [
  { key: 'kind', label: 'Type' },
  { key: 'number', label: 'Number' },
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'quantity', label: 'Qty' },
]

function bomRows(hierarchy) {
  const rows = [{
    kind: 'Product',
    number: hierarchy.product_number,
    name: hierarchy.product_name,
    size: '',
    quantity: hierarchy.quantity ?? '',
  }]
  const walk = (assemblies, nested) => {
    assemblies?.forEach((assembly) => {
      rows.push({
        kind: nested ? 'Sub Assembly' : 'Assembly',
        number: assembly.assembly_number,
        name: assembly.assembly_name,
        size: '',
        quantity: '',
      })
      assembly.parts?.forEach((part) => {
        rows.push({
          kind: 'Part',
          number: part.part_number,
          name: part.part_name,
          size: part.size || '',
          quantity: part.quantity ?? '',
        })
      })
      walk(assembly.sub_assemblies, true)
    })
  }
  walk(hierarchy.assemblies, false)
  hierarchy.direct_parts?.forEach((part) => {
    rows.push({
      kind: 'Part',
      number: part.part_number,
      name: part.part_name,
      size: part.size || '',
      quantity: part.quantity ?? '',
    })
  })
  return rows
}

export function downloadBom(hierarchy, kind) {
  const rows = bomRows(hierarchy)
  const title = `${hierarchy.product_number} Bill of Materials`
  if (kind === 'pdf') downloadPdf(title, columns, rows)
  else downloadExcel(title, columns, rows)
}
