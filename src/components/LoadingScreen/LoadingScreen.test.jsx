import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen Component', () => {
  it('renders a loading spinner', () => {
    const { container } = render(<LoadingScreen />);
    
    // Verificamos que el contenedor principal esté presente
    const wrapper = container.querySelector('.loading-screen');
    expect(wrapper).toBeInTheDocument();
    
    // Verificamos que el spinner esté presente dentro del contenedor
    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });
});
