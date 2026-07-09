import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'
import ammoLogo from '@/assets/AmmoStudio Logo.svg'

export type ProposalBrand = 'cambridge' | 'ammo'

export interface BrandConfig {
  id: ProposalBrand
  name: string
  logo: string
  themeClass: string
}

export const BRANDS: Record<ProposalBrand, BrandConfig> = {
  cambridge: {
    id: 'cambridge',
    name: 'Cambridge Studio',
    logo: cambridgeLogo,
    themeClass: 'proposal-theme',
  },
  ammo: {
    id: 'ammo',
    name: 'Ammo Studio',
    logo: ammoLogo,
    themeClass: 'proposal-theme proposal-theme--ammo',
  },
}

export function getBrand(brand?: string): BrandConfig {
  return brand === 'ammo' ? BRANDS.ammo : BRANDS.cambridge
}
