
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function checkMigration() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  const tables = [
    'tenants',
    'profiles',
    'contacts',
    'leads',
    'deals'
  ]

  console.log('Checking tables...')
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      if (error.code === '42P01') {
        console.error(`Migration check failed: Table "${table}" does not exist.`)
      } else {
        console.error(`Migration check failed for "${table}":`, error.message)
      }
    } else {
      console.log(`Migration check successful: Table "${table}" exists.`)
    }
  }
}

checkMigration()
