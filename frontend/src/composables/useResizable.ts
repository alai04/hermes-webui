import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

type Edge = 'right' | 'left'

interface ResizableReturn {
  width: Ref<number>
  handleMousedown: (e: MouseEvent) => void
}

/**
 * Drag-to-resize panels.
 * useResizable(targetRef, edge, minW, maxW, storageKey)
 * Returns width ref and handleMousedown for the resize handle element.
 * Restores saved width from localStorage on mount.
 */
export function useResizable(
  _targetRef: Ref<HTMLElement | null>,
  edge: Edge,
  minW: number,
  maxW: number,
  storageKey: string
): ResizableReturn {
  const DEFAULT_WIDTH = minW + Math.round((maxW - minW) * 0.25)
  const width = ref<number>(DEFAULT_WIDTH)

  let dragging = false
  let startX = 0
  let startWidth = 0

  function onMousemove(e: MouseEvent) {
    if (!dragging) return
    const delta = edge === 'right' ? e.clientX - startX : startX - e.clientX
    const next = Math.min(maxW, Math.max(minW, startWidth + delta))
    width.value = next
    try {
      localStorage.setItem(storageKey, String(next))
    } catch {
      // localStorage unavailable
    }
  }

  function onMouseup() {
    if (!dragging) return
    dragging = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  function handleMousedown(e: MouseEvent) {
    e.preventDefault()
    dragging = true
    startX = e.clientX
    startWidth = width.value
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  onMounted(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= minW && parsed <= maxW) {
          width.value = parsed
        }
      }
    } catch {
      // localStorage unavailable
    }
    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onMousemove)
    document.removeEventListener('mouseup', onMouseup)
  })

  return { width, handleMousedown }
}
