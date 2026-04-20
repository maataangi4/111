/** Назначение зала (фильтры / отчёты). */
export type RoomPurpose =
  | 'propagation'
  | 'veg'
  | 'flower'
  | 'drying'
  | 'mother'
  | 'quarantine'
  | 'other'

export const ROOM_PURPOSE_LABELS: Record<RoomPurpose, string> = {
  propagation: 'Рассада / герминация',
  veg: 'Вегетация',
  flower: 'Цветение',
  drying: 'Сушка',
  mother: 'Матки',
  quarantine: 'Карантин',
  other: 'Другое',
}

export type TopologyRoom = {
  id: string
  companyId: string
  name: string
  type: RoomPurpose
}

export type TopologyFixture = {
  id: string
  roomId: string
  name: string
}

export type TopologyLevel = {
  id: string
  fixtureId: string
  name: string
}

/** Выбор в каскадных списках (минимум — комната). */
export type TopologySelection = {
  roomId: string
  fixtureId?: string
  levelId?: string
}
