var DatabaseCleaner = require('../lib/database-cleaner');
var cleaner = new DatabaseCleaner('postgres');

var pg = require('pg');

var conString = 'postgres://localhost/example';

var client = new pg.Client(conString);
client.connect();

cleaner.clean(client, function() {
  console.log("database cleaned!");
  client.end();
});
