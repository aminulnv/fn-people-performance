import { describe, expect, it } from 'vitest'
import { buildApprovalTrail } from './approvalTrail'

const api = { id: '7', name: 'Api Singha' }
const angie = { id: '42', name: 'Angie Ng Yun Ni' }

describe('buildApprovalTrail', () => {
  it('puts the owner first on a draft, then the manager', () => {
    expect(
      buildApprovalTrail({
        perspective: 'owner',
        status: 'draft',
        lineManager: api,
      }),
    ).toMatchObject({
      late: false,
      currentIndex: 0,
      spoken: 'You, then Api Singha',
      stages: [{ label: 'You' }, { label: 'Api Singha', person: api }],
    })
  })

  it('asks for the owner changes after a send-back', () => {
    expect(
      buildApprovalTrail({
        perspective: 'owner',
        status: 'sent_back',
        allowLateSubmissions: true,
        lineManager: api,
        skipLevelManager: angie,
      }),
    ).toMatchObject({
      late: true,
      currentIndex: 0,
      spoken:
        'Late submission. Needs your changes, then Api Singha, then Angie Ng Yun Ni',
      stages: [
        { label: 'Your changes', spoken: 'Needs your changes' },
        { label: 'Api Singha' },
        { label: 'Angie Ng Yun Ni' },
      ],
    })
  })

  it('names the remaining approvers after a late submit', () => {
    expect(
      buildApprovalTrail({
        perspective: 'owner',
        status: 'submitted',
        postWindowApprovalStage: 'manager',
        lineManager: api,
        skipLevelManager: angie,
      }),
    ).toMatchObject({
      late: true,
      currentIndex: 0,
      spoken: 'Late submission. Awaiting Api Singha, then Angie Ng Yun Ni',
      stages: [{ label: 'Api Singha' }, { label: 'Angie Ng Yun Ni' }],
    })
  })

  it('hides the trail once the set is approved', () => {
    expect(
      buildApprovalTrail({
        perspective: 'owner',
        status: 'approved',
        lineManager: api,
      }),
    ).toBeNull()
  })

  it('shows the reviewer as current before skip-level on a late first stage', () => {
    expect(
      buildApprovalTrail({
        perspective: 'reviewer',
        status: 'submitted',
        postWindowApprovalStage: 'manager',
        canApprove: true,
        skipLevelManager: angie,
      }),
    ).toMatchObject({
      late: true,
      spoken: 'Late submission. You, then Angie Ng Yun Ni',
      stages: [{ label: 'You' }, { label: 'Angie Ng Yun Ni' }],
    })
  })
})
