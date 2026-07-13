import type { RoadsideRequest, RoadsideRequestStatus } from '@/types/database';

const STATUS_FLOW: RoadsideRequestStatus[] = [
  'requested',
  'assigned',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
];

const STEP_MS = 8000;

type SimulationCallbacks = {
  onStatusChange: (status: RoadsideRequestStatus) => Promise<void> | void;
};

const activeSimulations = new Map<string, ReturnType<typeof setTimeout>>();

export class MockRoadsideProvider {
  startSimulation(requestId: string, callbacks: SimulationCallbacks): void {
    this.stopSimulation(requestId);
    let step = 0;

    const tick = () => {
      step += 1;
      if (step >= STATUS_FLOW.length) return;
      const nextStatus = STATUS_FLOW[step];
      if (!nextStatus) return;
      void callbacks.onStatusChange(nextStatus);
      if (step < STATUS_FLOW.length - 1) {
        const timer = setTimeout(tick, STEP_MS);
        activeSimulations.set(requestId, timer);
      }
    };

    const timer = setTimeout(tick, STEP_MS);
    activeSimulations.set(requestId, timer);
  }

  stopSimulation(requestId: string): void {
    const timer = activeSimulations.get(requestId);
    if (timer) {
      clearTimeout(timer);
      activeSimulations.delete(requestId);
    }
  }

  /** Demo ETA text for UI display. */
  estimateArrivalMinutes(status: RoadsideRequestStatus): number | null {
    const index = STATUS_FLOW.indexOf(status);
    if (index < 0 || status === 'completed' || status === 'cancelled') return null;
    return Math.max(5, (STATUS_FLOW.length - index - 1) * 8);
  }
}

export function applyMockLocation(request: RoadsideRequest): RoadsideRequest {
  return request;
}
