import { createReportHandler } from './handler.mjs';
Deno.serve(createReportHandler({env:{
 SUPABASE_URL:Deno.env.get('SUPABASE_URL'),
 SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY')
}}));
