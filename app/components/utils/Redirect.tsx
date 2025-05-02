import { redirect } from 'react-router';

export function createRedirectLoader(to: string) {
  return function loader() {
    return redirect(to);
  };
}
