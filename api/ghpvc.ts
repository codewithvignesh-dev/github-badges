import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = (req.query.user as string)?.trim()
  const label = (req.query.label as string)?.trim() || 'Profile Views'

  if (!user) {
    res.status(400).send('Usage: /ghpvc?user=<username>&label=Profile Views')
    return
  }

  // Get or create user row
  const { data, error } = await supabase
    .from('profile_views')
    .select('count')
    .eq('username', user)
    .maybeSingle()

  if (error) {
    console.error(error)
    res.status(500).send('Database error: ' + error.message)
    return
  }

  let newCount = (data?.count ?? 0) + 1

  // Upsert count
  const { error: upsertError } = await supabase
    .from('profile_views')
    .upsert({ username: user, count: newCount })

  if (upsertError) {
    console.error(upsertError)
    res.status(500).send('Update error: ' + upsertError.message)
    return
  }

  // --- SVG Badge ---
  const labelWidth = Math.max(80, label.length * 7.2)
  const valueText = newCount.toLocaleString()
  const valueWidth = Math.max(40, valueText.length * 7.2)
  const totalWidth = labelWidth + valueWidth

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
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#8957e5"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${valueText}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${valueText}</text>
  </g>
</svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.status(200).send(svg)
}
