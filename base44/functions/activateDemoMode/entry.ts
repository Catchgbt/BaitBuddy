
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // 1. Authenticate user and initialize SDK
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get password from request body
        const { password } = await req.json();
        if (typeof password !== 'string') {
            return Response.json({ success: false, error: 'Password must be a string' }, { status: 400 });
        }

        // 3. Get secret from environment
        const demoPassword = Deno.env.get("demomodus");
        if (!demoPassword) {
            return Response.json({ success: false, error: 'Demo mode is not configured on the server.' }, { status: 500 });
        }
        
        // 4. Check password and update user
        if (password === demoPassword) {
            // Use service role to update user data
            await base44.asServiceRole.entities.User.update(user.id, {
                is_demo_user: true
            });
            return Response.json({ success: true, message: 'Demo-Modus aktiviert!' });
        } else if (password === "") { // Optional: way to deactivate
             await base44.asServiceRole.entities.User.update(user.id, {
                is_demo_user: false
            });
            return Response.json({ success: true, message: 'Demo-Modus deaktiviert!' });
        }
        else {
            return Response.json({ success: false, error: 'Ungültiges Passwort' }, { status: 403 });
        }

    } catch (error) {
        console.error('Error in activateDemoMode:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});
