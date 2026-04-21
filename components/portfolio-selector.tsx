'use client'

import { useState } from 'react'
import {
  Briefcase, Plus, ChevronDown, Check, MoreHorizontal,
  Pencil, Trash2, Star, Loader2
} from 'lucide-react'
import { usePortfolio } from '@/components/portfolio-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Portfolio } from '@/lib/types/database'

export function PortfolioSelector() {
  const {
    portfolios, activePortfolio, setActivePortfolio,
    createPortfolio, renamePortfolio, deletePortfolio, setDefaultPortfolio
  } = usePortfolio()

  const [isCreating, setIsCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [renameTarget, setRenameTarget] = useState<Portfolio | null>(null)
  const [renameName, setRenameName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = async () => {
    if (!createName.trim()) return
    setIsSaving(true)
    const created = await createPortfolio(createName.trim())
    if (created) {
      setActivePortfolio(created)
    }
    setIsSaving(false)
    setIsCreating(false)
    setCreateName('')
  }

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    setIsSaving(true)
    await renamePortfolio(renameTarget.id, renameName.trim())
    setIsSaving(false)
    setRenameTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deletePortfolio(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors group">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium leading-none mb-0.5">
                Портфель
              </span>
              <span className="truncate text-foreground leading-none text-sm max-w-[140px]">
                {activePortfolio?.name ?? 'Не выбран'}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[state=open]:rotate-180 transition-transform" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="start" className="w-64">
          {portfolios.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                Мои портфели
              </div>
              {portfolios.map(p => (
                <div key={p.id} className="flex items-center group/item">
                  <DropdownMenuItem
                    className="flex-1 cursor-pointer gap-2"
                    onClick={() => setActivePortfolio(p)}
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {activePortfolio?.id === p.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.is_default && (
                      <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                    )}
                  </DropdownMenuItem>

                  {/* Per-portfolio actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="mr-1 flex h-8 w-8 items-center justify-center rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-accent active:bg-accent transition-opacity touch-manipulation"
                        onClick={e => e.stopPropagation()}
                        aria-label="Действия с портфелем"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={() => { setRenameTarget(p); setRenameName(p.name) }}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Переименовать
                      </DropdownMenuItem>
                      {!p.is_default && (
                        <DropdownMenuItem onClick={() => setDefaultPortfolio(p.id)}>
                          <Star className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                          Сделать основным
                        </DropdownMenuItem>
                      )}
                      {portfolios.length > 1 && (
                        <>
                          <DropdownMenuSeparator className="my-1" />
                          <div className="px-2 pb-1">
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Удалить портфель
                            </button>
                          </div>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => setIsCreating(true)} className="gap-2 text-primary">
            <Plus className="h-4 w-4" />
            Создать портфель
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый портфель</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="portfolio-name">Название</Label>
            <Input
              id="portfolio-name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="Например: ИИС, Брокерский счёт"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={v => !v && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать портфель</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">Новое название</Label>
            <Input
              id="rename-input"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Отмена</Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Удалить портфель?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Вы удаляете портфель{' '}
                  <span className="font-medium text-foreground">«{deleteTarget?.name}»</span>.
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-xs">
                  ⚠ Все позиции в этом портфеле будут удалены безвозвратно.
                  Это действие нельзя отменить.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1">Оставить</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Удаляем...</>
                : <><Trash2 className="mr-2 h-4 w-4" />Удалить навсегда</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
