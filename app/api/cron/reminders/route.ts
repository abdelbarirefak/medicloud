import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { error: 'This endpoint has been removed. Reminders are now handled via in-app notifications.' },
        { status: 410 }
    );
}
