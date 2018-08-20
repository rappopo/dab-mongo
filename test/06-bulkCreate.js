'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const chaiSubset = require('chai-subset')
const expect = chai.expect

chai.use(chaiSubset)
chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

let cls

describe('bulkCreate', function () {
  beforeEach(function (done) {
    this.timeout(lib.timeout)
    lib.resetDb(function (err) {
      if (err) throw err
      done()
    }, false)
  })

  afterEach(function (done) {
    cls.client.then(client => {
      client.close()
      done()
    })
  })

  it('should return error if collection doesn\'t exist', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.bulkCreate(lib.docs, { collection: 'none' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Collection not found')
        done()
      })
  })

  it('should return error if body isn\'t an array', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.bulkCreate('test', { collection: 'test' })
      })
      .catch(err => {
        expect(err).to.be.a('error').and.have.property('message', 'Requires an array')
        done()
      })
  })

  it('should return the correct bulk status', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection(lib.schema)
      .then(result => {
        return cls.create(lib.docs[0], { collection: 'test' })
      })
      .then(result => {
        return cls.bulkCreate(lib.docs, { collection: 'test', withDetail: true })
      })
      .then(result => {
        expect(result).to.have.property('stat').that.have.property('ok').equal(2)
        expect(result).to.have.property('stat').that.have.property('fail').equal(1)
        expect(result).to.have.property('stat').that.have.property('total').equal(3)
        expect(result).to.have.property('detail').that.containSubset([{ _id: 'jack-bauer', message: 'Document already exists', success: false }])
        expect(result).to.have.property('detail').that.containSubset([{ _id: 'johnny-english', success: true }])
        done()
      })
  })
})
