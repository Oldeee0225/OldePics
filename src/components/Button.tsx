import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

interface ButtonProps {
  children: ReactNode
  variant?: 'solid' | 'outline' | 'ghost'
  onClick?: () => void
  icon?: IconName
}

export function Button({ children, variant = 'solid', onClick, icon }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
      {icon && <Icon name={icon} size={17}/>}
    </button>
  )
}
