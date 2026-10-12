import {createBotHandler} from './handler.mjs';
Deno.serve(createBotHandler({env:{SUPABASE_URL:Deno.env.get('SUPABASE_URL'),SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}}));
