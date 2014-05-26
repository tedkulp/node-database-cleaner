module.exports = DatabaseCleaner = function(type) {
  var cleaner = {};

  cleaner['mongodb'] = function(db, callback) {
    db.collections( function (skip, collections) {
      var count = collections.length;
      if (count < 1) { return callback.apply(); }

      collections.forEach(function (collection) {
        collection.drop(function () {
          if (--count <= 0 && callback) {
            callback.apply();
          }
        });
      });
    });
  };
  
  cleaner['redis'] = function(db, callback) {
    db.flushdb(function(err, results) {
      callback.apply();
    });
  };

  cleaner['couchdb'] = function(db, callback) {
    db.destroy(function (err, res) {
      db.create(function (err, res) {
        callback.apply();
      });
    });
  };

  cleaner['mysql'] = function(db, callback) {
    db.query('show tables', function(err, tables) {
      var count  = 0;
      var length = tables.length;

      tables.forEach(function(table) {
        if (table['Tables_in_database_cleaner'] != 'schema_migrations') {
          db.query("DELETE FROM " + table['Tables_in_database_cleaner'], function() {
            count++;
            if (count >= length) {
              callback.apply();
            }
          });
        } else {
          count++;
          if (count >= length) {
            callback.apply();
          }
        }
      });
    });
  };

  cleaner['postgres'] = function(db, callback) {
    var sql = "SELECT relname AS tablename FROM pg_stat_user_tables"
      , query  = db.query(sql)
      , tables = []
      , sequences = [];
    query.on("row", function(row) {
      if (row.tablename != 'migrations')
        tables.push(row.tablename);
    });
    query.on("end",function() {
      query = db.query("SELECT c.relname AS seqname FROM pg_class c WHERE c.relkind = 'S'");
      query.on("row", function(row) {
        if (row.seqname != 'migrations_id_seq')
          sequences.push(row.seqname);
      });
      query.on("end",function() {
        var i = 0, t, truncated = [];
        function tr(t) {
          var q = db.query("DELETE FROM " + t);
          q.on("end", function() {
            if (sequences.indexOf(t + '_id_seq') > -1) {
              var _q = db.query("ALTER SEQUENCE " + t + "_id_seq RESTART WITH 1");
              _q.on("end", function() {
                truncated.push(t);
                if (tables.length == truncated.length) {
                  callback();
                }
              });
            } else {
              truncated.push(t);
              if (tables.length == truncated.length) {
                callback();
              }
            }
          });
        }
        for(; t = tables[i++];) {
          tr(t);
        }
      });
    });
  };
  cleaner['pg'] = cleaner['postgres'];
  cleaner['postgresql'] = cleaner['postgres'];

  this.clean = function (db, callback) {
    cleaner[type](db, callback);
  };
};
