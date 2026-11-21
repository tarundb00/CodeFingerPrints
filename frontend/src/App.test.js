import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the project landing page', () => {
  render(<App />);
  expect(screen.getByRole('heading', {name: /make every.*contribution visible/i})).toBeInTheDocument();
});
