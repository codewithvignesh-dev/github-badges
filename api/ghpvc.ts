import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.gh_SUPABASE_URL!
const supabaseKey = process.env.gh_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = (req.query.user as string)?.trim()
  const label = (req.query.label as string)?.trim() || 'Profile Views'

  if (!user) {
    res.status(400).send('Usage: /ghpvc?user=<username>&label=Profile Views')
    return
  }

  // Get or increment the counter
  const { data, error } = await supabase
    .from('profile_views')
    .select('count')
    .eq('username', user)
    .single()

  let views = 0

  if (error && error.code === 'PGRST116') {
    // No record found — insert a new one
    const { data: inserted } = await supabase
      .from('profile_views')
      .insert({ username: user, count: 1 })
      .select('count')
      .single()
    views = inserted?.count || 1
  } else if (data) {
    // Increment existing record
    const newCount = (data.count ?? 0) + 1
    const { data: updated } = await supabase
      .from('profile_views')
      .update({ count: newCount })
      .eq('username', user)
      .select('count')
      .single()
    views = updated?.count || newCount
  }

  // --- Badge layout ---
  const labelText = label
  const valueText = views.toLocaleString()
  const labelWidth = Math.max(60, labelText.length * 7.2)
  const valueWidth = Math.max(40, valueText.length * 7.2)
  const totalWidth = labelWidth + valueWidth

  // --- SVG badge ---
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#007ec6"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${labelText}</text>
    <text x="${labelWidth / 2}" y="14">${labelText}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${valueText}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${valueText}</text>
  </g>
</svg>
  `.trim()

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'no-cache')
  res.status(200).send(svg)
}
