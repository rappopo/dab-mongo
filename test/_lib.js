'use strict'

const fs = require('fs'),
  _ = require('lodash'),
  client = require('mongodb').MongoClient

module.exports = {
  _: _,
  options: {
    url: 'mongodb://localhost:27017/test',
    collection: 'docs'
  },
  dummyData: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'james-bond', name: 'James Bond' }
  ],
  bulkDocs: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'johnny-english', name: 'Johnny English' },
    { name: 'Jane Boo' }
  ],
  timeout: 5000,
  resetDb: function (callback) {
    let coll, conn
    client.connect(this.options.url)
    .then(db => {
      conn = db
      coll = db.collection(this.options.collection)
      return coll.removeMany()
    })
    .then(result => {
      return coll.insertMany(this.dummyData)
    })
    .then(result => {
      conn.close()
      callback()
    })
    .catch(err => {
      conn.close()
      callback(err)
    })
  }
}