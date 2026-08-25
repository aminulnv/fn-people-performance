import { publishPlatformTopics } from './publish.mjs'

export function publishWrite(req, topics, extra = {}) {
  return publishPlatformTopics(topics, {
    actorEmployeeId: req.platformUser?.employeeId,
    ...extra,
  })
}
