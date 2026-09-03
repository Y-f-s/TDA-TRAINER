import type { Config } from '@netlify/functions'

interface ChatRequest {
  prompt?: unknown
}

interface VpsChatResponse {
  status?: unknown
  answer?: unknown
  message?: unknown
}

const DEFAULT_VPS_CHAT_URL = 'http://116.212.73.71:8000/chat'

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json(
      { status: 'error', message: 'Method Not Allowed' },
      { status: 405 },
    )
  }

  let prompt = ''
  try {
    const data = (await req.json()) as ChatRequest
    prompt = typeof data.prompt === 'string' ? data.prompt.trim() : ''
  } catch {
    return Response.json(
      { status: 'error', message: 'Body request tidak valid.' },
      { status: 400 },
    )
  }

  if (!prompt) {
    return Response.json(
      { status: 'error', message: 'Pertanyaan tidak boleh kosong.' },
      { status: 400 },
    )
  }

  const vpsChatUrl = Netlify.env.get('VPS_CHAT_URL') || DEFAULT_VPS_CHAT_URL

  try {
    const response = await fetch(vpsChatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(30_000),
    })

    const responseText = await response.text()
    let data: VpsChatResponse

    try {
      data = JSON.parse(responseText) as VpsChatResponse
    } catch {
      throw new Error('VPS mengirim respons yang tidak valid.')
    }

    if (!response.ok || data.status === 'error') {
      const message = typeof data.message === 'string'
        ? data.message
        : `VPS merespons dengan status ${response.status}.`

      throw new Error(message)
    }

    if (typeof data.answer !== 'string' || !data.answer.trim()) {
      throw new Error('VPS tidak mengirim jawaban AI.')
    }

    return Response.json({ status: 'success', answer: data.answer })
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Server AI VPS tidak merespons dalam 30 detik.'
      : error instanceof Error
        ? error.message
        : String(error)

    return Response.json({ status: 'error', message }, { status: 502 })
  }
}

export const config: Config = {
  method: 'POST',
}
