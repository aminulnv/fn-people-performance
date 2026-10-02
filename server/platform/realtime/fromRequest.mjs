import { publishPlatformTopics } from './publish.mjs'

export function publishWrite(req, topics, extra = {}) {
  return publishPlatformTopics(topics, {
    actorEmployeeId:
      req.platformActor?.employeeId ?? req.platformUser?.employeeId,
    ...extra,
  })
}
