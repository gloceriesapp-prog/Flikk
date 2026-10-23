export interface AlertOrder {
  id: string;
  placed_at: string;
  store_visible_at?: string | null;
  acceptance_deadline_at?: string | null;
  accepted_at?: string | null;
  status: string;
}

export function acceptanceWindow(order: AlertOrder) {
  const start = Date.parse(order.store_visible_at || order.placed_at);
  const deadline = order.acceptance_deadline_at ? Date.parse(order.acceptance_deadline_at) : start + 60_000;
  return Number.isFinite(start) && Number.isFinite(deadline) && deadline > start ? { start, deadline } : null;
}

// Select the most recent due cue after a delayed poll/tab resume. Earlier cues
// are consumed together, preventing a burst of three clips on reconnect.
export function dueAlert(order: AlertOrder, now: number, consumed: ReadonlySet<string>) {
  const window = acceptanceWindow(order);
  if (!window || order.status !== 'placed' || order.accepted_at || now < window.start || now >= window.deadline) return null;
  const stages = [
    { key: `${order.id}:arrival`, at: window.start },
    { key: `${order.id}:reminder`, at: window.start + 25_000 },
    { key: `${order.id}:final`, at: window.deadline - 5_000 },
  ].filter(stage => stage.at >= window.start && stage.at <= now);
  const unplayed = stages.filter(stage => !consumed.has(stage.key));
  if (!unplayed.length) return null;
  return { consume: stages.map(stage => stage.key), deadline: window.deadline };
}
