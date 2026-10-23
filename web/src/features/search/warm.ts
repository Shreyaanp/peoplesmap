/** Press-down on a row starts loading that profile before the tap even ends. */
export function warm(target: EventTarget, prefetch: (id: string) => void) {
  const row = target instanceof Element ? target.closest('[data-person-id]') : null;
  const id = row?.getAttribute('data-person-id');
  if (id) prefetch(id);
}
