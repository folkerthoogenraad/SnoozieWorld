/**
 * Runs `action` when the screen's button with this `value` is clicked, right
 * after closing the screen. Unlike the dialog's `close` event, which comes a
 * task later, this is in the same task, so a screen that `action` opens shows
 * before the browser paints: the backdrop doesn't flash off and on (feedback 12).
 * The `close` event still follows, with this `value` as the `returnValue`.
 */
export function onScreenButton(dialog: HTMLDialogElement, value: string, action: () => void): void {
  dialog.addEventListener('submit', (event) => {
    const submitter = event.submitter
    if (!(submitter instanceof HTMLButtonElement) || submitter.value !== value) return
    event.preventDefault()
    dialog.close(value)
    action()
  })
}
