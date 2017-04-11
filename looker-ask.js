var assert   = require('assert'),
    Alexa    = require('alexa-app'),
    vsprintf = require("sprintf-js").vsprintf,
    cfg      = require('./config.js'),
    Looker   = require('./lib/looker.js');


var app    = new Alexa.app('looker-ask');
var looker = new Looker(cfg.looker.domain, {
  token  : cfg.looker.token,
  secret : cfg.looker.secret
});

/**
 * This should be replaced with custom slots now that they are supported.
 *
 * @type {{stats: [*], sales: [*], dates: [*], days: [*], periods: [*]}}
 */
app.dictionary = {
  "stats"    : ['visits', 'pings', 'conversion rate', 'average bid'],
  "sales"    : ['leads', 'purchases'],
  "dates"    : ['today', 'yesterday', 'last week', 'this month', 'last year'],
  "days"     : ['this monday', 'last tuesday', 'last wednesday', 'this thursday'],
  "periods"  : ['day', 'week', 'month']
};

/**
 * Apparently its good etiquette to check the request is actually
 * for your skill.
 *
 * @param request
 * @param response
 * @param type
 */
app.pre = function(request, response, type) {
  var appId = request.sessionDetails.application.applicationId;

  if (appId != cfg.appId) {
    response.fail("Invalid applicationId");
  }
};

/**
 * Handles requests where the Skill was opened or requested with out a specific
 * intent given.  ie, "Alexa, open Looker".
 */
app.launch(function(request, response) {
  response.say(cfg.welcomePhrases[Math.floor(Math.random() * cfg.welcomePhrases.length)])
    .shouldEndSession(false, "Are you still there?");
});

/**
 * Intent handler for basic request to retrieve a single metric from Looker.
 * Relies on the mapping defined in config.js.
 *
 * @see config.dist.js
 */
app.intent('GetStat',
  {
    "slots"      : { "Stat": "LITERAL", "Date": "LITERAL" },
    "utterances" : [
      // Stats
      "{what was|what is|what's} the {stats|Stat}{ count|}",
      "what's the amount{ of|} {stats|Stat}{ for|} {days|Date}",
      "what was the total{ of|} {stats|Stat}",
      "how many {stats|Stat} did we have{ on| for} {dates|Date}",
      "how many {stats|Stat}{ was there|}",
      "tell me{ the|} {stats|Stat}{ count|}{ on|} {dates|Date}",
      "tell me the amount{ of|} {stats|Stat}",

      // Sales
      "{what was|what is|what's} the{ count of|} {sales|Stat}{ sold| bought|}{ on|} {dates|Date}",
      "how many {sales|Stat} {did we sell|purchased}{ for|} {dates|Date}",
      "how many {stats|Stat} {were|was|that were|that was} sold",
      "tell me the total{ of|} {sales|Stat} bought"
    ]
  },
  function(request, response) {

    var stat = request.slot("Stat"),
        date = request.slot('Date') || "today";

    if (!stat || !cfg.stats[stat]) {
      response.say("I did not understand what metric you wanted to know about... ")
        .say("Want to try again? ")
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases));

      return true;
    }

    var config = JSON.parse(JSON.stringify(cfg.stats[stat]));

    var query = {
          model   : config.model,
          explore : config.explore,
          fields  : config.fields,
          filters : { }
        };

    query.filters[config.date] = date;

    looker.query(query, function(err, data) {
      var result = JSON.parse(data);

      if (!result.data[0][0]) {
        response.say("I'm sorry, I wasn't able to find out... ")
          .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
          .send();

        return false;
      }

      var metric = result.data[0][0];

      response.session("lastIntent", "GetStats");
      response.session("stat", stat);
      response.session("result", metric);

      /**
       * Could definitely be cleaner, but I just needed to massage
       * how metrics were spoken based on their types.
       */
      if (stat.indexOf(' rate') > 0) {
        metric = Math.round(metric) + " percent";
      }

      if (stat.indexOf(' bid') > 0 || stat.indexOf(' cost') > 0) {
        metric = metric.toString().replace(".", " dollars and ") + " cents";
      }

      if (stat.indexOf('average ') > 0) {
        stat = "average of " + stat;
      }

      var speechOutput = getPhrase(cfg.statPhrases, stat, date, metric);

      response.say(speechOutput + "... ")
        .say(getPhrase(cfg.sessionPhrases))
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
        .send();
    });

    return false;
  }
);

/**
 * Intent handler for what was essentially MAX-type aggregate requests but
 * supports time periods.
 */
app.intent('RecordStat',
  {
    "slots"      : { "Stat": "LITERAL", "Period": "LITERAL" },
    "utterances" : [
      "{what's|what is|what was|tell me} the {highest|most|record for|record of} {stats|Stat} {in a|for a|on a} {periods|Period}",
      "{what's|what is|what was|give me} the {highest|most|record for|record of} {stats|Stat}",
      "{what's|what is|what was|tell me} the {highest|most|record for|record of} {sales|Stat}{ sold| bought|} {in a|for a|on a} {periods|Period}",
      "{what's|what is|what was|give me} the {highest|most|record for|record of} {sales|Stat}{ sold| bought|}"
    ]
  },
  function(request, response) {
    var stat   = request.slot("Stat"),
        period = request.slot('Period') || "day";

    if (!stat || !cfg.stats[stat]) {
      response.say("I did not understand what metric you wanted the record for... ")
        .say("Want to try again? ")
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases));

      return true;
    }

    var config = JSON.parse(JSON.stringify(cfg.stats[stat]));

    var query = {
      model   : config.model,
      explore : config.explore,
      fields  : config.fields,
      filters : { },
      sorts   : [ ],
      limit   : 1
    };

    query.sorts.push(config.fields[0] + " desc");

    /**
     * While seemed this may have been common / best practices for date fields
     * this may have been somewhat custom to our modeling...
     * Just massaging the requested timeframe into a proper date/time field.
     */
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(period.toLowerCase())) {
      query.filters[config.date.replace('_date', '_day_of_week')] = period.charAt(0).toUpperCase() + period.slice(1);
      query.fields.unshift(config.date);
    } else if (period == "month") {
      query.fields.unshift(config.date.replace('_date', '_month'));
    } else if (period == "week") {
      query.fields.unshift(config.date.replace('_date', '_week'));
    } else {
      query.fields.unshift(config.date);
    }

    looker.query(query, function(err, data) {
      var result = JSON.parse(data);

      if (!result.data[0][1]) {
        response.say("I'm sorry, I wasn't able to find out... ")
          .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
          .send();

        return false;
      }

      var metric = result.data[0][1];

      response.session("lastIntent", "GetStats");
      response.session("stat", stat);
      response.session("result", metric);

      /* DRY code is overrated...? */
      if (stat.indexOf(' rate') > 0) {
        metric = Math.round(metric) + " percent";
      }

      if (stat.indexOf(' bid') > 0 || stat.indexOf(' cost') > 0) {
        metric = metric.toString().replace(".", " dollars and ") + " cents";
      }

      if (stat.indexOf('average ') > 0) {
        stat = "average of " + stat;
      }

      var speechOutput = getPhrase(cfg.recordPhrases, stat, period, metric);

      response.say(speechOutput + "... ")
        .say(getPhrase(cfg.sessionPhrases))
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
        .send();
    });

    return false;
  }
);

/**
 * Intent handler for Status Updates, ie slightly more complex
 * queries that also allow for baked in trending
 */
app.intent('StatusUpdate',
  {
    "slots"      : { "Target": "LITERAL" },
    "utterances" : [
      "{give me|let me have} an update{ me|} on {leads|Target}",
      "{give me|let me have} an update{ me|} on {match rate|Target}",
      "{for|for a|for an|} update{ me|} on {leads|Target}",
      "update{ me|} on {match rate|Target}"
    ]
  },
  function(request, response) {
    console.log(request.slot("Target"));

    var updates = Object.keys(cfg.updates),
        target  = request.slot("Target") || updates[updates.length * Math.random() << 0];

    if (!cfg.updates[target]) {
      response.say("Not sure I know how to update you on that... ")
        .say(getPhrase(cfg.sessionPhrases))
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases));

      return true;
    }

    var config = JSON.parse(JSON.stringify(cfg.updates[target]));

    var query = {
      model   : config.model,
      explore : config.explore,
      fields  : [ ],
      filters : config.filters
    };

    Object.keys(config.fields).map(function(value) {
        var field = config.fields[value];

        query.fields.push(field.field);
    });

    looker.query(query, function(err, data) {
      var result = JSON.parse(data);

      if (!result.data[0][0]) {
        response.say("I'm sorry, I wasn't able to find out... ")
          .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
          .send();

        return false;
      }

      var update = result.data[0],
          metric = update[0];

      if (target.indexOf(' rate') > 0) {
        metric = Math.round(metric) + " percent";
      }

      if (target.indexOf(' bid') > 0 || target.indexOf(' cost') > 0) {
        metric = metric.toString().replace(".", " dollars and ") + " cents";
      }

      response.say(getPhrase(cfg.updateMetricPhrases, metric, config.fields['metric'].label));

      if (update[1]) {
        var comparison = (update[0] / update[1]).toFixed(2),
            diff       = comparison >= 1 ? "above" : "below",
            percent    = Math.round((Math.abs(1 - comparison)) * 100);

        response.say(getPhrase(cfg.updateComparisonPhrases, diff, config.fields['comparison'].label, percent));
      }

      response
        .say(getPhrase(cfg.sessionPhrases))
        .shouldEndSession(false, getPhrase(cfg.sessionPhrases))
        .send();
    });

    return false;
  }
);

/**
 * Intent handler for when the User requests to end the session.
 */
app.intent('End',
  {
    "slots"      : {},
    "utterances" : [
      "no{pe| thanks| thank you|}",
      "{all |}done",
      "{that's|that is} it {thanks|thank you|}",
      "{nevermind|never mind}"
    ]
  },
  function(request, response) {
    response.say(getPhrase(cfg.endPhrases));
  }
);

/**
 * When stuff blows up, you end up here.
 *
 * @param exception
 * @param request
 * @param response
 */
app.error = function(exception, request, response) {
  console.log(exception);
  console.log(JSON.stringify(exception.stack));

  response.say("Obviously, you have miscalculated the reach of my sophistication.")
  .shouldEndSession(true)
  .send();
};

/**
 * Simple helper method to allow for replying with random messages
 * that are defined in the config.js.  This relies on a `vsprintf` to inject
 * variables into placeholders in your string... to hopefully allow you to
 * construct sane responses.
 *
 * @see config.dist.js
 *
 * @returns {*}
 */
function getPhrase() {
  var params = [].slice.call(arguments);

  if (!params.length) {
    assert(arguments.length, "You must pass the phrase to speak!");
  }

  var phrase = params.shift();
  if (Array.isArray(phrase)) {
    phrase = phrase[phrase.length * Math.random() << 0];
  }

  return vsprintf(phrase, params);
}

module.exports = function() {
  return app;
};
