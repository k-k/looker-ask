var config = {
  /**
   * Echo Skill App Id
   */
  appId: '{ECHO-APP-ID}',

  /**
   * Looker Credentials for the API
   */
  looker: {
    domain: "{LOOKER-DOMAIN}",
    token  : '{TOKEN}',
    secret : '{SECRET}'
  },

  /**
   * Define Metrics you want to be able to query here
   */
  stats: {
    'metric name': {
      model: 'LOOKER MODEL NAME',
      explore: 'LOOKER EXPLORE NAME',
      fields: ['LOOKER MEASURE'],
      date: 'LOOKER DATE DIMENSION'
    }
  },

  /**
   * Custom updates - using a key metric and a comparison metric for pacing
   */
  updates: {
    'update name': {
      model   : 'LOOKER MODEL NAME',
      explore : 'LOOKER EXPLORE NAME',
      fields  : {

        // The key metric for the update
        "metric"  : {
          label : "KEY METRIC NAME (AS SAID BY ALEXA)",
          field : "LOOKER MEASURE"
        },

        // The "comparison" object is an optional measure to compare the key metric against
        "comparison" : {
          "label" : "THE COMPARISON NAME (AS SAID BY ALEXA)",
          "field" : "LOOKER METRIC"
        }
      },

      // Filters to apply for the update. For proper pacing, you should filter by the current hour
      filters : {
        "EXPLORE.date_hour_of_day": '<{{HOUR}}'
      }
    }
  },

  /**
   * How to greet people when Looker is opened
   */
  welcomePhrases: [
    "Sure thing... what would you like to know?",
    "Standing by...",
    "You've got questions, I've got answers..."
  ],

  /**
   * Continue with the session
   */
  sessionPhrases: [
    "Anything else?",
  ],

  /**
   * How we say good bye
   */
  endPhrases: [
    "Always happy to help...",
    "Let's chat later...",
    "Goodbye..."
  ],

  /**
   * How we reply with metrics
   *  1: Metric Name
   *  2: Date
   *  3: Metric Value
   */
  statPhrases: [
    "The %1$s for %2$s is %3$s",
    "I see %3$s %1$s for %2$s",
    "Looks like %3$s %1$s during %2$s"
  ],

  /**
   * How we reply with Record metrics
   *  1: Metric Name
   *  2: Period (Day, Week, Month, Day of Week)
   *  3: Metric Value
   */
  recordPhrases: [
    "The highest %1$s for a single %2$s is %3$s",
    "I see a max %3$s %1$s for a single %2$s",
    "Looks like %3$s %1$s was the highest for a single %2$s"
  ],

  /**
   * How we reply to updates for the key metric
   *  1: Metric Value
   *  2: Metric Name
   */
  updateMetricPhrases: [
    "Looking at today, you have %1$s %2$s... ",
    "I see that you have %1$s %2$s today... ",
    "Well, today you are at %1$s %2$s... "
  ],

  /**
   * How we reply to metric comparisons
   *  1: Difference (above or below)
   *  2: Metric Name
   *  3: Percent Difference
   */
  updateComparisonPhrases: [
    "You are trending %1$s %2$s by about %3$s percent... ",
    "That is roughly %3$s percent %1$s %2$s... "
  ]
};

module.exports = config;