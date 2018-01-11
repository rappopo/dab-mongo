'use strict'

const Dab = require('@rappopo/dab').Dab

class DabMongo extends Dab {
  constructor (options) {
    super(options)
  }

  setOptions (options) {
    super.setOptions(this._.merge(this.options, {
      url: options.url || 'mongodb://localhost:27017',
      dbName: options.dbName || 'test'
    }))
  }

  setClient () {
    if (!this.client) {
      let client = require('mongodb').MongoClient
      this.client = client.connect(this.options.url, this.options.options)
    }
  }

  getClientDb () {
    if (!this.client)
      this.setClient()
    return new Promise((resolve, reject) => {
      this.client
        .then(client => {
          return client.db(this.options.dbName)
        })
        .then(db => {
          resolve(db)
        })
        .catch(reject)
    })
  }

  createCollection (coll, params) {
    params = params || {}
    return new Promise((resolve, reject) => {
      super.createCollection(coll)
        .then(result => {
          this.setClient()
          return this.getCollection(coll.name)
        })
        .then(result => {
          resolve({ success: true })
        })
        .catch(err => {
          if (err.message !== 'Collection not found')
            return reject(err)
          this.getClientDb()
            .then(db => {
              return db.createCollection(coll.name)
            })
            .then(coll => {
              resolve({ success: true })
            })
            .catch(reject)
        })
    })
  }

  renameCollection (oldName, newName, params) {
    params = params || {}
    return new Promise((resolve, reject) => {
      let oldColl, newColl
      this.setClient()
      super.renameCollection(oldName, newName)
        .then(result => {
          return this.getCollection(oldName)
        })
        .then(result => {
          oldColl = result
          return this.getCollection(newName)
        })
        .then(result => {
          newColl = result
          let rebuild = params.withSchema && !this._.isEmpty(this.collection[newName].attributes)
          if (!rebuild)
            return resolve({ success: true })
          return this.getClientDb()
        })
        .then(db => {
          return db.renameCollection(oldName, newName)
        })
        .then(result => {
          resolve({ success: true })          
        })
        .catch(reject)
    })
  }

  removeCollection (name, params) {
    params = params || {}
    let rebuild = params.withSchema && this.collection[name] && !this._.isEmpty(this.collection[name].attributes)
    return new Promise((resolve, reject) => {
      super.removeCollection(name)
        .then(result => {
          this.setClient()
          return this.getCollection(name)
        })
        .then(result => {
          if (!rebuild)
            return resolve({ success: true })
          return result.dropCollection(name)
        })
        .then(result => {
          resolve({ success: true })
        })
        .catch(reject)
    })
  }

  getCollection (name) {
    return new Promise((resolve, reject) => {
      this.getClientDb()
        .then(db => {
          db.collection(name, { strict: true }, (err, result) => {
            if (err) {
              if (err.message.indexOf('does not exist') > -1)
                err = new Error('Collection not found')
              return reject(err)
            }
            resolve(result)
          })
        })
    })
  }

  find (params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    let limit = params.limit || this.options.limit,
      skip = ((params.page || 1) - 1) * limit,
      query = params.query || {},
      total, coll, sort = params.sort || {}

    return new Promise((resolve, reject) => {
      this.getCollection(params.collection)
      .then(collection => {
        coll = collection
        return coll.find(query).count()
      })
      .then(count => {
        total = count
        return coll.find(query).skip(skip).limit(limit).sort(sort).toArray()
      })
      .then(results => {
        let data = { success: true, data: [], total: total }
        results.forEach((d, i) => {
          data.data.push(this.convert(d, { collection: params.collection }))
        })
        resolve(data)        
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  _findOne (id, params, callback) {
    let conn
    this.getCollection(params.collection)
    .then(coll => {
      conn = coll
      return conn.findOne({ _id: id })
    })
    .then(result => {
      let data = this._.isEmpty(result) ? { success: false, err: new Error('Document not found'), conn: conn } : { success: true, data: result, conn: conn }
      callback(data)
    })
    .catch(err => {
      callback({
        success: false,
        err: err,
        conn: conn
      })
    })
  }

  findOne (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let data = {
          success: true,
          data: this.convert(result.data, { collection: params.collection })
        }
        resolve(data)
      })
    })
  }

  create (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this.getCollection(params.collection)
      .then(coll => {
        return coll.insertOne(body)
      })
      .then(result => {
        this._findOne(result.insertedId, params, resp => {
          if (resp.success)
            resolve({
              success: true,
              data: this.convert(resp.data, { collection: params.collection })
            })
          else
            reject(resp.error)            
        })
      })
      .catch(err => {
        if (err.message.indexOf('duplicate key error collection') > -1)
          err = new Error('Document already exists')
        reject(err)
      })
    })
  }

  update (id, body, params) {
    [params, body] = this.sanitize(params, body)
    body = this._.omit(body, ['_id'])
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let method, newBody,
          source = result.data
        if (params.fullReplace) {
          method = 'replaceOne'
          newBody = body
        } else {
          method = 'updateOne'
          newBody = { $set: body }
        }

        result.conn[method]({ _id: id }, newBody)
        .then(result => {
          this._findOne(id, params, result => {
            if (!result.success)
              return reject(result.err)
            let data = {
              success: true,
              data: this.convert(result.data, { collection: params.collection })
            }
            if (params.withSource)
              data.source = this.convert(source, { collection: params.collection })

            resolve(data)
          })
        })
        .catch(reject)
      })
    })
  }

  remove (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let source = result.data
        result.conn.deleteOne({ _id: id })
        .then(result => {
          let data = { success: true }
          if (params.withSource)
            data.source = this.convert(source, { collection: params.collection })
          resolve(data)
        })
        .catch(reject)
      })
    })
  }

  bulkCreate (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Requires an array'))

      let coll
      this._.each(body, (b, i) => {
        if (!b._id)
          b._id = this.uuid()
        body[i] = b
      })
      const keys = this._(body).map('_id').value()

      this.getCollection(params.collection)
      .then(collection => {
        coll = collection
        coll.find({
          _id: {
            $in: keys
          }
        }, { _id: 1 }).toArray((err, docs) => {
          if (err)
            return reject(err)
          let info = this._.map(docs, '_id'),
            newBody = this._.clone(body)
          this._.pullAllWith(newBody, info, (i,x) => {
            return i._id === x
          })
          if (this._.isEmpty(newBody)) newBody.push({})
          coll.insertMany(newBody, (err, result) => {
            if (err)
              return reject(err)
            let ok = 0, status = []
            this._.each(body, (r, i) => {
              let stat = { success: info.indexOf(r._id) === -1 ? true : false }
              stat._id = r._id
              if (!stat.success)
                stat.message = 'Document already exists'
              else
                ok++
              status.push(stat)
            })
            let data = {
              success: true,
              stat: {
                ok: ok,
                fail: body.length - ok,
                total: body.length
              }
            }
            if (params.withDetail)
              data.detail = status
            resolve(data)
          })    
        })
      })
      .catch(reject)
    })
  }

  bulkUpdate (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Requires an array'))

      let coll
      this._.each(body, (b, i) => {
        if (!b._id)
          b._id = this.uuid()
        body[i] = b
      })
      const keys = this._(body).map('_id').value()

      this.getCollection(params.collection)
      .then(collection => {
        coll = collection
        coll.find({
          _id: {
            $in: keys
          }
        }, { _id: 1 }).toArray((err, docs) => {
          if (err)
            return reject(err)
          let info = this._.map(docs, '_id'),
            newBody = []
          this._.each(body, b => {
            if (info.indexOf(b._id) === -1) return
            newBody.push({
              replaceOne: { 
                filter: { _id: b._id },
                replacement: this._.omit(b, ['_id'])
              }
            })
          })
          if (this._.isEmpty(newBody)) newBody.push({})

          coll.bulkWrite(newBody, { ordered: true }, (err, result) => {
            let ok = 0, status = []
            this._.each(body, (r, i) => {
              let stat = { success: info.indexOf(r._id) > -1 ? true : false }
              stat._id = r._id
              if (!stat.success)
                stat.message = 'Document not found'
              else
                ok++
              status.push(stat)
            })
            let data = {
              success: true,
              stat: {
                ok: ok,
                fail: body.length - ok,
                total: body.length
              }
            }
            if (params.withDetail)
              data.detail = status
            resolve(data)
          })
        })
      })
      .catch(reject)

    })
  }

  bulkRemove (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Requires an array'))
      this._.each(body, (b, i) => {
        body[i] = b || this.uuid()
      })
      let coll
      this.getCollection(params.collection)
      .then(collection => {
        coll = collection
        coll.find({
          _id: {
            $in: body
          }
        }, { _id: 1 }).toArray((err, docs) => {
          if (err)
            return reject(err)
          let info = this._.map(docs, '_id'),
            newBody = []
          this._.each(body, b => {
            if (info.indexOf(b) === -1) return
            newBody.push({
              deleteOne: { 
                filter: { _id: b },
              }
            })
          })
          if (this._.isEmpty(newBody)) newBody.push({})

          coll.bulkWrite(newBody, { ordered: true }, (err, result) => {
            let ok = 0, status = []
            this._.each(body, (r, i) => {
              let stat = { success: info.indexOf(r) > -1 ? true : false }
              stat._id = r
              if (!stat.success)
                stat.message = 'Document not found'
              else
                ok++
              status.push(stat)
            })
            let data = {
              success: true,
              stat: {
                ok: ok,
                fail: body.length - ok,
                total: body.length
              }
            }
            if (params.withDetail)
              data.detail = status
            resolve(data)
          })
        })
      })
      .catch(reject)

    })
  }

}

module.exports = DabMongo