import { configuration, contactHandler } from '../_shared/contact.ts';
Deno.serve(contactHandler(() => configuration(key => Deno.env.get(key))));
