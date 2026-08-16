import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the StockYard dashboard on load', async () => {
  render(<App />);
  expect(await screen.findByText(/Good morning/i)).toBeInTheDocument();
  expect(screen.getByText('StockYard')).toBeInTheDocument();
});
