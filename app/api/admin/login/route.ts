import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { windowMs: 60_000, max: 10, label: 'admin-login' });
    if (limited) return limited;

    const body = await req.json();
    const { username, password } = body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("[ADMIN_LOGIN] ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (username === adminUsername && password === adminPassword) {
      const token = createAdminToken();
      const isProd = process.env.NODE_ENV === 'production';
      return NextResponse.json(
        { success: true, message: 'Login successful' },
        {
          status: 200,
          headers: {
            'Set-Cookie': `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isProd ? '; Secure' : ''}`
          }
        }
      );
    }

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}