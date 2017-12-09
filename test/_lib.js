'use strict'

const fs = require('fs'),
  _ = require('lodash'),
  async = require('async'),
  client = require('mongodb').MongoClient

module.exports = {
  _: _,
  options: {
    url: 'mongodb://localhost:27017/test',
    collection: 'docs'
  },
  options1: {
    url: 'mongodb://localhost:27017/test1',
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
    let coll, me = this
    async.mapSeries(['options', 'options1'], function(o, callb) {
      client.connect(me[o].url, function(err, db) {
        let coll = db.collection(me[o].collection)
        coll.removeMany(function(err) {
          coll.insertMany(me.dummyData, function(err) {
            callb()
          })
        })
      })
    }, callback)
  }
}