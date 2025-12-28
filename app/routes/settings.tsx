import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { Mail } from 'lucide-react';

import { requireAuth } from '@/services/auth.server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useTranslation } from 'react-i18next';

type LoaderData = {
  user: { id: string; email: string; name: string; picture?: string; role: string };
};

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const user = await requireAuth(request);
  return { user };
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="border-b border-border pb-4 mb-8">
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
