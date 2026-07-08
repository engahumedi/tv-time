import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';

// Code-split the heavier routes: ShowDetail pulls episode data, Profile bundles
// the charting lib, and Import bundles the ZIP/CSV parsers. Keeping them out of
// the initial chunk makes Home paint faster.
const ShowDetail = lazy(() =>
  import('./pages/ShowDetail').then((m) => ({ default: m.ShowDetail })),
);
const Profile = lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.Profile })),
);
const Import = lazy(() =>
  import('./pages/Import').then((m) => ({ default: m.Import })),
);

function PageFallback() {
  return (
    <div className="flex justify-center pt-24">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/10 border-t-gold" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route
          path="/show/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <ShowDetail />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<PageFallback />}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="/import"
          element={
            <Suspense fallback={<PageFallback />}>
              <Import />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
