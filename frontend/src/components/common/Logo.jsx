import { cn } from '../../lib/utils'
import markUrl from '../../assets/logo.svg'

const blueMark = {
  maskImage: `url(${markUrl})`,
  WebkitMaskImage: `url(${markUrl})`,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
  maskMode: 'luminance',
}

export function Logo({ className, tone = 'theme' }) {
  if (tone === 'blue') {
    return (
      <span
        role="img"
        aria-label="Cost Estimation"
        className={cn('inline-block bg-primary', className)}
        style={blueMark}
      />
    )
  }

  return (
    <img
      src="/favicon.svg"
      alt="Cost Estimation"
      className={cn('object-contain invert dark:invert-0', className)}
    />
  )
}
