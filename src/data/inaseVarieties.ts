export type InaseVariety = {
  /** N° INASE (registro) */
  id: string
  /** Nombre de la variedad */
  name: string
}

/**
 * Catálogo base (demo) — INASE (Argentina).
 * Solo guardamos N° + nombre para selección rápida en CRM.
 */
export const INASE_VARIETIES: InaseVariety[] = [
  { id: '20988', name: 'EVA' },
  { id: '21010', name: 'CHEM FELIX' },
  { id: '21012', name: 'KALI FELIX' },
  { id: '21318', name: 'CELOSA 10' },
  { id: '21321', name: 'PASTEL DE CHOQUE' },
  { id: '21336', name: 'CANNPAT ONE' },
  { id: '21354', name: 'MALVINA' },
  { id: '21357', name: 'TROPICANA WFC' },
  { id: '21362', name: 'BSOD74' },
  { id: '21375', name: 'POLARIS' },
  { id: '21383', name: 'BALLENA FRANCA' },
  { id: '21384', name: 'CENPAT' },
  { id: '21385', name: 'PACHAMAMA' },
  { id: '21386', name: 'CONICET' },
  { id: '21392', name: 'MARIQUITA' },
  { id: '21520', name: 'NEBULA X' },
  { id: '21528', name: 'AFRICAN JAM' },
  { id: '21638', name: 'GUARANÍ PORÁ J.' },
  { id: '21694', name: 'PH LOBERA' },
  { id: '21808', name: 'NUCLEO UNO' },
  { id: '21840', name: 'DR. WEST' },
  { id: '21847', name: 'HASEVERRY PURPLE' },
  { id: '21855', name: 'CRAIG' },
  { id: '21866', name: 'CAMBOYA CHR' },
  { id: '21867', name: 'GRAPE NECTAR' },
  { id: '21928', name: 'ANANDA001' },
  { id: '21975', name: 'CH1439XMT' },
  { id: '22060', name: 'LA MESIAS' },
  { id: '22194', name: 'ONORA' },
  { id: '22216', name: 'DOSOGE 18' },
  { id: '22237', name: 'BATEKÚ' },
  { id: '22241', name: 'SATÉLITE' },
  { id: '22251', name: 'SANTANESIA' },
  { id: '22291', name: 'CRIAR2202' },
  { id: '22294', name: 'MATRONA' },
  { id: '22317', name: 'FANTASMA DE HIELO' },
  { id: '22328', name: 'FANCY GUMMY' },
  { id: '22337', name: 'MOWH' },
  { id: '22756', name: '9001' },
  { id: '22762', name: 'EGYPTO' },
]

