var express = require('express')
var app = express()
var request = require('request')
app.set('view engine', 'ejs')
app.use(express.static('public'))
var sqlite3 = require('sqlite3').verbose()

//create table users (username varchar[20], mac_address[50], primary key(username, mac_address));
//create table connections (mac_address varchar[50], ip_address[50], dt datetime default current_timestamp);

function getDateTime(mins_ago) {

    var date = new Date();

    var hour = date.getHours();
    var min  = date.getMinutes() - mins_ago;
    var sec  = date.getSeconds();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day  = date.getDate();

    if(min < 0)
    {
      min += 60;
      hour -= 1;
      if(hour<0)
      {
        hour+=24
        month -= 1
        if(month < 1)
        {
          month+=12
          year-=1
        }
      }
    }

    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min ;
    sec = (sec < 10 ? "0" : "") + sec;
    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

}

app.get('/', function(req, res) {
  var users = []
  var db = new sqlite3.Database("bdd.sqlite3")
  db.all("select * from users;", function(err, rows)
  {  
    rows.forEach(function (row) {  
      users.push({ 'username' : row.username, 'mac_address' : row.mac_address })
    })

    var connections = []
    db.all("select * from connections;", function(err, rows)
    {
      rows.forEach(function (row) {
        if(row.dt>getDateTime(1))
          connections.push({ 'mac_address' : row.mac_address, 'ip_address' : row.ip_address, 'date': new Date(row.dt) })
      })

			for(var i=0;i<users.length;i++) {
				var connected = false
				for(var j=0;j<connections.length;j++) {
				  if (users[i].mac_address == connections[j].mac_address) {
				    connected = true
				  }
				}
				if (connected) {
				  users[i]['connected'] = true
				}else{
				  users[i]['connected'] = false
				}
			}

      res.render('index', { users: users })
    });

  });
  db.close();
})

app.get('/users/:user', function(req, res) {

  var db = new sqlite3.Database("bdd.sqlite3")
  db.all("select * from users where username= '"+req.params.user+"';", function(err, rows)
  {
    var mac_address = ""
    rows.forEach(function (row) {  
      mac_address = row.mac_address
    })
    var connections = []
    db.all("select * from connections where mac_address = '" + mac_address + "';", function(err, rows)
    {
      rows.forEach(function (row) {
        connections.push({ 'mac_address': row.mac_address, 'ip_address': row.ip_address, 'date': new Date(row.dt) })
      })
      res.render('user', { username: req.params.user, connections: connections })
    });
  })
  db.close();
})

app.get('/connect', function(req, res) {
  var db = new sqlite3.Database("bdd.sqlite3")
  db.serialize(function() {
    var stmt = db.prepare("insert into connections values (?,?,?)")
    stmt.run(req.query.mac_address, req.query.ip_address, getDateTime(0), function (err) {
      if (err) {
        console.log(err.message);
        return;
      }
    });
    stmt.finalize()
    res.end("{status:'success'}")
  })
  db.close()
})

app.get('/register', function(req, res) {
  var db = new sqlite3.Database("bdd.sqlite3")
  db.serialize(function() {
    var stmt = db.prepare("insert into users values (?,?)")
    stmt.run(req.query.username,req.query.mac_address, function (err) {
      if (err) {
        res.end("{status: 'failed'}")
        return
      }
      res.end("{status: 'success'}")
    });
    stmt.finalize()
  })
  db.close()
})

app.listen(9000)
