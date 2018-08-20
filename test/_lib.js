'use strict'

const _ = require('lodash')
const async = require('async')
const client = require('mongodb').MongoClient

module.exports = {
  _: _,
  options: {
    url: 'mongodb://localhost:27017',
    dbName: 'test'
  },
  schema: {
    name: 'test'
  },
  schemaFull: {
    name: 'full',
    attributes: {
      _id: 'string',
      name: 'string',
      age: 'integer'
    }
  },
  schemaHidden: {
    name: 'hidden',
    attributes: {
      _id: 'string',
      name: { type: 'string', hidden: true },
      age: 'integer'
    }
  },
  schemaMask: {
    name: 'mask',
    attributes: {
      _id: { type: 'string', mask: 'id' },
      name: { type: 'string', mask: 'fullname' },
      age: { type: 'integer' }
    }
  },
  schemaBulk: {
    name: 'test1'
  },
  docs: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'johnny-english', name: 'Johnny English' },
    { name: 'Jane Boo', age: 20 }
  ],
  docsMask: [
    { id: 'jack-bauer', fullname: 'Jack Bauer' },
    { id: 'johnny-english', fullname: 'Johnny English' },
    { fullname: 'Jane Boo', age: 20 }
  ],
  timeout: 5000,
  resetDb: function (callback, fillIn = true) {
    let me = this
    async.mapSeries(['schema', 'schemaFull', 'schemaHidden', 'schemaMask', 'schemaBulk'], function (s, callb) {
      client.connect(me.options.url, function (err, c) {
        if (err) throw err
        const db = c.db(me.options.dbName)
        let coll = db.collection(me[s].name)
        coll.removeMany(function (err) {
          if (err) return callb(err)
          if (!fillIn || me[s].name === 'test1') {
            c.close()
            return callb()
          }
          coll.insertMany(me.docs, function (err) {
            if (err) return callb(err)
            c.close()
            callb()
          })
        })
      })
    }, callback)
  }
}
