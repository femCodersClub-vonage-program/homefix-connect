import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JoinButton } from './JoinButton.js';

describe('JoinButton', () => {
  it('habilita "Entrar a la videollamada" con visita asignada y confirmada', () => {
    render(
      <JoinButton incidentStatus="VISIT_ASSIGNED" visitStatus="CONFIRMED" />,
    );

    expect(
      screen.getByRole('button', { name: /entrar a la videollamada/i }),
    ).toBeEnabled();
  });

  it('muestra "Visita realizada" deshabilitado con VIDEO_COMPLETED', () => {
    render(
      <JoinButton incidentStatus="VIDEO_COMPLETED" visitStatus="CONFIRMED" />,
    );

    expect(
      screen.getByRole('button', { name: /visita realizada/i }),
    ).toBeDisabled();
  });

  it('muestra "Videollamada no disponible" deshabilitado sin visita confirmada', () => {
    render(<JoinButton incidentStatus="REPORTED" visitStatus={null} />);

    expect(
      screen.getByRole('button', { name: /videollamada no disponible/i }),
    ).toBeDisabled();
  });

  it('muestra "Conectando…" deshabilitado y no llama a onClick', () => {
    const onClick = vi.fn();

    render(
      <JoinButton
        incidentStatus="VISIT_ASSIGNED"
        visitStatus="CONFIRMED"
        isConnecting
        onClick={onClick}
      />,
    );

    const button = screen.getByRole('button', { name: /conectando/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
