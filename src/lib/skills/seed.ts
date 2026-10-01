import { emptySkillMastery, type Skill, type SkillMastery } from './types'

/** Short behavioural descriptors for Poor → Expert (Not Applicable left blank). */
function mastery(bands: {
  poor: string
  basic: string
  intermediate: string
  advanced: string
  expert: string
}): SkillMastery {
  return {
    ...emptySkillMastery(),
    ...bands,
  }
}

export const SEED_SKILLS: Skill[] = [
  {
    id: 'skill-account-planning',
    name: 'Account Planning',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Has no clear plan for accounts; reacts only when problems appear.',
      basic: 'Keeps a simple account list but plans are thin or rarely updated.',
      intermediate:
        'Builds workable account plans with goals, next steps, and owners.',
      advanced:
        'Runs strong account plans that anticipate risks and growth opportunities.',
      expert:
        'Sets the standard for account planning; others copy their approach.',
    }),
  },
  {
    id: 'skill-accuracy',
    name: 'Accuracy',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Work often has errors that others must catch and fix.',
      basic: 'Usually accurate on simple tasks; mistakes rise with complexity.',
      intermediate:
        'Delivers accurate work consistently and checks before handing off.',
      advanced:
        'Catches issues early; work rarely needs rework from accuracy gaps.',
      expert:
        'Trusted as the accuracy bar; prevents errors across the wider process.',
    }),
  },
  {
    id: 'skill-financial-accuracy',
    name: 'Accuracy in Financial Processing',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Financial entries or checks frequently contain material mistakes.',
      basic: 'Completes routine financial tasks with supervision and rework.',
      intermediate:
        'Processes financial work accurately within policy and deadlines.',
      advanced:
        'Spots anomalies quickly and keeps financial records clean under volume.',
      expert:
        'Owns financial accuracy standards and coaches others to meet them.',
    }),
  },
  {
    id: 'skill-acquisition-negotiation',
    name: 'Acquisition and Negotiation',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Avoids negotiation or accepts weak terms without clear trade-offs.',
      basic: 'Can negotiate simple deals with guidance on targets and limits.',
      intermediate:
        'Negotiates fair outcomes that protect value and keep relationships intact.',
      advanced:
        'Wins better terms through preparation, timing, and clear BATNA thinking.',
      expert:
        'Leads complex negotiations and raises the bar for deal quality org-wide.',
    }),
  },
  {
    id: 'skill-admin-support',
    name: 'Administrative Support',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Admin tasks are late, incomplete, or need constant chasing.',
      basic: 'Handles routine admin when given clear instructions.',
      intermediate:
        'Keeps calendars, docs, and follow-ups organised without reminders.',
      advanced:
        'Anticipates admin needs and keeps teams running smoothly under pressure.',
      expert:
        'Designs admin systems others rely on; removes friction for the whole team.',
    }),
  },
  {
    id: 'skill-ai-fluency',
    name: 'AI Fluency',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Avoids AI tools or uses them in ways that create risk or noise.',
      basic: 'Uses simple AI prompts for drafts with heavy manual cleanup.',
      intermediate:
        'Uses AI effectively to speed quality work while checking outputs.',
      advanced:
        'Builds repeatable AI workflows that save time without lowering standards.',
      expert:
        'Teaches others strong AI practice and sets safe, high-value usage norms.',
    }),
  },
  {
    id: 'skill-analytical-methods',
    name: 'Analytical and Statistical Methods',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Cannot apply basic analysis methods; conclusions are unsupported.',
      basic: 'Runs simple stats or summaries with help choosing the method.',
      intermediate:
        'Chooses suitable methods and explains findings clearly to stakeholders.',
      advanced:
        'Applies robust methods, tests assumptions, and flags uncertainty honestly.',
      expert:
        'Defines analytical standards and methods others adopt across teams.',
    }),
  },
  {
    id: 'skill-analytical-thinking',
    name: 'Analytical Thinking',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Jumps to conclusions without separating facts from opinions.',
      basic: 'Breaks simple problems into parts with coaching.',
      intermediate:
        'Structures problems, weighs evidence, and reaches sound recommendations.',
      advanced:
        'Cuts through ambiguity fast and surfaces the few decisions that matter.',
      expert:
        'Raises team analytical quality; frames hard problems others can solve.',
    }),
  },
  {
    id: 'skill-stakeholder-comms',
    name: 'Stakeholder Communication',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Updates are missing, late, or confusing for stakeholders.',
      basic: 'Shares updates when asked; tone and clarity still uneven.',
      intermediate:
        'Keeps stakeholders informed with clear, timely, audience-fit messages.',
      advanced:
        'Manages tough conversations well and aligns people before issues escalate.',
      expert:
        'Sets the communication standard; builds trust across senior stakeholders.',
    }),
  },
  {
    id: 'skill-delivery-ownership',
    name: 'Delivery Ownership',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Drops commitments; needs chasing to finish work.',
      basic: 'Delivers assigned work when priorities stay stable.',
      intermediate:
        'Owns outcomes end-to-end and flags risks early with a recovery plan.',
      advanced:
        'Drives delivery across dependencies and unblocks others without drama.',
      expert:
        'Trusted with critical outcomes; raises ownership norms for the team.',
    }),
  },
  {
    id: 'skill-people-leadership',
    name: 'People Leadership',
    role: 'Manager',
    status: 'approved',
    mastery: mastery({
      poor: 'Avoids people issues; team is unclear on priorities or support.',
      basic: 'Leads day-to-day tasks but struggles with harder people moments.',
      intermediate:
        'Sets clear expectations, supports the team, and follows through fairly.',
      advanced:
        'Builds a high-trust team that delivers; develops people for bigger seats.',
      expert:
        'Multiplies leaders; culture and performance improve under their leadership.',
    }),
  },
  {
    id: 'skill-coaching',
    name: 'Coaching and Feedback',
    role: 'Manager',
    status: 'approved',
    mastery: mastery({
      poor: 'Rarely gives feedback, or feedback is vague and unhelpful.',
      basic: 'Gives occasional feedback when prompted by reviews or issues.',
      intermediate:
        'Gives timely, specific feedback that helps people improve.',
      advanced:
        'Coaches through stretch moments and builds lasting capability in others.',
      expert:
        'Creates a feedback culture; others seek them out to grow.',
    }),
  },
  {
    id: 'skill-data-storytelling',
    name: 'Analytical Insight and Context Building',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Shares numbers without meaning; stakeholders stay confused.',
      basic: 'Reports data points but struggles to explain “so what”.',
      intermediate:
        'Turns analysis into a clear story with context and a recommended action.',
      advanced:
        'Frames insights that change decisions and keep audiences aligned.',
      expert:
        'Sets the bar for insight storytelling; complex data becomes actionable.',
    }),
  },
  {
    id: 'skill-risk-judgement',
    name: 'Risk Judgement',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Misses obvious risks or escalates everything without judgement.',
      basic: 'Spots basic risks but needs help deciding severity and response.',
      intermediate:
        'Assesses risk vs impact and chooses a proportionate next step.',
      advanced:
        'Anticipates second-order risks and protects outcomes without slowing everything.',
      expert:
        'Trusted on high-stakes calls; teaches others how to weigh risk well.',
    }),
  },
  {
    id: 'skill-process-design',
    name: 'Process Design',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Work stays ad hoc; repeats the same friction without fixing it.',
      basic: 'Documents simple steps when asked; processes stay brittle.',
      intermediate:
        'Designs clear processes that reduce errors and handoff confusion.',
      advanced:
        'Improves processes end-to-end and measures whether the change stuck.',
      expert:
        'Builds scalable process systems others adopt across teams.',
    }),
  },
  {
    id: 'skill-written-comms',
    name: 'Written Communication',
    role: '',
    status: 'approved',
    mastery: mastery({
      poor: 'Writing is unclear, error-heavy, or hard to act on.',
      basic: 'Writes understandable notes for simple topics with editing help.',
      intermediate:
        'Writes clear, structured messages that people can act on quickly.',
      advanced:
        'Writes crisp docs that align busy stakeholders and reduce meetings.',
      expert:
        'Sets the writing standard; complex ideas stay short, sharp, and usable.',
    }),
  },
]
