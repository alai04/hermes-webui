import { ref } from 'vue'

// localStorage key: if Web Speech API failed last time, we remember and skip it
const LS_SPEECH_FAILED = 'hermes-speech-api-failed'

export interface VoiceInputOptions {
  onTranscript: (text: string) => void
  onError: (msg: string) => void
  onStatusChange: (recording: boolean) => void
  language?: string
}

export function useVoiceInput(options: VoiceInputOptions) {
  const { onTranscript, onError, onStatusChange, language } = options

  const isRecording = ref(false)

  // Check browser support
  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )

  const hasMediaRecorder =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'

  const isSupported = hasSpeechRecognition || hasMediaRecorder

  let _recognition: any = null
  let _mediaRecorder: MediaRecorder | null = null
  let _mediaStream: MediaStream | null = null
  let _chunks: Blob[] = []

  // ── Web Speech API path ───────────────────────────────────────────────────

  function _speechFailed(): boolean {
    try {
      return localStorage.getItem(LS_SPEECH_FAILED) === '1'
    } catch {
      return false
    }
  }

  function _markSpeechFailed() {
    try {
      localStorage.setItem(LS_SPEECH_FAILED, '1')
    } catch { /* ignore */ }
  }

  function _startSpeechRecognition(): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return false

    try {
      _recognition = new SpeechRecognition()
      _recognition.lang = language ?? navigator.language ?? 'en-US'
      _recognition.interimResults = false
      _recognition.maxAlternatives = 1
      _recognition.continuous = false

      _recognition.onresult = (e: any) => {
        const transcript = e.results[0]?.[0]?.transcript ?? ''
        if (transcript) onTranscript(transcript)
      }

      _recognition.onerror = (e: any) => {
        const errCode: string = e.error ?? ''
        if (errCode === 'not-allowed') {
          onError('mic_denied')
          _markSpeechFailed()
        } else if (errCode === 'no-speech') {
          onError('mic_no_speech')
        } else if (errCode === 'network') {
          onError('mic_network')
          _markSpeechFailed()
        } else {
          onError(`mic_error:${errCode}`)
        }
        _cleanup()
      }

      _recognition.onend = () => {
        _cleanup()
      }

      _recognition.start()
      isRecording.value = true
      onStatusChange(true)
      return true
    } catch {
      _markSpeechFailed()
      return false
    }
  }

  // ── MediaRecorder fallback path ───────────────────────────────────────────

  async function _startMediaRecorder(): Promise<void> {
    try {
      _mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onError('mic_denied')
      _cleanup()
      return
    }

    _chunks = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''

    try {
      _mediaRecorder = new MediaRecorder(_mediaStream, mimeType ? { mimeType } : undefined)
    } catch {
      _mediaRecorder = new MediaRecorder(_mediaStream)
    }

    _mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) _chunks.push(e.data)
    }

    _mediaRecorder.onstop = async () => {
      if (_chunks.length === 0) {
        _cleanup()
        return
      }
      const blob = new Blob(_chunks, { type: _mediaRecorder?.mimeType ?? 'audio/webm' })
      _chunks = []
      await _transcribeBlob(blob)
      _cleanup()
    }

    _mediaRecorder.onerror = () => {
      onError('mic_error')
      _cleanup()
    }

    _mediaRecorder.start(250) // collect chunks every 250ms
    isRecording.value = true
    onStatusChange(true)
  }

  async function _transcribeBlob(blob: Blob): Promise<void> {
    const fd = new FormData()
    fd.append('audio', blob, 'recording.webm')
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        onError('mic_error')
        return
      }
      const data = await res.json()
      const text: string = data.transcript ?? data.text ?? ''
      if (text) onTranscript(text)
    } catch {
      onError('mic_network')
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  function _cleanup() {
    if (_recognition) {
      try { _recognition.abort() } catch { /* ignore */ }
      _recognition = null
    }
    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
      try { _mediaRecorder.stop() } catch { /* ignore */ }
    }
    if (_mediaStream) {
      _mediaStream.getTracks().forEach((t) => t.stop())
      _mediaStream = null
    }
    _mediaRecorder = null
    isRecording.value = false
    onStatusChange(false)
  }

  // ── Public interface ──────────────────────────────────────────────────────

  async function startMic(): Promise<void> {
    if (isRecording.value) return

    // Prefer Web Speech API unless it previously failed
    if (hasSpeechRecognition && !_speechFailed()) {
      const started = _startSpeechRecognition()
      if (started) return
    }

    // Fallback: MediaRecorder + /api/transcribe
    if (hasMediaRecorder) {
      await _startMediaRecorder()
    } else {
      onError('mic_error')
    }
  }

  function stopMic(): void {
    if (!isRecording.value) return
    if (_recognition) {
      try { _recognition.stop() } catch { /* ignore */ }
    } else if (_mediaRecorder && _mediaRecorder.state === 'recording') {
      _mediaRecorder.stop()
    }
    // _cleanup() will be called via onend / onstop callbacks
  }

  return {
    isSupported,
    isRecording,
    startMic,
    stopMic,
  }
}
