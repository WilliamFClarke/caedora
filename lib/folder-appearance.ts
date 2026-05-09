import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Dumbbell,
  Folder,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  NotebookText,
  PiggyBank,
  Plane,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react'

export interface FolderColor {
  id: string
  name: string
  value: string
}

export interface FolderIcon {
  id: string
  name: string
  icon: LucideIcon
}

export interface FolderAppearance {
  color: string
  icon: string
}

export const FOLDER_COLORS: FolderColor[] = [
  { id: 'sage', name: 'Sage', value: '#7f9f8d' },
  { id: 'mist', name: 'Mist', value: '#7f9aab' },
  { id: 'clay', name: 'Clay', value: '#a98f7b' },
  { id: 'stone', name: 'Stone', value: '#96938b' },
  { id: 'mauve', name: 'Mauve', value: '#9b879a' },
  { id: 'slate', name: 'Slate', value: '#8792a1' },
  { id: 'moss', name: 'Moss', value: '#8d986f' },
  { id: 'rose', name: 'Rose', value: '#aa8589' },
]

export const FOLDER_ICONS: FolderIcon[] = [
  { id: 'folder', name: 'Folder', icon: Folder },
  { id: 'briefcase', name: 'Work', icon: BriefcaseBusiness },
  { id: 'book', name: 'Reading', icon: BookOpen },
  { id: 'calendar', name: 'Journal', icon: CalendarDays },
  { id: 'dumbbell', name: 'Fitness', icon: Dumbbell },
  { id: 'graduation', name: 'Learning', icon: GraduationCap },
  { id: 'heart', name: 'Health', icon: HeartPulse },
  { id: 'home', name: 'Home', icon: Home },
  { id: 'landmark', name: 'Loan', icon: Landmark },
  { id: 'notebook', name: 'Notes', icon: NotebookText },
  { id: 'piggy-bank', name: 'Budget', icon: PiggyBank },
  { id: 'plane', name: 'Travel', icon: Plane },
  { id: 'receipt', name: 'Bills', icon: ReceiptText },
  { id: 'trending-up', name: 'Investments', icon: TrendingUp },
  { id: 'users', name: 'People', icon: Users },
  { id: 'wallet', name: 'Finance', icon: WalletCards },
]

export const DEFAULT_FOLDER_APPEARANCE: FolderAppearance = {
  color: FOLDER_COLORS[0].id,
  icon: 'folder',
}

const FOLDER_ICON_BY_ID = new Map(FOLDER_ICONS.map((item) => [item.id, item.icon]))
const FOLDER_COLOR_BY_ID = new Map(FOLDER_COLORS.map((item) => [item.id, item.value]))

export function folderIconComponent(iconId: string | undefined): LucideIcon {
  return FOLDER_ICON_BY_ID.get(iconId ?? '') ?? Folder
}

export function folderColorValue(colorId: string | undefined): string {
  return FOLDER_COLOR_BY_ID.get(colorId ?? '') ?? FOLDER_COLORS[0].value
}

export function randomFolderAppearance(seed?: string): FolderAppearance {
  const colorIndex = seed ? hash(seed) % FOLDER_COLORS.length : Math.floor(Math.random() * FOLDER_COLORS.length)
  return {
    color: FOLDER_COLORS[colorIndex].id,
    icon: iconForName(seed ?? ''),
  }
}

export function suggestedFolderAppearance(path: string): FolderAppearance {
  const colorIndex = hash(path) % FOLDER_COLORS.length
  return {
    color: FOLDER_COLORS[colorIndex].id,
    icon: iconForName(path),
  }
}

function iconForName(value: string): string {
  const lower = value.toLowerCase()
  if (/(fitness|workout|training)/.test(lower)) return 'dumbbell'
  if (/(reading|book|source|learning)/.test(lower)) return 'book'
  if (/(career|job|work|project)/.test(lower)) return 'briefcase'
  if (/(journal|daily|review)/.test(lower)) return 'calendar'
  if (/(people|person|crm|relationship)/.test(lower)) return 'users'
  if (/(home|house|maintenance)/.test(lower)) return 'home'
  if (/(travel|trip)/.test(lower)) return 'plane'
  if (/(investment|portfolio|watchlist)/.test(lower)) return 'trending-up'
  if (/(student-loan|loan|slc)/.test(lower)) return 'landmark'
  if (/(finance|budget|subscription)/.test(lower)) return 'wallet'
  if (/(health|medical)/.test(lower)) return 'heart'
  return 'folder'
}

function hash(value: string): number {
  let out = 0
  for (let i = 0; i < value.length; i++) {
    out = (out * 31 + value.charCodeAt(i)) >>> 0
  }
  return out
}
