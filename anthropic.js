/**
 * AI Paradise — Anthropic API Proxy
 * 
 * このファイルがAPIキーを安全にサーバー側で保持します。
 * フロントエンドはこのエンドポイント(/api/anthropic)を呼び出します。
 * APIキーはVercelの環境変数にのみ存在し、ブラウザには絶対に渡りません。
 */

export const config = {
  runtime: 'edge', // Vercel Edge Functionとして動作（高速）
};

// 許可するオリジン（本番では自分のドメインに変更）
const ALLOWED_ORIGINS = [
  'https://ai-paradise.vercel.app',
  'https://ai-paradise.jp',
  'http://localhost:3000',
  'http://localhost:5173',
];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  // CORS プリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // POSTのみ許可
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // オリジン検証（本番環境のみ厳格チェック）
  if (process.env.NODE_ENV === 'production' && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // APIキーの存在確認
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // リクエストのバリデーション
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // max_tokensの上限を強制（コスト爆発防止）
    const MAX_TOKENS_LIMIT = 2000;
    if (body.max_tokens > MAX_TOKENS_LIMIT) {
      body.max_tokens = MAX_TOKENS_LIMIT;
    }

    // モデルをサーバー側で固定（フロントからの改ざん防止）
    body.model = 'claude-sonnet-4-20250514';

    // Anthropic APIへプロキシ
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // web_searchを使う場合に必要
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicRes.json();

    // Anthropic側のエラーをそのまま返す
    if (!anthropicRes.ok) {
      console.error('Anthropic API error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Anthropic API error' }), {
        status: anthropicRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
