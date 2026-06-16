'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCategories } from '@/hooks/useCategories'
import { showToast } from '@/lib/toast'
import { ColorPicker } from '@/components/shared/ColorPicker'
import type { Category } from '@/types/finance'

const EMOJIS = [
  '📦', '🍽️', '🚗', '🏠', '💊', '🎬', '👕', '🎓', '💼', '💡',
  '✈️', '🎮', '📱', '☕', '🐶', '🏋️', '🎁', '💳', '💰', '🧾', '⛽', '🛒',
]

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'

export function CategoryManager() {
  const { categories, refresh } = useCategories()
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  const sorted = [...categories].sort((a, b) => {
    const ap = a.user_id ? 0 : 1
    const bp = b.user_id ? 0 : 1
    if (ap !== bp) return ap - bp
    return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  })
  const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0)

  const toggleHide = async (c: Category) => {
    await supabase.from('categories').update({ is_hidden: !c.is_hidden }).eq('id', c.id)
    refresh()
  }

  const remove = async (c: Category) => {
    await supabase.from('categories').delete().eq('id', c.id)
    showToast('Categoría eliminada')
    refresh()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const a = sorted[index]
    const b = sorted[index + dir]
    if (!a || !b) return
    await supabase.from('categories').update({ sort_order: b.sort_order ?? 0 }).eq('id', a.id)
    await supabase.from('categories').update({ sort_order: a.sort_order ?? 0 }).eq('id', b.id)
    refresh()
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Categorías</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
        >
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      {showAdd && (
        <AddCategoryForm
          nextOrder={maxOrder + 1}
          onDone={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
        {sorted.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            canMoveUp={i > 0}
            canMoveDown={i < sorted.length - 1}
            onHide={() => toggleHide(c)}
            onRemove={() => remove(c)}
            onMove={(dir) => move(i, dir)}
            onChange={refresh}
          />
        ))}
      </div>
    </section>
  )
}

function CategoryRow({
  category,
  canMoveUp,
  canMoveDown,
  onHide,
  onRemove,
  onMove,
  onChange,
}: {
  category: Category
  canMoveUp: boolean
  canMoveDown: boolean
  onHide: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const isGlobal = !category.user_id

  if (editing) {
    return <EditCategoryForm category={category} onDone={() => { setEditing(false); onChange() }} onCancel={() => setEditing(false)} />
  }

  return (
    <div className={`flex items-center gap-3 p-3 ${category.is_hidden ? 'opacity-50' : ''}`}>
      <span className="text-lg w-6 text-center">{category.icon || '📦'}</span>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: category.color ?? '#64748B' }}
      />
      <span className="text-sm font-medium text-foreground flex-1 truncate">{category.name}</span>

      <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
        <button onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Subir" className="p-1 disabled:opacity-30 hover:text-foreground">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Bajar" className="p-1 disabled:opacity-30 hover:text-foreground">
          <ChevronDown className="w-4 h-4" />
        </button>

        {isGlobal ? (
          <button onClick={onHide} aria-label={category.is_hidden ? 'Mostrar' : 'Ocultar'} className="p-1 hover:text-foreground">
            {category.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} aria-label="Editar" className="p-1 hover:text-foreground">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button onClick={onRemove} aria-label="Eliminar" className="p-1 hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center ${
            value === e ? 'bg-muted ring-2 ring-ring' : 'hover:bg-muted'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

function AddCategoryForm({ nextOrder, onDone }: { nextOrder: number; onDone: () => void }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState('#6366F1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión no válida')
      setBusy(false)
      return
    }
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: name.trim(),
      icon,
      color,
      sort_order: nextOrder,
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    showToast('Categoría creada')
    onDone()
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-3 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la categoría"
        className={inputClass}
      />
      <EmojiPicker value={icon} onChange={setIcon} />
      <ColorPicker value={color} onChange={setColor} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Crear categoría'}
      </button>
    </div>
  )
}

function EditCategoryForm({
  category,
  onDone,
  onCancel,
}: {
  category: Category
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category.name)
  const [icon, setIcon] = useState(category.icon || '📦')
  const [color, setColor] = useState(category.color || '#6366F1')
  const [busy, setBusy] = useState(false)
  const supabase = createClient()

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    await supabase
      .from('categories')
      .update({ name: name.trim(), icon, color })
      .eq('id', category.id)
    showToast('Categoría actualizada')
    setBusy(false)
    onDone()
  }

  return (
    <div className="bg-muted p-4 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      <EmojiPicker value={icon} onChange={setIcon} />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Check className="w-4 h-4" /> Guardar
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground inline-flex items-center gap-1"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>
    </div>
  )
}
