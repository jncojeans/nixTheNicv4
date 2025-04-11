import ActivityKit
import WidgetKit
import SwiftUI

struct PouchTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var remainingTime: TimeInterval
    var pouchName: String
    var isCompleted: Bool
  }
  
  var startTime: Date
  var endTime: Date
  var pouchId: String
  var pouchName: String
}
