var Looker = require('./looker-ask'),
    looker = new Looker();

exports.handler = looker.lambda();