import { configuration, notificationHandler } from '../_shared/contact.ts';
Deno.serve(notificationHandler(() => configuration(key => Deno.env.get(key))));
