import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve((req) => {
    try {
        const workingIcon = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/dcd615030_Screenshot_20250919_164159_Gallery.jpg';
        const iconBaseUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b';
        
        const manifest = {
            "id": "com.catchgbt.fishing.assistant.v3",
            "name": "BaitBuddy - Dein KI Angel-Assistent von Sebastian Schorn",
            "short_name": "BaitBuddy",
            "description": "Angel-App mit KI-Assistent. Finde die besten Angelplätze, erhalte intelligente Tipps und dokumentiere deine Fänge!",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#0b1324",
            "theme_color": "#0b1324",
            "orientation": "portrait-primary",
            "scope": "/",
            "lang": "de-DE",
            "dir": "ltr",
            "categories": ["sports", "lifestyle", "utilities"],
            "screenshots": [
                {
                    "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/e9d6eda08_icon_512.png",
                    "sizes": "540x720",
                    "type": "image/png",
                    "form_factor": "narrow"
                },
                {
                    "src": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb3d3b9f83dc1f55ef532b/e9d6eda08_icon_512.png",
                    "sizes": "1280x720",
                    "type": "image/png",
                    "form_factor": "wide"
                }
            ],
            "icons": [
                {
                    "src": workingIcon,
                    "sizes": "192x192",
                    "type": "image/jpeg",
                    "purpose": "any"
                },
                {
                    "src": workingIcon,
                    "sizes": "512x512",
                    "type": "image/jpeg",
                    "purpose": "any maskable"
                }
            ],
            "shortcuts": [
                {
                    "name": "KI-Assistent",
                    "short_name": "KI",
                    "description": "Starte den KI Angel-Assistenten",
                    "url": "/AIAssistant",
                    "icons": [{"src": `${iconBaseUrl}/e9d6eda08_icon_512.png`, "sizes": "512x512"}]
                },
                {
                    "name": "Angelplätze",
                    "short_name": "Plätze",
                    "description": "Finde Angelplätze in deiner Nähe",
                    "url": "/Map",
                    "icons": [{"src": `${iconBaseUrl}/e9d6eda08_icon_512.png`, "sizes": "512x512"}]
                },
                {
                    "name": "Fangbuch",
                    "short_name": "Fänge",
                    "description": "Dokumentiere deine Fänge",
                    "url": "/Logbook",
                    "icons": [{"src": `${iconBaseUrl}/e9d6eda08_icon_512.png`, "sizes": "512x512"}]
                },
                {
                    "name": "Wetter",
                    "short_name": "Wetter",
                    "description": "Prüfe das Angelwetter",
                    "url": "/Weather",
                    "icons": [{"src": `${iconBaseUrl}/e9d6eda08_icon_512.png`, "sizes": "512x512"}]
                }
            ],
            "related_applications": [],
            "prefer_related_applications": false,
            "share_target": {
                "action": "/share",
                "method": "POST",
                "enctype": "multipart/form-data",
                "params": {
                    "files": [{"name": "photo", "accept": ["image/*"]}]
                }
            }
        };

        return new Response(JSON.stringify(manifest, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});