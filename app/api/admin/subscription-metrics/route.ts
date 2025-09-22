import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user and check admin role
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get subscription metrics
    const supabase = await createServiceClient();
    const [subscriptionsResult, billingResult] = await Promise.all([
      supabase.from('subscriptions').select('*'),
      supabase.from('billing_history').select('*'),
    ]);

    const subscriptions = subscriptionsResult.data || [];
    const billingHistory = billingResult.data || [];

    // Calculate metrics
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active'
    ).length;
    const canceledSubscriptions = subscriptions.filter(
      (s) => s.status === 'canceled'
    ).length;

    // Calculate total revenue from billing history
    const totalRevenue = billingHistory
      .filter((b) => b.status === 'paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = billingHistory
      .filter((b) => {
        const invoiceDate = new Date(b.invoice_date);
        return (
          b.status === 'paid' &&
          invoiceDate.getMonth() === currentMonth &&
          invoiceDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate churn rate (canceled / total * 100)
    const churnRate =
      totalSubscriptions > 0
        ? (canceledSubscriptions / totalSubscriptions) * 100
        : 0;

    // Calculate average revenue per user
    const averageRevenuePerUser =
      activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

    const metrics = {
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      churnRate,
      averageRevenuePerUser,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
