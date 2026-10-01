import type { CompanyValue } from './types'
import { VALUE_BEHAVIOUR_BANDS } from './types'

/**
 * Company Core Values — seven cultural values on the annual scorecard.
 * Each value has one behaviour with Unsatisfactory → Exceptional anchors.
 */
export const CORE_VALUES: CompanyValue[] = [
  {
    id: 'move-fast',
    name: 'Move Fast, Chase Excellence',
    description:
      "We're all about excellence. Driven to be the best, we move fast and make things happen effortlessly.",
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'move-fast-behaviour',
        name: 'Move Fast, Chase Excellence',
        bands: {
          unsatisfactory: [
            'Chronically misses deadlines and SLAs with little recovery.',
            'Speed comes at the cost of repeated quality failures.',
            'Ignores feedback about pace or delivery standards.',
          ],
          developing: [
            'Struggles to balance speed and quality appropriately.',
            'Does not improve execution speed after setbacks.',
            'Frequently misses deadlines and fails to meet SLAs or response-time expectations.',
          ],
          performing: [
            'Moves quickly on reversible work without sacrificing quality.',
            'Applies appropriate rigour to irreversible decisions.',
            'Adjusts approach quickly when results fall short.',
            'Maintains consistent execution pace aligned with standards, deadlines, and SLAs.',
          ],
          exceeding: [
            'Accelerates execution across projects without lowering quality.',
            'Demonstrates strong judgement on when to move fast vs apply depth.',
            'Improves team velocity through structured experimentation.',
            'Consistently delivers high-quality results at speed and sets the standard for meeting deadlines and SLAs.',
          ],
          exceptional: [
            'Sets the org standard for high-quality speed and judgement.',
            'Unblocks others so whole teams move faster without cutting corners.',
            'Turns setbacks into durable process improvements others adopt.',
          ],
        },
      },
    ],
  },
  {
    id: 'take-ownership',
    name: 'Take Ownership, Deliver Outcomes',
    description:
      'We own every promise we make, ensuring that our Outcomes are not just good, but incredible.',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'take-ownership-behaviour',
        name: 'Take Ownership, Deliver Outcomes',
        bands: {
          unsatisfactory: [
            'Drops commitments and requires constant chase to finish work.',
            'Blames others when outcomes miss; does not own the result.',
            'Leaves problems unattended until they become crises.',
          ],
          developing: [
            'Requires follow-up to ensure responsibilities are completed.',
            'Deflects responsibility when results fall short.',
            'Struggles to prioritise high-impact deliverables.',
            'Waits for direction to address problems rather than identifying and acting on them independently.',
          ],
          performing: [
            'Takes responsibility for assigned outcomes.',
            'Follows through consistently without reminders.',
            'Reprioritises effectively when outcomes require adjustment.',
            'Takes initiative to solve problems within their responsibilities and sees them through to completion.',
          ],
          exceeding: [
            'Consistently delivers measurable impact, not just activity.',
            'Maintains accountability under pressure.',
            'Ensures commitments translate into tangible outcomes.',
            'Proactively identifies problems, defines root causes, proposes viable solutions, and takes full ownership through resolution.',
          ],
          exceptional: [
            'Owns outcomes end-to-end and raises the bar for the team.',
            'Anticipates risks early and drives resolution without being asked.',
            'Turns ownership into measurable impact others rely on.',
          ],
        },
      },
    ],
  },
  {
    id: 'invent-simplify',
    name: 'Invent & Simplify',
    description:
      'We believe in solving tough problems with simple, innovative solutions that change the game.',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'invent-simplify-behaviour',
        name: 'Invent & Simplify',
        bands: {
          unsatisfactory: [
            'Adds complexity without improving outcomes.',
            'Resists simpler approaches even when current ways clearly fail.',
            'Makes decisions without using available evidence.',
          ],
          developing: [
            'Accepts inefficient systems without proposing improvements.',
            'Introduces unnecessary complexity into solutions.',
            'Focuses on immediate fixes rather than structural improvement.',
            'Makes decisions without leveraging available data or insight.',
          ],
          performing: [
            'Identifies opportunities to improve or streamline processes.',
            'Designs solutions that reduce complexity.',
            'Tests and refines solutions before scaling.',
            'Uses data to inform structural decisions.',
          ],
          exceeding: [
            'Redesigns systems for long-term scalability and leverage.',
            'Consistently simplifies complex processes into clear frameworks.',
            'Creates structural improvements that reduce recurring inefficiencies.',
            'Builds solutions that scale impact without proportional resource growth.',
          ],
          exceptional: [
            'Creates simple systems that scale and remove recurring pain.',
            'Inventiveness becomes a team advantage others reuse.',
            'Cuts through ambiguity with clear frameworks and data.',
          ],
        },
      },
    ],
  },
  {
    id: 'dream-team',
    name: 'The Dream Team',
    description:
      'We believe the key to winning is building diverse, lean teams of brilliant go-getters who break down barriers',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'dream-team-behaviour',
        name: 'The Dream Team',
        bands: {
          unsatisfactory: [
            'Works in isolation and undermines team cohesion.',
            'Ignores underperformance that hurts collective results.',
            'Rarely supports or develops others.',
          ],
          developing: [
            'Works independently without integrating team input.',
            'Rarely recognises contributions of others.',
            'Tolerates underperformance without addressing it.',
            'Does not actively contribute to strengthening team capability.',
          ],
          performing: [
            'Collaborates effectively across functions.',
            'Shares credit appropriately.',
            'Maintains performance standards within the team.',
            'Contributes positively to collective effectiveness.',
          ],
          exceeding: [
            'Elevates team capability through collaboration and mentorship.',
            'Proactively recognises and develops others.',
            'Protects high standards through accountability.',
            'Strengthens overall team talent and cohesion.',
          ],
          exceptional: [
            'Builds stronger teams through mentoring and clear standards.',
            'Raises collective performance and protects high bar hiring.',
            'Makes collaboration the default path to better outcomes.',
          ],
        },
      },
    ],
  },
  {
    id: 'honesty-integrity',
    name: 'Have Honesty & Integrity',
    description:
      'We do what is right, not what is easy. Honesty and integrity are our compass, even in the toughest moments.',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'honesty-integrity-behaviour',
        name: 'Have Honesty & Integrity',
        bands: {
          unsatisfactory: [
            'Withholds material information or misrepresents facts.',
            'Breaks commitments without accountability.',
            'Avoids ownership of mistakes; trust erodes.',
          ],
          developing: [
            'Withholds relevant information or avoids transparency when uncomfortable.',
            'Fails to follow through consistently on stated commitments.',
            'Avoids admitting mistakes or shifts blame when issues arise.',
            'Demonstrates inconsistent ethical judgement in low-visibility situations.',
          ],
          performing: [
            'Communicates transparently with appropriate stakeholders.',
            'Delivers reliably on stated commitments.',
            'Admits mistakes and takes corrective action.',
            "Acts in the company's best interest over personal convenience.",
          ],
          exceeding: [
            'Models ethical decision-making even without oversight.',
            'Consistently aligns words and actions.',
            'Protects trust, confidentiality, and company reputation proactively.',
            'Holds self and others accountable to high integrity standards.',
          ],
          exceptional: [
            'Is the reference point for ethical judgement under pressure.',
            'Builds trust across stakeholders through radical transparency.',
            'Holds self and others to integrity standards that protect the company.',
          ],
        },
      },
    ],
  },
  {
    id: 'debate-commit',
    name: 'Debate Openly, Commit Fully',
    description:
      'At NEXT, every voice matters. We create space for open conversations and promise to stand by every decision we make.',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'debate-commit-behaviour',
        name: 'Debate Openly, Commit Fully',
        bands: {
          unsatisfactory: [
            'Avoids necessary debate or turns disagreement personal.',
            'Re-litigates decisions after alignment and stalls execution.',
            'Undermines agreed plans through inconsistent follow-through.',
          ],
          developing: [
            'Avoids constructively challenging ideas when misalignment exists.',
            'Continues resisting or second-guessing decisions after alignment.',
            'Allows disagreement to become personal or emotionally charged.',
            'Demonstrates inconsistent commitment to agreed plans.',
          ],
          performing: [
            'Challenges ideas respectfully before decisions are finalised.',
            'Aligns clearly on shared goals and expected outcomes.',
            'Commits fully once direction is agreed.',
            'Maintains professionalism during disagreement.',
          ],
          exceeding: [
            'Encourages structured, solution-focused debate.',
            'Clarifies shared goals and constraints during ambiguity.',
            'Drives disciplined execution after alignment.',
            'Prevents re-litigation of agreed decisions and keeps teams focused.',
          ],
          exceptional: [
            'Creates healthy debate that improves decisions, then drives full commit.',
            'Keeps teams aligned through ambiguity without reopening settled calls.',
            'Models disagree-and-commit so others execute with clarity.',
          ],
        },
      },
    ],
  },
  {
    id: 'product-first',
    name: 'Product First',
    description:
      'We obsess over the product, live it daily, think like users, master every layer, and relentlessly turn insights into impact.',
    status: 'enabled',
    playbookUrl: null,
    behaviours: [
      {
        id: 'product-first-behaviour',
        name: 'Product First',
        bands: {
          unsatisfactory: [
            'Shows little product or user understanding in daily work.',
            'Makes decisions disconnected from product impact.',
            'Does not invest in learning the product.',
          ],
          developing: [
            'Demonstrates limited knowledge of product features or user needs.',
            'Relies primarily on secondhand understanding of customer experience.',
            'Struggles to connect work decisions to product impact.',
            'Does not proactively deepen product expertise.',
          ],
          performing: [
            'Maintains strong understanding of product features and workflows.',
            'Connects work decisions to user experience and outcomes.',
            'Seeks clarity on product gaps or friction points.',
            'Applies product knowledge effectively in daily execution.',
          ],
          exceeding: [
            'Demonstrates deep cross-functional product expertise.',
            'Anticipates user pain points before they escalate widely.',
            'Influences product improvements through informed insight.',
            'Operates with full accountability for product impact and success.',
          ],
          exceptional: [
            'Deep product expertise shapes better decisions across functions.',
            'Anticipates user needs and drives high-leverage product improvements.',
            'Holds full accountability for product outcomes others follow.',
          ],
        },
      },
    ],
  },
]

export function coreValueById(id: string): CompanyValue | undefined {
  return CORE_VALUES.find((value) => value.id === id)
}

function behaviourHasAnyBand(behaviour: CompanyValue['behaviours'][number]): boolean {
  return VALUE_BEHAVIOUR_BANDS.some((band) => behaviour.bands[band]?.length > 0)
}

/** Prefer live behaviours; fill any missing grade bands from the catalog. */
export function withCatalogBehaviours(value: CompanyValue): CompanyValue {
  const catalog = coreValueById(value.id)
  if (!catalog) return value

  if (value.behaviours.length === 0 || !value.behaviours.some(behaviourHasAnyBand)) {
    return { ...value, behaviours: structuredClone(catalog.behaviours) }
  }

  const catalogBehaviour = catalog.behaviours[0]
  if (!catalogBehaviour) return value

  return {
    ...value,
    behaviours: value.behaviours.map((behaviour, index) => {
      const seed = catalog.behaviours[index] ?? catalogBehaviour
      const bands = { ...behaviour.bands } as CompanyValue['behaviours'][number]['bands']
      for (const band of VALUE_BEHAVIOUR_BANDS) {
        if (!bands[band]?.length) {
          bands[band] = structuredClone(seed.bands[band] ?? [])
        }
      }
      return { ...behaviour, bands }
    }),
  }
}
