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
const MovieDetail = lazy(() =>
  import('./pages/MovieDetail').then((m) => ({ default: m.MovieDetail })),
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
const Library = lazy(() =>
  import('./pages/Library').then((m) => ({ default: m.Library })),
);
const People = lazy(() =>
  import('./pages/People').then((m) => ({ default: m.People })),
);
const UserProfile = lazy(() =>
  import('./pages/UserProfile').then((m) => ({ default: m.UserProfile })),
);
const Wrapped = lazy(() =>
  import('./pages/Wrapped').then((m) => ({ default: m.Wrapped })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
);
const Notifications = lazy(() =>
  import('./pages/Notifications').then((m) => ({ default: m.Notifications })),
);

function Spinner() {
  return (
    <div className="flex min-h-full items-center justify-center pt-24">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-overlay/10 border-t-gold" />
    </div>
  );
}

export default function App() {
  const { enabled, ready, user, recovery } = useAuth();

  // Completing a password-reset link takes priority over everything else.
  if (recovery) return <ResetPassword />;

  // Wait for the initial session check so we don't flash the welcome screen
  // at an already-signed-in user.
  if (enabled && !ready) return <Spinner />;

  // Auth-first: an account is required — show the welcome/login screen until
  // the user signs in.
  if (enabled && !user) return <Welcome />;

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
          path="/movie/:id"
          element={
            <Suspense fallback={<Spinner />}>
              <MovieDetail />
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
          path="/library"
          element={
            <Suspense fallback={<Spinner />}>
              <Library />
            </Suspense>
          }
        />
        <Route
          path="/people"
          element={
            <Suspense fallback={<Spinner />}>
              <People />
            </Suspense>
          }
        />
        <Route
          path="/u/:id"
          element={
            <Suspense fallback={<Spinner />}>
              <UserProfile />
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
        <Route
          path="/settings"
          element={
            <Suspense fallback={<Spinner />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="/notifications"
          element={
            <Suspense fallback={<Spinner />}>
              <Notifications />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
