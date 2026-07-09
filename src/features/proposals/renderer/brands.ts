import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'
import ammoLogo from '@/assets/AmmoStudio Logo.svg'

export type ProposalBrand = 'cambridge' | 'ammo'

export interface BrandConfig {
  id: ProposalBrand
  name: string
  logo: string
  themeClass: string
  /** Footer logo treatment: Cambridge's mono mark reads as a watermark at reduced opacity; Ammo's color wordmark stays full strength at half the height */
  footerLogoClass: string
  /** Presentation-mode "Thank You" slide logo treatment */
  slideLogoClass: string
}

export const BRANDS: Record<ProposalBrand, BrandConfig> = {
  cambridge: {
    id: 'cambridge',
    name: 'Cambridge Studio',
    logo: cambridgeLogo,
    themeClass: 'proposal-theme',
    footerLogoClass: 'h-10 opacity-40',
    slideLogoClass: 'h-12 opacity-40',
  },
  ammo: {
    id: 'ammo',
    name: 'Ammo Studio',
    logo: ammoLogo,
    themeClass: 'proposal-theme proposal-theme--ammo',
    footerLogoClass: 'h-5',
    slideLogoClass: 'h-6',
  },
}

export function getBrand(brand?: string): BrandConfig {
  return brand === 'ammo' ? BRANDS.ammo : BRANDS.cambridge
}
