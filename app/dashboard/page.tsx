import React from 'react';
// import { getUser as getUserAuth } from '@/lib/auth/auth-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, LogOut } from 'lucide-react';
import { getUser } from '@/queries/user';
import { signOut } from '@/lib/auth/actions/password';

const Dashboard = async () => {
  // const authUser = await getUserAuth();
  // console.log('🚀 ~ Dashboard ~ authUser:', authUser);

  const user = await getUser();
  console.log('🚀 ~ Dashboard ~ user:', user);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access the dashboard.</p>
      </div>
    );
  }

  // console.log('🚀 ~ Dashboard ~ profile:', profile);
  // console.log('🚀 ~ Dashboard ~ user:', user);

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <p>Please log in to access the dashboard.</p>
  //     </div>
  //   );
  // }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your Veltex dashboard
          </p>
        </div>
        <Button
          variant="outline"
          onClick={signOut}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>{user.user_metadata?.full_name || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span>{user.email}</span>
            </div>
            {user?.user_metadata.company_name && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Company:</span>
                <span>{user.user_metadata.company_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional dashboard content can go here */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Dashboard features coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
