import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function AuthButtons() {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [actionError, setActionError] = useState('');

  const handleLogin = async () => {
    setActionError('');

    try {
      await loginWithRedirect();
    } catch (loginError) {
      setActionError(loginError.message || 'Unable to start login.');
    }
  };

  const handleSignup = async () => {
    setActionError('');

    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
        },
      });
    } catch (signupError) {
      setActionError(signupError.message || 'Unable to start signup.');
    }
  };

  const handleLogout = async () => {
    setActionError('');

    try {
      await logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    } catch (logoutError) {
      setActionError(logoutError.message || 'Unable to logout.');
    }
  };

  if (isLoading) {
    return <p>Loading authentication...</p>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Logged in as: {user?.email || 'No email available'}</p>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div>
          <button type="button" onClick={handleLogin}>
            Login
          </button>{' '}
          <button type="button" onClick={handleSignup}>
            Signup
          </button>
        </div>
      )}

      {error ? <p>{error.message || 'Authentication error.'}</p> : null}
      {actionError ? <p>{actionError}</p> : null}
    </div>
  );
}

export default AuthButtons;