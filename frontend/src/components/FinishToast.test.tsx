import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FinishToast, FINISH_TOAST_MESSAGE } from './FinishToast.js';

describe('FinishToast', () => {
  it('muestra el mensaje exacto con role status y aria-live polite', () => {
    render(<FinishToast open />);

    expect(screen.getByRole('status')).toHaveTextContent(FINISH_TOAST_MESSAGE);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('no renderiza nada cuando está cerrado', () => {
    render(<FinishToast open={false} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
