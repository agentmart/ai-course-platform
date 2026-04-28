// Minimal probe to diagnose FUNCTION_INVOCATION_FAILED
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ ok: true, action: req.query?.action || null, method: req.method });
}
