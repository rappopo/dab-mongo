'use strict'

const Dab = require('@rappopo/dab')

class DabMongo extends Dab {
  constructor (options) {
    super(options)
  }

  setOptions (options) {
    super.setOptions(this._.merge(this.options, {
      idSrc: '_id',
      idDest: options.idDest || options.idSrc || '_id',
      url: options.url || 'mongodb://localhost:27017/test',
      collection: options.collection || 'docs'
    }))
  }

  setClient (params) {
    if (!this.client) {
      let client = require('mongodb').MongoClient
      this.client = client.connect(this.options.url, this.options.options)
    }
  }

  find (params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    let limit = params.limit || this.options.limit,
      skip = ((params.page || 1) - 1) * limit,
      sort = params.sort,
      query = params.query || {},
      total, conn
    return new Promise((resolve, reject) => {
      this.client
      .then(db => {
        conn = db
        return db.collection(this.options.collection).count()
      })
      .then(count => {
        total = count
        return conn.collection(this.options.collection).find(query).skip(skip).limit(limit).toArray()
      })
      .then(results => {
        let data = { success: true, data: [], total: total }
        results.forEach((d, i) => {
          data.data.push(this.convertDoc(d))
        })
        resolve(data)        
      })
      .catch(reject)
    })
  }

  _findOne (id, params, callback) {
    let conn
    this.client
    .then(db => {
      conn = db
      return db.collection(this.options.collection).findOne({ _id: id })
    })
    .then(result => {
      let data = this._.isEmpty(result) ? { success: false, err: new Error('Not found'), conn: conn } : { success: true, data: result, conn: conn }
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
      this._findOne(id, params.options || {}, result => {
        if (!result.success)
          return reject(result.err)
        let data = {
          success: true,
          data: this.convertDoc(result.data)
        }
        resolve(data)
      })
    })
  }

  create (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (body[this.options.idDest] && this.options.idDest !== this.options.idSrc) {
        body[this.options.idSrc] = body[this.options.idDest]
        delete body[this.options.idDest]
      }
      this.client
      .then(db => {
        return db.collection(this.options.collection).insertOne(body)
      })
      .then(result => {
        this._findOne(result.insertedId, params, resp => {
          if (resp.success)
            resolve({
              success: true,
              data: this.convertDoc(resp.data)
            })
          else
            reject(resp.error)            
        })
      })
      .catch(err => {
        if (err.message.indexOf('duplicate key error collection') > -1)
          err = new Error('Exists')
        reject(err)
      })
    })
  }

  update (id, body, params) {
    [params, body] = this.sanitize(params, body)
    body = this._.omit(body, [this.options.idDest || this.options.idSrc])
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

        result.conn.collection(this.options.collection)[method]({ _id: id }, newBody)
        .then(result => {
          this._findOne(id, params, result => {
            if (!result.success)
              return reject(result.err)
            let data = {
              success: true,
              data: this.convertDoc(result.data)
            }
            if (params.withSource)
              data.source = source

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
        this.client
        .then(db => {
          return db.collection(this.options.collection).deleteOne({ _id: id })
        })
        .then(result => {
          let data = { success: true }
          if (params.withSource)
            data.source = this.convertDoc(source)
          resolve(data)
        })
        .catch(reject)
      })
    })
  }

}

module.exports = DabMongo