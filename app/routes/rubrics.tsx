import { Outlet } from 'react-router';
import RubricsIndexRoute from './rubrics._index';

export default function RubricsRoute() {
  return (
    <div className="container">
      <Outlet />
    </div>
  );
}

// Export the index route component for direct rendering
export { RubricsIndexRoute };
