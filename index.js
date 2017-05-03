'use strict';

// Example usage:
// node index.js --stats-dir=\\RASPBERRYPI\PiShare\mc\world\stats\

/* modules / libraries */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const commandLineArgs = require('command-line-args');

const options = commandLineArgs({
    name: 'stats-dir',
    type: String,
    multiple: false,
    defaultOption: true
  });

/* constants */
const statsDir = options['stats-dir'];
const newUserDataPromise = [];
const jsonStatFiles = fs.readdirSync(statsDir);

/* main */
for (let i in jsonStatFiles) {
  newUserDataPromise.push(buildUserDataObjFromFile(jsonStatFiles[i]));
}

Promise.all(newUserDataPromise)
  .then(userDataArr => {
    userDataArr.forEach(userData => {
      const filename = `./data/${userData.username}.json`;
      ensureDirectoryExistence(filename);
      fs.writeFile(filename, JSON.stringify(userData, null, 4), (err) => {
        if (err) console.error(err);
      });
    });
  });

/* functions */

function buildUserDataObjFromFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(statsDir + file, 'utf8', (err, data) => {
      if (err) throw err;
      const rawUserData = JSON.parse(data);
      let userData = filterObjKeys(rawUserData, /^stat/);
      userData = deepen(userData);
      userData.uuid = file.replace(/-|\.json/g,'');
      getUsernameFromUuid(userData.uuid)
        .then(username => {
          userData.username = username;
          resolve(userData);
        });
    });
  });
}

function getUsernameFromUuid(uuid) {
  return new Promise((resolve, reject) => {
    fetch(`https://api.mojang.com/user/profiles/${uuid}/names`)
      .then(res => {
        res.json()
          .then(data => {
            const username = data[0].name;
            resolve(username);
          })
      });
  });
}

function deepen(o) {
  let oo = {}, t, parts, part;
  for (let k in o) {
    t = oo;
    parts = k.split('.');
    let key = parts.pop();
    while (parts.length) {
      part = parts.shift();
      t = t[part] = t[part] || {};
    }
    t[key] = o[k]
  }
  return oo;
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function filterObjKeys(obj, regexFilter) {
  let key, filteredObj = {};
  for (key in obj) {
    if (obj.hasOwnProperty(key) && regexFilter.test(key)) {
      filteredObj[key] = obj[key];
    }
  }
  return filteredObj;
}
