import ExcelJS from 'exceljs'
import { typeLabel } from '@/lib/constants'
import { formatShortDate } from '@/lib/utils/format'
import { displayInflow } from '@/lib/utils/transactions'
import type { Transaction } from '@/types/finance'

/**
 * Genera y descarga un .xlsx con las transacciones dadas.
 * El monto se exporta con signo (ingresos +, gastos −) para que sume bien.
 */
export async function exportTransactionsToXlsx(
  transactions: Transaction[],
  accountName: (id: string | null) => string,
  filename = 'flowi-movimientos.xlsx'
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Flowi'
  const ws = wb.addWorksheet('Movimientos')

  ws.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Tipo', key: 'type', width: 16 },
    { header: 'Descripción', key: 'description', width: 28 },
    { header: 'Categoría', key: 'category', width: 16 },
    { header: 'Cuenta', key: 'account', width: 18 },
    { header: 'Monto', key: 'amount', width: 14 },
    { header: 'Notas', key: 'notes', width: 28 },
  ]
  ws.getRow(1).font = { bold: true }

  for (const t of transactions) {
    const signed = displayInflow(t) ? Number(t.amount) : -Number(t.amount)
    ws.addRow({
      date: formatShortDate(t.date),
      type: typeLabel(t.type),
      description: t.description || '',
      category: t.ai_category || '',
      account: accountName(t.account_id),
      amount: signed,
      notes: t.notes || '',
    })
  }

  ws.getColumn('amount').numFmt = '$#,##0.00'

  // Fila de total
  const totalRow = ws.addRow({
    description: 'Total',
    amount: transactions.reduce(
      (s, t) => s + (displayInflow(t) ? Number(t.amount) : -Number(t.amount)),
      0
    ),
  })
  totalRow.font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
