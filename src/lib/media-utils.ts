export function resampleAudio(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array<ArrayBuffer> {
  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.round(inputData.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1)
    const t = srcIndex - srcIndexFloor
    output[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t
  }

  return output
}

export function float32ToPcm16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm16
}

export function pcm16ToFloat32(pcm16: Int16Array): Float32Array<ArrayBuffer> {
  const float32 = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}

export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer as ArrayBuffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const audioWorkletProcessorCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        if (this.bufferIndex >= this.bufferSize) {
          this.port.postMessage({ audioData: this.buffer.slice() });
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`

export type VoiceGender = "male" | "female"

export const GEMINI_VOICES = [
  { name: "Kore", style: "Firm", gender: "female" },
  { name: "Aoede", style: "Breezy", gender: "female" },
  { name: "Leda", style: "Youthful", gender: "female" },
  { name: "Zephyr", style: "Bright", gender: "female" },
  { name: "Puck", style: "Upbeat", gender: "male" },
  { name: "Charon", style: "Informative", gender: "male" },
  { name: "Fenrir", style: "Excitable", gender: "male" },
  { name: "Orus", style: "Firm", gender: "male" },
] as const

export type GeminiVoiceName = (typeof GEMINI_VOICES)[number]["name"]

export const TTS_MODELS = [
  { id: "gemini-2.5-flash-lite-preview-tts", name: "Flash Lite", description: "Fastest response" },
  { id: "gemini-2.5-flash-preview-tts", name: "Flash", description: "Low latency" },
  { id: "gemini-2.5-pro-preview-tts", name: "Pro", description: "Highest quality" },
] as const

export type TTSModelId = (typeof TTS_MODELS)[number]["id"]

export const DEFAULT_TTS_MODEL: TTSModelId = "gemini-2.5-flash-lite-preview-tts"
export const DEFAULT_VOICE: GeminiVoiceName = "Kore"

export const LIVE_MODEL =
  process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL ||
  "models/gemini-2.5-flash-native-audio-preview-12-2025"

export interface ProsodyData {
  energy: number
  brightness: number
}

export function analyzeProsody(
  frequencyData: Uint8Array,
  normalizedLevel: number
): ProsodyData {
  if (normalizedLevel <= 0.05) {
    return { energy: 0, brightness: 0.5 }
  }

  const energy = Math.min(1, normalizedLevel * 1.5)
  const speechBins = Math.min(64, frequencyData.length)

  let weightedSum = 0
  let totalMagnitude = 0
  for (let i = 0; i < speechBins; i++) {
    weightedSum += i * frequencyData[i]
    totalMagnitude += frequencyData[i]
  }

  const rawCentroid = totalMagnitude > 0 ? weightedSum / totalMagnitude / speechBins : 0.5
  const brightness = Math.min(1, Math.max(0, (rawCentroid - 0.1) / 0.4))

  return { energy, brightness }
}
