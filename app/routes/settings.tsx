import { type LoaderFunctionArgs, type ActionFunctionArgs, Form, useNavigation, useActionData } from 'react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { Mail, Settings as SettingsIcon, Cpu, Cloud, Zap } from 'lucide-react';

import { requireAuth } from '@/services/auth.server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useTranslation } from 'react-i18next';

type LoaderData = {
  user: { id: string; email: string; name: string; picture?: string; role: string };
  modelProvider: 'gemini' | 'local' | 'auto';
};

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const user = await requireAuth(request);
  
  // Read model preference from cookie
  const cookieHeader = request.headers.get('Cookie');
  let modelProvider: 'gemini' | 'local' | 'auto' = 'auto'; // Default
  
  if (cookieHeader) {
    const match = cookieHeader.match(/ai-model-provider=(gemini|local|auto)/);
    if (match) {
      modelProvider = match[1] as any;
    }
  }
  
  return { user, modelProvider };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const modelProvider = formData.get('modelProvider') as string;
  
  if (!['gemini', 'local', 'auto'].includes(modelProvider)) {
    return new Response(JSON.stringify({ error: 'Invalid provider' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Set cookie
  // Set cookie
  const cookie = `ai-model-provider=${modelProvider}; Path=/; Max-Age=31536000; SameSite=Lax`;
  
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Set-Cookie': cookie,
      'Content-Type': 'application/json',
    },
  });
}

export default function Settings() {
  const { user, modelProvider } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['settings', 'common']);
  const navigation = useNavigation();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const isSaving = navigation.state === 'submitting';

  useEffect(() => {
    if (actionData?.success) {
      toast.success(t('common:success'), {
        description: 'AI model preference saved successfully.',
      });
    } else if (actionData?.error) {
      toast.error(t('common:error'), {
        description: actionData.error,
      });
    }
  }, [actionData, t]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground">{t('settings:title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('settings:subtitle')}</p>
      </div>

      {/* Personal Information Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="text-2xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">{user.name}</h2>
              <div className="flex items-center gap-2 justify-center sm:justify-start text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div>
                <Badge variant="secondary" className="text-sm">
                  {t(`common:roles.${user.role.toLowerCase()}`)}
                </Badge>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* AI Model Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <CardTitle>AI Model Configuration</CardTitle>
          </div>
          <CardDescription>
            Choose which AI model provider to use for grading and chat assistance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <RadioGroup defaultValue={modelProvider} name="modelProvider" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Option 1: Auto (Resilient) */}
              <div>
                <RadioGroupItem value="auto" id="auto" className="peer sr-only" />
                <Label
                  htmlFor="auto"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Zap className="mb-3 h-6 w-6" />
                  <div className="text-center space-y-1">
                    <div className="font-semibold">Resilient (Auto)</div>
                    <div className="text-xs text-muted-foreground">Prioritizes Local, falls back to Gemini if unavailable.</div>
                  </div>
                </Label>
              </div>

              {/* Option 2: Local (vLLM) */}
              <div>
                <RadioGroupItem value="local" id="local" className="peer sr-only" />
                <Label
                  htmlFor="local"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Cpu className="mb-3 h-6 w-6" />
                  <div className="text-center space-y-1">
                    <div className="font-semibold">Local (vLLM)</div>
                    <div className="text-xs text-muted-foreground">Force use of local model. Privacy focused.</div>
                  </div>
                </Label>
              </div>

              {/* Option 3: Gemini Cloud */}
              <div>
                <RadioGroupItem value="gemini" id="gemini" className="peer sr-only" />
                <Label
                  htmlFor="gemini"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Cloud className="mb-3 h-6 w-6" />
                  <div className="text-center space-y-1">
                    <div className="font-semibold">Gemini 2.5 Flash</div>
                    <div className="text-xs text-muted-foreground">Force use of Google's cloud model. Fast & reliable.</div>
                  </div>
                </Label>
              </div>

            </RadioGroup>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <ErrorPage
        statusCode={401}
        messageKey="errors.401.message"
        returnTo="/"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.message"
      returnTo="/"
    />
  );
}
