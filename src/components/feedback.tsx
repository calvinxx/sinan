import { useState } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { FieldError } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { errorMessage } from '@/lib/validation'

export function LoadError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <Alert>
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <Button variant="link" onClick={retry}>
          重新加载
        </Button>
      </AlertDescription>
    </Alert>
  )
}
export function ListSkeleton() {
  return (
    <div className="loading-rows" role="status" aria-label="正在加载">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton className="h-14 w-full" key={i} />
      ))}
    </div>
  )
}
export function EmptyList({
  title,
  detail,
  action,
  onAction,
}: {
  title: string
  detail?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {detail ? <EmptyDescription>{detail}</EmptyDescription> : null}
      </EmptyHeader>
      {onAction ? (
        <Button variant="outline" onClick={onAction}>
          <Plus data-icon="inline-start" />
          {action}
        </Button>
      ) : null}
    </Empty>
  )
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  label = '确认删除',
  onConfirm,
  destructive = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  label?: string
  onConfirm: () => Promise<unknown> | void
  destructive?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    setPending(true)
    setError('')
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setError('')
          onOpenChange(value)
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FieldError>{error}</FieldError> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={confirm}
          >
            {pending ? '处理中…' : label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
