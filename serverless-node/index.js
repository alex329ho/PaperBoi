'use strict';

const corsOrigin = process.env.CORS_ALLOW_ORIGIN || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': corsOrigin,
  'Access-Control-Allow-Headers':
    process.env.CORS_ALLOW_HEADERS || 'Content-Type,Authorization,X-Requested-With',
  'Access-Control-Allow-Methods':
    process.env.CORS_ALLOW_METHODS || 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'false',
  'Content-Type': 'application/json',
};

const sampleArticles = [
  {
    id: 1,
    title: 'PaperBoi Launches Serverless',
    summary: 'A minimal AWS Lambda API now powers PaperBoi.',
    url: 'https://example.com/articles/1',
  },
  {
    id: 2,
    title: 'Global Headlines: Today',
    summary: 'A quick scan of the top stories from around the world.',
    url: 'https://example.com/articles/2',
  },
  {
    id: 3,
    title: 'Tech Digest',
    summary: 'New releases, funding news, and product launches.',
    url: 'https://example.com/articles/3',
  },
];

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

const normalizePath = (event) => {
  const stage = event.requestContext && event.requestContext.stage;
  let path = event.path || event.rawPath || '/';

  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1);
  }

  path = path.replace(/\/+$/, '');
  return path === '' ? '/' : path;
};

const parseJsonBody = (event) => {
  if (!event.body) {
    return { ok: true, value: {} };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  try {
    return { ok: true, value: JSON.parse(rawBody) };
  } catch (error) {
    return { ok: false };
  }
};

exports.handler = async (event) => {
  const method = (
    event.httpMethod ||
    (event.requestContext && event.requestContext.http && event.requestContext.http.method) ||
    'GET'
  ).toUpperCase();
  const path = normalizePath(event);

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (path === '/articles' && method === 'GET') {
    return jsonResponse(200, { articles: sampleArticles });
  }

  if (path === '/articles' && method === 'POST') {
    const parsed = parseJsonBody(event);
    if (!parsed.ok) {
      return jsonResponse(400, { message: 'Invalid JSON body.' });
    }

    return jsonResponse(200, {
      message: 'Article received successfully.',
      data: parsed.value,
    });
  }

  if (path === '/articles') {
    return jsonResponse(405, { message: 'Method Not Allowed.' });
  }

  return jsonResponse(404, { message: 'Not Found.' });
};
