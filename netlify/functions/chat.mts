import type { Config } from '@netlify/functions'

const SYSTEM_PROMPT =
  'Anda adalah asisten publik TDA Trainer Jakarta Selatan yang ramah, profesional, dan informatif. Jawab dalam Bahasa Indonesia.'

interface ChatRequest {
  prompt?: unknown
}

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

  const apiKey = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')
  const baseUrl = (Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL') || '').replace(/\/+$/, '')

  if (!apiKey || !baseUrl) {
    return Response.json(
      { status: 'error', message: 'AI Gateway belum aktif untuk situs ini.' },
      { status: 500 },
    )
  }

  const body = JSON.stringify({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: 2048,
  })

  try {
    let response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    })

    if (response.status === 404) {
      response = await fetch(`${baseUrl}/openai/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      })
    }

    const resData = await response.json()

    if (!response.ok || resData.error) {
      throw new Error(resData?.error?.message || 'Gagal mendapatkan respons dari AI Gateway.')
    }

    const answer = resData.choices?.[0]?.message?.content || 'Maaf, respons kosong.'

    return Response.json({ status: 'success', answer })
  } catch (error) {
    return Response.json(
      { status: 'error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export const config: Config = {}
