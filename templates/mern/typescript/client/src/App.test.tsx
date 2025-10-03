import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the main app component with the correct title', () => {
  render(<App />);
  const headingElement = screen.getByText(/Vite \+ React/i);
  expect(headingElement).toBeInTheDocument();
});