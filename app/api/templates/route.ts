import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('mockup_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
