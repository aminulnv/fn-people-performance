import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import {
  HomeApproveIcon,
  HomeGoalsIcon,
  HomeProgressIcon,
  HomeSentBackIcon,
} from './HomeBannerIcons'

const bannerIcons = [
  HomeGoalsIcon,
  HomeProgressIcon,
  HomeSentBackIcon,
  HomeApproveIcon,
]

describe('HomeBannerIcons', () => {
  it('uses a shared 64×64 frame so banner icons render at the same size', () => {
    for (const Icon of bannerIcons) {
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
        '0 0 64 64',
      )
    }
  })
})
