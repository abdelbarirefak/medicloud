import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cronLimiter, getClientId, checkRateLimit } from '@/lib/ratelimit';

// Construct an edge-friendly Admin Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS to clean up DB
);

export async function GET(request: Request) {
    // 0. Rate limiting — 5 req/min
    const rl = await checkRateLimit(cronLimiter, getClientId(request));
    if (rl) return rl;

    // 1. Security Check: Block external abusers, allow only Vercel Cron
    const authHeader = request.headers.get('Authorization');
    
    // In local development, we allow bypass if bypass=true is in the query params.
    // In production, we ONLY allow Vercel.
    const url = new URL(request.url);
    const isLocalBypass = process.env.NODE_ENV === "development" && url.searchParams.get("bypass") === "true";
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isLocalBypass) {
        return NextResponse.json({ error: 'Unauthorized Access. Not triggered by Vercel.' }, { status: 401 });
    }

    try {
        // Calculate the threshold time: 48 hours ago
        const thresholdDate = new Date();
        thresholdDate.setHours(thresholdDate.getHours() - 48);

        // Fetch old inactive appointments
        const { data: staleAppointments, error: fetchError } = await supabase
            .from('appointments')
            .select('id, status, date_time')
            .in('status', ['pending', 'confirmed'])
            .lt('date_time', thresholdDate.toISOString());

        if (fetchError) throw fetchError;

        if (!staleAppointments || staleAppointments.length === 0) {
            return NextResponse.json({ message: 'Clean. No inactive appointments found.', updated: 0 });
        }

        const idsToArchive = staleAppointments.map(a => a.id);

        // Batch update to 'cancelled' (representing archived/no-show) and add a systemic note
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ 
                status: 'cancelled', 
                notes: '⚠️ Archivage automatique : Le rendez-vous a expiré (plus de 48h) sans clôture du médecin.' 
            })
            .in('id', idsToArchive);

        if (updateError) throw updateError;

        // Log to our system notification table
        // For admin dashboard overview
        const adminMessage = `${idsToArchive.length} rendez-vous expirés ont été annulés automatiquement par l'agent Cloud.`;
        
        return NextResponse.json({ 
            message: 'Garbage Collection successful', 
            updated: idsToArchive.length,
            details: adminMessage
        }, { status: 200 });

    } catch (error: unknown) {
        const details = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: 'Internal Server Error', details }, { status: 500 });
    }
}
