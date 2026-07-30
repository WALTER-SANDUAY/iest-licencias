import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const ROJO = rgb(0.75, 0.13, 0.16)
const NEGRO = rgb(0.11, 0.11, 0.11)
const GRIS = rgb(0.42, 0.42, 0.42)

export async function generarAvisoPDF({ docente, licencia, solicitud }) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)

  // ── ENCABEZADO ──
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: ROJO })

  page.drawText('IEST TINOGASTA', {
    x: 40, y: height - 35,
    size: 18, font: fontBold, color: rgb(1,1,1)
  })
  page.drawText('Instituto de Estudios Superiores Tinogasta', {
    x: 40, y: height - 55,
    size: 10, font: fontRegular, color: rgb(1,1,1,0.85)
  })

  // Número de solicitud
  page.drawText(`N° ${solicitud.id.slice(0,8).toUpperCase()}`, {
    x: width - 160, y: height - 45,
    size: 10, font: fontBold, color: rgb(1,1,1)
  })

  // ── TÍTULO ──
  page.drawText('NOTA DE AVISO DE LICENCIA', {
    x: 40, y: height - 120,
    size: 16, font: fontBold, color: ROJO
  })

  // Línea separadora
  page.drawLine({
    start: { x: 40, y: height - 130 },
    end:   { x: width - 40, y: height - 130 },
    thickness: 1.5, color: ROJO
  })

  // ── DATOS DEL DOCENTE ──
  let y = height - 160

  page.drawText('DATOS DEL DOCENTE', {
    x: 40, y,
    size: 9, font: fontBold, color: GRIS
  })
  y -= 20

  const datosDocente = [
    ['Apellido y Nombre', `${docente.apellido}, ${docente.nombre}`],
    ['DNI',               docente.dni],
    ['Carrera',           docente.carrera],
    ['Curso / División',  docente.curso_division],
  ]

  for (const [label, valor] of datosDocente) {
    page.drawText(`${label}:`, { x: 40, y, size: 10, font: fontBold, color: NEGRO })
    page.drawText(valor || '—', { x: 200, y, size: 10, font: fontRegular, color: NEGRO })
    y -= 20
  }

  y -= 10
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: .5, color: rgb(.85,.85,.85) })
  y -= 20

  // ── DATOS DE LA LICENCIA ──
  page.drawText('DATOS DE LA LICENCIA', {
    x: 40, y,
    size: 9, font: fontBold, color: GRIS
  })
  y -= 20

  const datosLicencia = [
    ['Tipo de licencia',  licencia.nombre],
    ['Artículo',          licencia.articulo],
    ['Categoría',         licencia.categoria],
    ['Fecha desde',       solicitud.fecha_desde],
    ['Fecha hasta',       solicitud.fecha_hasta],
    ['Días solicitados',  `${solicitud.dias_solicitados} días`],
  ]

  for (const [label, valor] of datosLicencia) {
    page.drawText(`${label}:`, { x: 40, y, size: 10, font: fontBold, color: NEGRO })
    page.drawText(valor || '—', { x: 200, y, size: 10, font: fontRegular, color: NEGRO })
    y -= 20
  }

  y -= 10
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: .5, color: rgb(.85,.85,.85) })
  y -= 20

  // ── MOTIVO ──
  page.drawText('MOTIVO:', { x: 40, y, size: 10, font: fontBold, color: NEGRO })
  y -= 18

  // Texto largo partido en líneas
  const motivo = solicitud.motivo || '—'
  const palabras = motivo.split(' ')
  let linea = ''
  for (const palabra of palabras) {
    if ((linea + palabra).length > 80) {
      page.drawText(linea.trim(), { x: 40, y, size: 10, font: fontRegular, color: NEGRO })
      y -= 16
      linea = ''
    }
    linea += palabra + ' '
  }
  if (linea.trim()) {
    page.drawText(linea.trim(), { x: 40, y, size: 10, font: fontRegular, color: NEGRO })
    y -= 16
  }

  y -= 20
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: .5, color: rgb(.85,.85,.85) })
  y -= 20

  // ── FECHA Y HORA DEL AVISO ──
  const fechaAviso = new Date(solicitud.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  page.drawText('Fecha y hora del aviso:', { x: 40, y, size: 10, font: fontBold, color: NEGRO })
  page.drawText(fechaAviso, { x: 200, y, size: 10, font: fontRegular, color: NEGRO })

  y -= 60

  // ── FIRMA ──
  page.drawLine({ start: { x: 40, y }, end: { x: 200, y }, thickness: 1, color: NEGRO })
  y -= 14
  page.drawText('Firma del docente', { x: 40, y, size: 9, font: fontRegular, color: GRIS })

  page.drawLine({ start: { x: 320, y: y + 14 }, end: { x: 555, y: y + 14 }, thickness: 1, color: NEGRO })
  page.drawText('Sello y firma del rector', { x: 320, y, size: 9, font: fontRegular, color: GRIS })

  // ── PIE ──
  page.drawRectangle({ x: 0, y: 0, width, height: 30, color: ROJO })
  page.drawText('IEST Tinogasta — Sistema de Gestión de Licencias Docentes', {
    x: 40, y: 10, size: 8, font: fontRegular, color: rgb(1,1,1)
  })

  const pdfBytes = await doc.save()
  return pdfBytes
}

export async function fusionarPDFs(avisoPdfBytes, justificativoPdfBytes) {
  const docFinal = await PDFDocument.create()

  // Copiar página del aviso
  const docAviso = await PDFDocument.load(avisoPdfBytes)
  const [paginaAviso] = await docFinal.copyPages(docAviso, [0])
  docFinal.addPage(paginaAviso)

  // Copiar todas las páginas del justificativo
  const docJustif = await PDFDocument.load(justificativoPdfBytes)
  const indices = docJustif.getPageIndices()
  const paginas = await docFinal.copyPages(docJustif, indices)
  for (const pagina of paginas) docFinal.addPage(pagina)

  const pdfBytes = await docFinal.save()
  return pdfBytes
}

export function descargarPDF(pdfBytes, nombre) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}