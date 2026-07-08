import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { Welcome } from './components/Welcome';
import { ResetPassword } from './components/ResetPassword';
import { useAuth } from './lib/auth';

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
const Lists = lazy(() =>
  import('./pages/Lists').then((m) => ({ default: m.Lists })),
);
const Wrapped = lazy(() =>
  import('./pages/Wrapped').then((m) => ({ default: m.Wrapped })),
);

function Spinner() {
  return (
    <div className="flex min-h-full items-center justify-center pt-24">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/10 border-t-gold" />
    </div>
  );
}

export default function App() {
  const { enabled, ready, user, guest, recovery } = useAuth();

  // Completing a password-reset link takes priority over everything else.
  if (recovery) return <ResetPassword />;

  // Wait for the initial session check so we don't flash the welcome screen
  // at an already-signed-in user.
  if (enabled && !ready) return <Spinner />;

  // Auth-first: show the welcome/login screen until the user signs in or
  // explicitly chooses to explore as a guest.
  if (enabled && !user && !guest) return <Welcome />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route
          path="/show/:id"
          element={
            <Suspense fallback={<Spinner />}>
              <ShowDetail />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<Spinner />}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="/import"
          element={
            <Suspense fallback={<Spinner />}>
              <Import />
            </Suspense>
          }
        />
        <Route
          path="/lists"
          element={
            <Suspense fallback={<Spinner />}>
              <Lists />
            </Suspense>
          }
        />
        <Route
          path="/wrapped"
          element={
            <Suspense fallback={<Spinner />}>
              <Wrapped />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
