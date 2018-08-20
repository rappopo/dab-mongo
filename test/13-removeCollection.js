'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(chaiAsPromised)

const Cls = require('../index')
const lib = require('./_lib')

let cls

describe('removeCollection', function () {
  afterEach(function (done) {
    if (!cls || !cls.client) return done()
    cls.client.then(client => {
      client.close()
      done()
    })
  })

  it('should return error if no collection provided', function () {
    const cls = new Cls(lib.options)
    return expect(cls.removeCollection()).to.be.rejectedWith('Requires collection name')
  })

  it('should return error if collection doesn\'t exist', function () {
    cls = new Cls(lib.options)
    return expect(cls.removeCollection('test')).to.be.rejectedWith('Collection not found')
  })

  it('should return success', function (done) {
    cls = new Cls(lib.options)
    cls.createCollection({ name: 'test' })
      .then(result => {
        return cls.removeCollection('test')
      })
      .then(result => {
        expect(result).to.have.property('success', true)
        done()
      })
  })
})
