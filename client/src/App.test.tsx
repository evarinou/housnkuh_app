import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock axios to prevent network calls in tests
jest.mock('axios');

test('renders app without crashing', () => {
  render(<App />);
  // Test that the app renders without throwing errors
  expect(document.body).toBeTruthy();
});
