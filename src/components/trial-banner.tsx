import type { Trial } from '@/lib/trial'
import { TRIAL_DAYS } from '@/lib/trial'

export function TrialBanner({ trial }: { trial: Trial }) {
  if (!trial) return null
  const used = Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - trial.days_left))
  const pct = Math.round((used / TRIAL_DAYS) * 100)
  const tone = trial.ended ? 'crit' : trial.days_left <= 5 ? 'warn' : 'info'
  return (
    <div className={`trial ${tone}`} role="status">
      <div>
        <b>{trial.ended ? 'Your 25-day sandbox trial has ended' : `Sandbox trial: ${trial.days_left} day${trial.days_left === 1 ? '' : 's'} left of ${TRIAL_DAYS}`}</b>
        <span className="small"> {trial.ended ? 'Your data stays yours and you can still read and export it. Ask the LOIS team to extend access: thelucrebag@gmail.com.' : `Ends ${new Date(trial.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Everything in the sandbox is practice: nothing is executed.`}</span>
      </div>
      <div className="bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
