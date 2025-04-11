import ActivityKit
import WidgetKit
import SwiftUI

struct PouchTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PouchTimerAttributes.self) { context in
            // Lock screen/banner UI
            VStack {
                HStack {
                    Text(context.attributes.pouchName)
                        .font(.headline)
                        .fontWeight(.bold)
                    Spacer()
                    if context.state.isCompleted {
                        Text("Completed!")
                            .foregroundColor(.green)
                            .fontWeight(.bold)
                    } else {
                        Text(timerInterval: Date.now...context.attributes.endTime)
                            .multilineTextAlignment(.trailing)
                            .fontWeight(.semibold)
                            .font(.system(.title3, design: .rounded))
                    }
                }
                .padding(.horizontal)
                
                if !context.state.isCompleted {
                    ProgressView(value: getProgressValue(startTime: context.attributes.startTime, endTime: context.attributes.endTime))
                        .progressViewStyle(.linear)
                        .tint(.blue)
                        .padding(.horizontal)
                }
            }
            .padding(.vertical, 8)
            .activityBackgroundTint(Color.white.opacity(0.9))
            .activitySystemActionForegroundColor(Color.black)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.pouchName)
                        .font(.headline)
                        .fontWeight(.bold)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isCompleted {
                        Text("Completed!")
                            .foregroundColor(.green)
                            .fontWeight(.bold)
                    } else {
                        Text(timerInterval: Date.now...context.attributes.endTime)
                            .multilineTextAlignment(.trailing)
                            .fontWeight(.semibold)
                            .font(.system(.title3, design: .rounded))
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    if !context.state.isCompleted {
                        ProgressView(value: getProgressValue(startTime: context.attributes.startTime, endTime: context.attributes.endTime))
                            .progressViewStyle(.linear)
                            .tint(.blue)
                    } else {
                        Text("Your pouch timer is complete!")
                    }
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            } compactTrailing: {
                if context.state.isCompleted {
                    Text("Done")
                        .fontWeight(.semibold)
                } else {
                    Text(timerInterval: Date.now...context.attributes.endTime, showsHours: true)
                        .multilineTextAlignment(.center)
                        .monospacedDigit()
                        .font(.footnote)
                }
            } minimal: {
                if context.state.isCompleted {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else {
                    Image(systemName: "timer")
                        .foregroundColor(.blue)
                }
            }
        }
    }
    
    private func getProgressValue(startTime: Date, endTime: Date) -> Double {
        let totalDuration = endTime.timeIntervalSince(startTime)
        let elapsedTime = Date.now.timeIntervalSince(startTime)
        
        // Ensure we don't exceed 1.0 (100%)
        return min(max(elapsedTime / totalDuration, 0), 1)
    }
}
