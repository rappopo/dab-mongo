'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

let cls

describe('createCollection', function () {
  afterEach(function (done) {
    if (!cls.client) return done()
    cls.client.then(client => {
      client.close()
      done()
    })
  })

  it('should return error if no collection provided', function () {
    cls = new Cls(lib.options)
    return expect(cls.createCollection({ test: 'blah' })).to.be.rejectedWith('Requires a name')
  })

  it('should return error if collection exists', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection({ name: 'test' })
      .then(result => {
        return cls.createCollection({ name: 'test' })
      })
      .catch(err => {
        expect(err).to.be.a('error').that.have.property('message', 'Collection already exists')
        done()
      })
  })

  it('should return success', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection({ name: 'test' })
      .then(result => {
        expect(result).to.have.property('success', true)
        done()
      })
  })
})
