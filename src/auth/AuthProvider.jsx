import { Auth0Provider } from '@auth0/auth0-react';

const authDomain = process.env.REACT_APP_AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN';
const authClientId = process.env.REACT_APP_AUTH0_CLIENT_ID || 'YOUR_AUTH0_CLIENT_ID';
const authAudience = process.env.REACT_APP_AUTH0_AUDIENCE || '';

function AuthProvider({ children }) {
  return (
    <Auth0Provider
      domain={authDomain}
      clientId={authClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: authAudience || undefined,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
}

export default AuthProvider;
