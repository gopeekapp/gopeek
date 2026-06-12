// api/feedback.js
// Vercel Serverless Function - CommonJS format for maximum compatibility
// Appends feedback to feedback.csv in your GitHub repo

const GITHUB_API = 'https://api.github.com';

// CORS allowed origins
const ALLOWED_ORIGINS = [
  'https://gopeek-lovat.vercel.app',
  'https://gopeekapp.github.io',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  'null'  // for file:// protocol testing
];

function setCorsHeaders(res, origin) {
  const allowed = ALLOWED_ORIGINS.some(o => 
    origin === o || (origin && origin.startsWith(o + '/'))
  );
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  setCorsHeaders(res, origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Parse body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON body' 
      });
    }

    const { type, rating, name, email, message } = body;

    // Validate required fields
    if (!type || !rating || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: type, rating, message' 
      });
    }

    // Get env vars
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
    const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = 'feedback.csv';

    if (!token) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server config error: GITHUB_TOKEN not set' 
      });
    }
    if (!owner || !repo) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server config error: GITHUB_OWNER or GITHUB_REPO not set',
        detail: `owner=${owner}, repo=${repo}`
      });
    }

    // Build CSV row
    const timestamp = new Date().toISOString();
    const escape = (str) => (str || '').toString().replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
    const newRow = `"${escape(timestamp)}","${escape(type)}","${escape(rating)}","${escape(name)}","${escape(email)}","${escape(message)}"\n`;

    const apiBase = `${GITHUB_API}/repos/${owner}/${repo}`;
    const headers = {
      'Authorization': `token ${token}`,
      'User-Agent': 'GoPeek-Feedback-Form/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    // Fetch existing file
    let content = '';
    let sha = null;
    const getUrl = `${apiBase}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;

    const getRes = await fetch(getUrl, { headers });

    if (getRes.status === 404) {
      // File doesn't exist yet, create with header
      content = 'timestamp,type,rating,name,email,message\n';
    } else if (getRes.ok) {
      const data = await getRes.json();
      content = Buffer.from(data.content, 'base64').toString('utf-8');
      sha = data.sha;
    } else {
      const errText = await getRes.text();
      return res.status(502).json({ 
        success: false, 
        error: `GitHub API error: ${getRes.status}`,
        detail: errText.substring(0, 200)
      });
    }

    // Append and encode
    const updatedContent = content + newRow;
    const encodedContent = Buffer.from(updatedContent).toString('base64');

    // Commit
    const putBody = {
      message: `feedback: ${type} (${rating}\u2605) from ${(name || 'anonymous').substring(0, 30)}`,
      content: encodedContent,
      branch,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(`${apiBase}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(502).json({ 
        success: false, 
        error: `GitHub commit failed: ${putRes.status}`,
        detail: err.message || await putRes.text()
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Feedback API Error]', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      detail: error.message 
    });
  }
};
