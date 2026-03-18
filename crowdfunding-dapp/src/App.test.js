import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  expect(screen.getByText(/Crowdfunding DApp/i)).toBeInTheDocument();
  expect(screen.getByText(/Developed by/i)).toBeInTheDocument();
});
