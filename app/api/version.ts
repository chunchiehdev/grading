import { LoaderFunction } from 'react-router';
import { getVersionInfo } from '@/services/version.server';

export const loader: LoaderFunction = async ({ request }) => {
  const versionInfo = getVersionInfo();
  return Response.json(versionInfo);
};
