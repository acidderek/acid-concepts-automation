import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export const AuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg 
              width="120" 
              height="32" 
              viewBox="0 0 755.97 201.99" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <style>
                  {`.cls-1 { fill: #496fb1; }`}
                </style>
              </defs>
              <path className="cls-1" d="M209.46,201.99H72.98l25.61-52.52h56.56l-34.34-69.25-62.23,121.77H0L93.39,17.03c2.6-5.09,6.54-9.38,11.4-12.41C109.64,1.6,115.24,0,120.95,0s11.31,1.6,16.16,4.62c4.82,2.98,8.68,7.29,11.11,12.41l77.91,157.84c1.52,2.85,2.25,6.05,2.09,9.28-.15,3.23-1.18,6.35-2.96,9.04-1.59,2.76-3.9,5.04-6.68,6.59-2.78,1.55-5.93,2.32-9.12,2.22Z"/>
              <path className="cls-1" d="M333.25,52.52c-12.86,0-25.19,5.11-34.28,14.2-9.09,9.09-14.2,21.42-14.2,34.28s5.11,25.19,14.2,34.28,21.42,14.2,34.28,14.2h90.32v52.52h-90.32c-17.79.13-35.29-4.55-50.64-13.56-15.27-8.83-27.96-21.52-36.79-36.79-8.89-15.4-13.56-32.86-13.56-50.64s4.68-35.24,13.56-50.64c8.83-15.27,21.52-27.96,36.79-36.79C297.96,4.56,315.45-.13,333.25,0h90.32v52.52h-90.32Z"/>
              <path className="cls-1" d="M503.78,201.99h-52.52V0h52.52v201.98Z"/>
              <path className="cls-1" d="M654.98,0c17.79-.13,35.29,4.55,50.64,13.56,15.27,8.83,27.96,21.52,36.79,36.79,8.88,15.4,13.56,32.86,13.56,50.64s-4.68,35.24-13.56,50.64c-8.83,15.27-21.52,27.96-36.79,36.79-15.35,9.01-32.85,13.7-50.64,13.56h-116.57V0h116.57ZM654.98,149.47c12.86,0,25.19-5.11,34.28-14.2s14.2-21.42,14.2-34.28-5.11-25.19-14.2-34.28c-9.09-9.09-21.42-14.2-34.28-14.2h-64.06v96.95h64.06Z"/>
            </svg>
          </div>
          <CardDescription>
            Professional Automation Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};