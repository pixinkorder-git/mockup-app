import { createClient } from '@supabase/supabase-js'
import templates from '../public/templates.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function seed() {
  const { error } = await supabase.from('mockup_templates').insert(templates)
  if (error) console.error(error)
  else console.log(`Seeded ${templates.length} templates`)
}

seed()
