const { withInfoPlist } = require("expo/config-plugins");

/**
 * Config plugin to add Live Activities support to the iOS app
 */
const withLiveActivities = (config) => {
  return withInfoPlist(config, (config) => {
    // Add NSSupportsLiveActivities to Info.plist
    config.modResults.NSSupportsLiveActivities = true;
    
    // Add ActivityKit capability
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    // Make sure remote-notification is in background modes
    if (!config.modResults.UIBackgroundModes.includes("remote-notification")) {
      config.modResults.UIBackgroundModes.push("remote-notification");
    }
    
    return config;
  });
};

module.exports = withLiveActivities;
