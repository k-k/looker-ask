var assert  = require('assert'),
    crypto  = require('crypto'),
    moment  = require('moment-timezone')().tz("America/Los_Angeles"),
    n       = require('nonce')(),
    request = require('request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var Looker = function(domain, config) {
  config = config || {};

  assert(domain, "You must specify your Looker domain!");
  assert(config.token, "You must pass your token in with the options!");
  assert(config.secret, "You must pass your token in with the options!");

  this.domain  = domain;
  this.token   = config.token;
  this.secret  = config.secret;
};

Looker.prototype.sendRequest = function(url, authorization, nonce, today, callback) {
  var options = {
    url: url,
    headers: {
      'Accept'                : 'application/json',
      'Authorization'         : authorization,
      'x-llooker-date'        : today,
      'x-llooker-nonce'       : nonce,
      'x-llooker-api-version' : 1
    }
  };

  request(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      callback(null, body);
    } else {
      if (error) {
        console.log("Error!: " + error);
        callback(error, {});
      }

      console.log(response.body);
    }
  });
};

Looker.prototype.query = function(options, callback) {
  options = options || {};

  var fields  = [],
      filters = {},
      sorts   = "",
      limit   = "",
      nonce   = n() * 1000,
      today   = moment.format("ddd, DD MMM YYYY, HH:mm:ss ZZ");

  assert(options.model, "You must specify the Model to query against!");
  assert(options.explore, "You must specify the Explore to query against!");
  assert(options.fields, "You must specify at least one field to query!");

  if (options.fields.length > 0) {
    fields = 'fields=' + options.fields.map(function(value) {
      return encodeURIComponent(value).toLowerCase();
    }).join(',');
  }

  if (Object.keys(options.filters).length > 0) {
    filters = this.cleanFilters(options.filters);
  }

  options.sorts = options.sorts || [];
  if (options.sorts.length > 0) {
    sorts = 'sorts=' + options.sorts.map(function(value) {
      return encodeURIComponent(value).toLowerCase();
    }).join(',');
  }

  if (options.limit) {
    limit = 'limit=' + options.limit;
  }

  var stringToSign = 'GET\n'
    + '/api/dictionaries/' + options.model + '/queries/' + options.explore + '\n'
    + today + '\n'
    + nonce + '\n'
    + (filters.length > 0 ? filters.split('&').join('\n') + '\n' : "")
    + fields + '\n'
    + (limit.length > 0 ? limit + '\n' : "")
    + (sorts.length > 0 ? sorts + '\n' : "");

  var url  = this.domain
    + '/api/dictionaries/' + options.model + '/queries/' + options.explore
    + '?' + fields
    + (filters.length > 0 ? '&' + filters : "")
    + (sorts.length > 0 ? '&' + sorts : "")
    + (limit.length > 0 ? '&' + limit : "");

  var auth = this.token + ':' + this.generateHash(this.secret, stringToSign);

  this.sendRequest(url, auth, nonce, today, callback);
};

Looker.prototype.generateHash = function(secret, string) {
  var hash = crypto.createHmac('sha1', secret).update(string).digest('base64');

  return hash.toString('base64');
};

Looker.prototype.cleanFilters = function(filters) {
  filters = filters || {};

  return Object.keys(filters).map(function(key) {
    var value = filters[key],
        value = value.replace("{{HOUR}}", moment.format('HH'));

    return encodeURIComponent('f['+key+']').toLowerCase()+'='+encodeURIComponent(value);
  }).join('&');
};

module.exports = Looker;
