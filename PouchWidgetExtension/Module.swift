import ExpoModulesCore
import ActivityKit

public class PouchTimerActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("PouchTimerActivity")
        
        Function("areActivitiesEnabled") { () -> Bool in
            if #available(iOS 16.1, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            } else {
                return false
            }
        }
        
        Function("startActivity") { (pouchId: String, pouchName: String, startTime: Date, endTime: Date) -> String? in
            if #available(iOS 16.1, *) {
                let attributes = PouchTimerAttributes(
                    startTime: startTime,
                    endTime: endTime,
                    pouchId: pouchId,
                    pouchName: pouchName
                )
                
                let initialContentState = PouchTimerAttributes.ContentState(
                    remainingTime: endTime.timeIntervalSince(startTime),
                    pouchName: pouchName,
                    isCompleted: false
                )
                
                let activityContent = ActivityContent(state: initialContentState, staleDate: nil)
                
                do {
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: activityContent
                    )
                    return activity.id
                } catch {
                    print("Error requesting Live Activity: \(error.localizedDescription)")
                    return nil
                }
            } else {
                return nil
            }
        }
        
        Function("updateActivity") { (pouchId: String, remainingTime: TimeInterval, isCompleted: Bool) -> Bool in
            if #available(iOS 16.1, *) {
                let contentState = PouchTimerAttributes.ContentState(
                    remainingTime: remainingTime,
                    pouchName: "",  // Will be ignored in the update
                    isCompleted: isCompleted
                )
                
                let updatedContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<PouchTimerAttributes>.activities {
                        if activity.attributes.pouchId == pouchId {
                            await activity.update(updatedContent)
                            return true
                        }
                    }
                }
                return false
            } else {
                return false
            }
        }
        
        Function("endActivity") { (pouchId: String, isCompleted: Bool) -> Bool in
            if #available(iOS 16.1, *) {
                let contentState = PouchTimerAttributes.ContentState(
                    remainingTime: 0,
                    pouchName: "",  // Will be ignored in the update
                    isCompleted: isCompleted
                )
                
                let finalContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<PouchTimerAttributes>.activities {
                        if activity.attributes.pouchId == pouchId {
                            await activity.end(finalContent, dismissalPolicy: .default)
                            return true
                        }
                    }
                }
                return false
            } else {
                return false
            }
        }
        
        Function("endAllActivities") { () -> Bool in
            if #available(iOS 16.1, *) {
                let contentState = PouchTimerAttributes.ContentState(
                    remainingTime: 0,
                    pouchName: "",
                    isCompleted: true
                )
                
                let finalContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<PouchTimerAttributes>.activities {
                        await activity.end(finalContent, dismissalPolicy: .default)
                    }
                }
                return true
            } else {
                return false
            }
        }
    }
}
