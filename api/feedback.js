// api/feedback.js
// Serverless function that appends feedback directly to feedback.csv in your GitHub repo root.
// Works from BOTH gopeek-lovat.vercel.app AND gopeekapp.github.io/gopeek (CORS enabled).
// Requires these environment variables in Vercel:
//   GITHUB_TOKEN  – a personal access token with repo scope
//   GITHUB_OWNER  – GitHub username or org
//   GITHUB_REPO   – repository name
//   GITHUB_BRANCH – target branch (defaults to "main")

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://gopeek-lovat.vercel.app',
  'https://gopeekapp.github.io',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5500'
];

function getCorsHeaders(origin) {
  // Allow exact matches or any subpath of allowed origins
  const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin?.startsWith(o + '/'));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const corsHeaders = getCorsHeaders(origin);

  // Set CORS headers on every response
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, rating, name, email, message } = req.body || {};

  if (!type || !rating || !message) {
    return res.status(400).json({ error: 'Missing required fields: type, rating, message' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
  const path = 'feedback.csv';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO must be set.'
    });
  }

  const timestamp = new Date().toISOString();
  const escape = (str) => (str || '').toString().replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
  const newRow = `"${escape(timestamp)}","${escape(type)}","${escape(rating)}","${escape(name)}","${escape(email)}","${escape(message)}"\n`;

  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `token ${token}`,
    'User-Agent': 'GoPeek-Feedback-Form',
    Accept: 'application/vnd.github.v3+json'
  };

  try {
    // 1. Try to fetch existing file
    let content = '';
    let sha = null;

    const getRes = await fetch(`${apiBase}/contents/${path}?ref=${branch}`, { headers });
    if (getRes.status === 404) {
      content = 'timestamp,type,rating,name,email,message\n';
    } else if (getRes.ok) {
      const data = await getRes.json();
      content = Buffer.from(data.content, 'base64').toString('utf-8');
      sha = data.sha;
    } else {
      const errText = await getRes.text();
      throw new Error(`GitHub GET ${getRes.status}: ${errText}`);
    }

    // 2. Append row and encode
    const updatedContent = content + newRow;
    const encodedContent = Buffer.from(updatedContent).toString('base64');

    // 3. Commit updated file
    const body = {
      message: `feedback: ${type} (${rating}★) from ${name || 'anonymous'}`,
      content: encodedContent,
      branch,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(`${apiBase}/contents/${path}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `GitHub PUT ${putRes.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Feedback API Error]', error);
    return res.status(500).json({
      error: 'Failed to save feedback',
      detail: error.message
    });
  }
}
