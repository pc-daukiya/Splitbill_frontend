import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    loginWithRedirect: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('./components/WalletConnect.jsx', () => () => <div data-testid="wallet-connect" />);
jest.mock('./components/Navbar', () => () => <div data-testid="navbar" />);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard page</div>);
jest.mock('./pages/GroupPage', () => () => <div>Group page</div>);

test('renders the landing page headline', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByText(/split bills on algorand/i)).toBeInTheDocument();
});
